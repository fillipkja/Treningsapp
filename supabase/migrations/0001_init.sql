-- LØFT — komplett skjema med row-level security.
-- Prinsipp: alle tabeller har RLS på; egne rader kan alt, venners delte økter kan leses.
-- Varsler opprettes av SECURITY DEFINER-triggere, aldri direkte av klienter.

create extension if not exists pgcrypto;

-- ============================================================ profiler
-- Merk: kroppsdata (høyde/vekt) ligger i public.profile_private, som KUN eier
-- kan lese. Selve profiles-raden er lesbar for alle innloggede fordi den
-- brukes til brukernavnsøk, feed-visning og deltakerlister — den skal derfor
-- bare inneholde felter brukeren selv velger å vise fram.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  avatar_color text not null default '#3987e5',
  avatar_url text,
  goal text check (goal in ('styrke', 'muskelvekst', 'utholdenhet', 'helse')),
  bio text check (char_length(bio) <= 200),
  share_workouts boolean not null default true,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9._]{3,24}$'),
  -- Visningsnavnet vises i varsler hos andre brukere: hold det kort så det
  -- ikke kan brukes til phishing-tekst eller til å ødelegge varsellisten.
  constraint display_name_length check (char_length(display_name) <= 40),
  constraint avatar_color_format check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint avatar_url_https check (avatar_url is null or avatar_url ~ '^https://')
);

create unique index profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Alle innloggede kan lese profiler (nødvendig for brukernavnsøk og feed-visning)
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Helsedata: kun eieren kan lese eller skrive (ingen venne-unntak)
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  height_cm integer check (height_cm between 50 and 280),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 400),
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

create policy "profile_private_own" on public.profile_private
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================ vennskap
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint no_self_friend check (requester_id <> addressee_id)
);

-- Maks én relasjon per par, uansett retning
create unique index friendships_pair_key on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- Hjelpefunksjon brukt i policyer (security definer for å unngå RLS-rekursjon).
-- Kalleren må selv være en av partene: funksjonen er kallbar som RPC, og uten
-- denne sjekken kunne enhver innlogget bruker kartlegge hele den sosiale grafen.
-- Alle policy-kall sender auth.uid() som ett av argumentene, så sjekken er trygg.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() in (a, b) and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

create policy "friendships_select_involved" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships_insert_as_requester" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
-- Kun mottakeren kan akseptere, og kun en forespørsel som fortsatt er pending.
-- WITH CHECK kan ikke sammenligne med OLD, så partene låses i tillegg av
-- trigger-en under og av kolonne-grantene nederst i filen.
create policy "friendships_accept_as_addressee" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
-- Begge parter kan avslå/fjerne
create policy "friendships_delete_involved" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Partene i et vennskap er uforanderlige. Uten dette kunne mottakeren av en
-- pending forespørsel bytte requester_id til en vilkårlig bruker og «akseptere»
-- et vennskap den andre aldri har bedt om.
create or replace function public.friendship_parties_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'kan ikke endre partene i et vennskap';
  end if;
  return new;
end;
$$;
create trigger trg_friendship_parties_immutable before update on public.friendships
  for each row execute function public.friendship_parties_immutable();

-- ============================================================ økter
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Treningsøkt',
  date timestamptz not null default now(),
  started_at timestamptz,
  duration_min integer check (duration_min between 0 and 1440),
  exercises jsonb not null default '[]'::jsonb,
  notes text check (char_length(notes) <= 2000),
  is_shared boolean not null default true,
  program_id uuid,
  template_id uuid,
  -- Aggregatene settes ALLTID av trigger-en under, aldri av klienten
  total_volume_kg numeric(12, 1) not null default 0,
  total_sets integer not null default 0,
  pr_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint workout_name_length check (char_length(name) between 1 and 80),
  -- Feeden i klienten itererer over exercises: må være en array, ikke objekt/streng
  constraint workout_exercises_is_array check (jsonb_typeof(exercises) = 'array'),
  constraint workout_exercises_size check (pg_column_size(exercises) < 100000),
  constraint workout_volume_range check (total_volume_kg between 0 and 10000000),
  constraint workout_sets_range check (total_sets between 0 and 500),
  constraint workout_pr_count_range check (pr_count between 0 and 50)
);

create index workouts_user_date_idx on public.workouts (user_id, date desc);

alter table public.workouts enable row level security;

-- Aggregatene beregnes på serveren ut fra exercises-jsonb. Klienten kan sende
-- hva som helst i total_volume_kg/total_sets/pr_count — verdiene overskrives
-- her, slik at ingen kan toppe rangering/utfordringer med oppdiktede tall.
create or replace function public.workout_aggregates()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ex jsonb;
  st jsonb;
  ex_has_pr boolean;
  reps numeric;
  weight numeric;
  v_volume numeric := 0;
  v_sets integer := 0;
  v_prs integer := 0;
begin
  -- Ugyldig form avvises av check-constraint-en; ikke prøv å iterere over den
  if jsonb_typeof(new.exercises) <> 'array' then
    return new;
  end if;
  for ex in select value from jsonb_array_elements(new.exercises) loop
    if jsonb_typeof(ex) <> 'object' or jsonb_typeof(ex -> 'sets') <> 'array' then
      continue;
    end if;
    ex_has_pr := false;
    for st in select value from jsonb_array_elements(ex -> 'sets') loop
      if jsonb_typeof(st) <> 'object' then
        continue;
      end if;
      -- Oppvarmingssett teller ikke, likt klientlogikken i workout-math.ts
      if jsonb_typeof(st -> 'isWarmup') = 'boolean' and (st ->> 'isWarmup')::boolean then
        continue;
      end if;
      v_sets := v_sets + 1;
      reps := case when jsonb_typeof(st -> 'reps') = 'number'
                then least(greatest((st ->> 'reps')::numeric, 0), 1000) else 0 end;
      weight := case when jsonb_typeof(st -> 'weightKg') = 'number'
                then least(greatest((st ->> 'weightKg')::numeric, 0), 1000) else 0 end;
      v_volume := v_volume + reps * weight;
      if jsonb_typeof(st -> 'isPR') = 'boolean' and (st ->> 'isPR')::boolean then
        ex_has_pr := true;
      end if;
    end loop;
    if ex_has_pr then
      v_prs := v_prs + 1;
    end if;
  end loop;
  new.total_volume_kg := round(least(v_volume, 10000000), 1);
  new.total_sets := least(v_sets, 500);
  new.pr_count := least(v_prs, 50);
  return new;
end;
$$;
create trigger trg_workout_aggregates before insert or update on public.workouts
  for each row execute function public.workout_aggregates();

create or replace function public.can_see_workout(w_user uuid, w_shared boolean)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select w_user = auth.uid() or (w_shared and public.are_friends(auth.uid(), w_user));
$$;

create policy "workouts_select_own_or_friends_shared" on public.workouts
  for select to authenticated
  using (public.can_see_workout(user_id, is_shared));
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================ likes og kommentarer
create table public.workout_likes (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

alter table public.workout_likes enable row level security;

create or replace function public.can_see_workout_id(w_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = w_id and public.can_see_workout(w.user_id, w.is_shared)
  );
$$;

create policy "likes_select_visible" on public.workout_likes
  for select to authenticated using (public.can_see_workout_id(workout_id));
create policy "likes_insert_own_visible" on public.workout_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_workout_id(workout_id));
create policy "likes_delete_own" on public.workout_likes
  for delete to authenticated using (user_id = auth.uid());

create table public.workout_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index workout_comments_workout_idx on public.workout_comments (workout_id, created_at);
create index workout_comments_user_created_idx on public.workout_comments (user_id, created_at desc);

alter table public.workout_comments enable row level security;

create policy "comments_select_visible" on public.workout_comments
  for select to authenticated using (public.can_see_workout_id(workout_id));
create policy "comments_insert_own_visible" on public.workout_comments
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_workout_id(workout_id));
-- Både forfatteren og eieren av økten kan slette (moderering av egen økt)
create policy "comments_delete_own_or_workout_owner" on public.workout_comments
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

-- Enkel rate-limit: hindrer at noen spammer en økt full av kommentarer
create or replace function public.limit_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.workout_comments c
  where c.user_id = new.user_id and c.created_at > now() - interval '1 minute';
  if recent >= 10 then
    raise exception 'for mange kommentarer på kort tid — vent litt';
  end if;
  return new;
end;
$$;
create trigger trg_limit_comment_rate before insert on public.workout_comments
  for each row execute function public.limit_comment_rate();

-- ============================================================ personlige data (kun egne rader)
create table public.prs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id text not null,
  best_weight_kg numeric(6, 1) not null default 0,
  best_est_1rm numeric(6, 1) not null default 0,
  best_reps integer not null default 0,
  best_set_volume_kg numeric(8, 1) not null default 0,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint pr_exercise_id_length check (char_length(exercise_id) between 1 and 80),
  constraint pr_history_is_array check (jsonb_typeof(history) = 'array'),
  constraint pr_history_size check (pg_column_size(history) < 100000)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  days jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  constraint program_name_length check (char_length(name) between 1 and 80),
  constraint program_description_length check (char_length(description) <= 2000),
  constraint program_days_is_array check (jsonb_typeof(days) = 'array'),
  constraint program_days_size check (pg_column_size(days) < 100000)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  constraint template_name_length check (char_length(name) between 1 and 80),
  constraint template_exercises_is_array check (jsonb_typeof(exercises) = 'array'),
  constraint template_exercises_size check (pg_column_size(exercises) < 100000)
);

create table public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint custom_exercise_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint custom_exercise_data_size check (pg_column_size(data) < 20000)
);

create table public.earned_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.prs enable row level security;
alter table public.programs enable row level security;
alter table public.templates enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.earned_badges enable row level security;

create policy "prs_own" on public.prs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "programs_own" on public.programs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "templates_own" on public.templates
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "custom_exercises_own" on public.custom_exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "earned_badges_own" on public.earned_badges
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================ utfordringer
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type text not null check (type in ('økter', 'volum', 'prs', 'program')),
  target numeric(12, 1),
  program_id uuid,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  created_at timestamptz not null default now(),
  constraint challenge_period_forward check (end_date > start_date),
  -- Perioden kan ikke settes langt bakover i tid (høsting av gamle data)
  constraint challenge_period_not_retroactive check (start_date > created_at - interval '7 days')
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create or replace function public.is_challenge_member(c_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.challenge_participants cp
    where cp.challenge_id = c_id and cp.user_id = auth.uid()
  ) or exists (
    select 1 from public.challenges c where c.id = c_id and c.creator_id = auth.uid()
  );
$$;

-- creator_id-sjekken må stå direkte i policyen (ikke bare i funksjonen):
-- ved INSERT ... RETURNING ser ikke funksjonens subquery den nye raden
-- (statement-snapshot), så skaperen ville fått RLS-feil på returnert rad.
create policy "challenges_select_member" on public.challenges
  for select to authenticated
  using (creator_id = auth.uid() or public.is_challenge_member(id));
create policy "challenges_insert_creator" on public.challenges
  for insert to authenticated with check (creator_id = auth.uid());
create policy "challenges_delete_creator" on public.challenges
  for delete to authenticated using (creator_id = auth.uid());

create policy "participants_select_member" on public.challenge_participants
  for select to authenticated using (public.is_challenge_member(challenge_id));
-- Skaperen legger til deltakere (kun egne venner), og alle kan melde seg selv inn/ut
create policy "participants_insert" on public.challenge_participants
  for insert to authenticated
  with check (
    (user_id = auth.uid() and public.is_challenge_member(challenge_id))
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_id
        and c.creator_id = auth.uid()
        and (user_id = auth.uid() or public.are_friends(auth.uid(), user_id))
    )
  );
create policy "participants_delete" on public.challenge_participants
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );

-- Stillingen i en utfordring: aggregater per deltaker (security definer med medlemssjekk)
create or replace function public.challenge_standings(c_id uuid)
returns table (user_id uuid, workout_count bigint, volume_kg numeric, pr_count bigint, program_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  ch public.challenges%rowtype;
begin
  if not public.is_challenge_member(c_id) then
    raise exception 'ikke deltaker i utfordringen';
  end if;
  select * into ch from public.challenges where id = c_id;
  return query
    select
      cp.user_id,
      count(w.id)::bigint,
      coalesce(sum(w.total_volume_kg), 0)::numeric,
      coalesce(sum(w.pr_count), 0)::bigint,
      count(w.id) filter (where w.program_id = ch.program_id)::bigint
    from public.challenge_participants cp
    left join public.workouts w
      on w.user_id = cp.user_id
        -- Funksjonen er security definer og omgår RLS: udelte økter skal derfor
        -- kun telle for kalleren selv, aldri for de andre deltakerne.
        and (w.is_shared or cp.user_id = auth.uid())
        and w.date >= ch.start_date and w.date <= ch.end_date
    where cp.challenge_id = c_id
    group by cp.user_id;
end;
$$;

-- ============================================================ rangering blant venner
create or replace function public.friend_leaderboard(period_start timestamptz, period_end timestamptz)
returns table (user_id uuid, workout_count bigint, volume_kg numeric, pr_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  with members as (
    select auth.uid() as uid
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted' and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  )
  select
    m.uid,
    count(w.id)::bigint,
    coalesce(sum(w.total_volume_kg), 0)::numeric,
    coalesce(sum(w.pr_count), 0)::bigint
  from members m
  left join public.workouts w
    on w.user_id = m.uid
      -- Security definer omgår RLS: kun delte økter teller for venner
      and (w.is_shared or m.uid = auth.uid())
      and w.date >= period_start and w.date <= period_end
  group by m.uid;
$$;

-- ============================================================ varsler (kun via triggere)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('venn_pr', 'venn_økt', 'like', 'kommentar', 'venneforespørsel', 'venn_akseptert', 'utfordring', 'badge')),
  title text not null,
  body text not null,
  ref_id text,
  -- Hvem som utløste varselet — brukes til å hindre duplikater
  actor_id uuid references public.profiles (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Maks ETT ulest varsel per (mottaker, type, referanse, avsender). Sammen med
-- «on conflict do nothing» i triggerne stopper dette spam-løkker som
-- forespørsel→slett→forespørsel, like→unlike→like og deltaker→fjern→legg til.
-- Når mottakeren har lest varselet kan et nytt lages, så ekte hendelser mistes ikke.
create unique index notifications_unread_dedup_key on public.notifications (
  user_id, type, ref_id, actor_id
) where not read;

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
-- Ingen insert-policy: klienter kan ikke opprette varsler. Triggere (security definer) gjør det.

create or replace function public.display_name_of(p_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(nullif(display_name, ''), username) from public.profiles where id = p_id;
$$;

-- Like -> varsel til eieren
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = new.workout_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    values (owner, 'like', 'Ny like',
      public.display_name_of(new.user_id) || ' likte økten din 👍', new.workout_id::text, new.user_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_notify_on_like after insert on public.workout_likes
  for each row execute function public.notify_on_like();

-- Kommentar -> varsel til eieren
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = new.workout_id;
  if owner is not null and owner <> new.user_id then
    -- Kommentarvarsler dedupliseres IKKE (hver kommentar er en ny hendelse);
    -- spam bremses av rate-limit-trigger-en på workout_comments.
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    values (owner, 'kommentar', 'Ny kommentar',
      public.display_name_of(new.user_id) || ': «' || left(new.text, 80) || '»',
      new.workout_id::text, new.user_id);
  end if;
  return new;
end;
$$;
create trigger trg_notify_on_comment after insert on public.workout_comments
  for each row execute function public.notify_on_comment();

-- Venneforespørsel + aksept
create or replace function public.notify_on_friendship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    values (new.addressee_id, 'venneforespørsel', 'Venneforespørsel',
      public.display_name_of(new.requester_id) || ' vil bli venner',
      new.requester_id::text, new.requester_id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    values (new.requester_id, 'venn_akseptert', 'Ny venn',
      'Du og ' || public.display_name_of(new.addressee_id) || ' er nå venner',
      new.addressee_id::text, new.addressee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_notify_on_friendship after insert or update on public.friendships
  for each row execute function public.notify_on_friendship();

-- Delt økt med PR -> varsle venner
create or replace function public.notify_friends_on_pr()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_shared and new.pr_count > 0 then
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    select
      case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end,
      'venn_pr', 'Ny rekord! 🏆',
      public.display_name_of(new.user_id) || ' satte ' ||
        case when new.pr_count > 1 then new.pr_count || ' nye rekorder' else 'ny personlig rekord' end,
      new.id::text, new.user_id
    from public.friendships f
    where f.status = 'accepted' and (f.requester_id = new.user_id or f.addressee_id = new.user_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_notify_friends_on_pr after insert on public.workouts
  for each row execute function public.notify_friends_on_pr();

-- Lagt til i utfordring -> varsel
create or replace function public.notify_on_challenge_add()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ch public.challenges%rowtype;
begin
  select * into ch from public.challenges where id = new.challenge_id;
  if ch.creator_id is not null and new.user_id <> ch.creator_id then
    insert into public.notifications (user_id, type, title, body, ref_id, actor_id)
    values (new.user_id, 'utfordring', 'Ny utfordring! ⚔️',
      public.display_name_of(ch.creator_id) || ' utfordret deg: «' || ch.name || '»',
      ch.id::text, ch.creator_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger trg_notify_on_challenge_add after insert on public.challenge_participants
  for each row execute function public.notify_on_challenge_add();

-- ============================================================ brukernavnsøk (case-insensitivt, eksakt)
create or replace function public.find_profile_by_username(q text)
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where lower(username) = lower(trim(q)) limit 1;
$$;

-- ============================================================ herding
-- Vennskapets parter skal være uforanderlige også på privilegienivå: kun
-- status-kolonnen kan oppdateres av klienter (jf. friendships_accept_as_addressee).
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

-- Security definer-funksjoner skal kun kunne kalles av innloggede brukere, og
-- kun de som faktisk er ment som RPC/policy-hjelpere (trigger-funksjoner
-- trenger ingen execute-grant — privilegiet sjekkes når trigger-en opprettes).
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.can_see_workout(uuid, boolean) to authenticated;
grant execute on function public.can_see_workout_id(uuid) to authenticated;
grant execute on function public.is_challenge_member(uuid) to authenticated;
grant execute on function public.challenge_standings(uuid) to authenticated;
grant execute on function public.friend_leaderboard(timestamptz, timestamptz) to authenticated;
grant execute on function public.display_name_of(uuid) to authenticated;
grant execute on function public.find_profile_by_username(text) to authenticated;
