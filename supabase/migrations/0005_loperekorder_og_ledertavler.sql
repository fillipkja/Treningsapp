-- 0005: løperekorder og ledertavler blant venner.
-- Endringer mot 0004:
--   * run_records — løp brukeren registrerer selv (distanse + tid), med
--     valgfritt sted og notater. Kun egne rader; deles per rad, som manual_records.
--   * shared_runs_for(owner) — RPC som gir venner et trygt utsnitt av delte løp.
--   * strength_leaderboard(ex_id, min_reps, min_sets) — tyngste løft per venn
--     for en øvelse og et sett-opplegg (1RM / 5 reps / 5x5), hentet fra både
--     økter og manuelle rekorder. Kun delte data teller for andre.
--   * running_leaderboard(dist_m) — beste tid per venn på en distanse.
--   * prs.best_reps regnes om fra historikken: betyr nå «reps på beste vekt».

-- ============================================================ løperekorder
create table public.run_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  distance_m integer not null check (distance_m between 100 and 1000000),
  duration_sec integer not null check (duration_sec between 10 and 360000),
  date timestamptz not null default now(),
  location text check (char_length(location) <= 80),
  notes text check (char_length(notes) <= 500),
  is_shared boolean not null default true,
  created_at timestamptz not null default now()
);

create index run_records_user_date_idx on public.run_records (user_id, date desc);

alter table public.run_records enable row level security;

create policy "run_records_own" on public.run_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Venners innsyn i delte løp, som shared_records_for i 0004. Security definer
-- omgår RLS (run_records er ellers kun egne rader), så funksjonen avgrenser
-- selv til delte rader og krever vennskap via are_friends — som igjen krever
-- at kalleren er part. location og notes returneres BEVISST ikke: sted og
-- notater er personlige og skal aldri deles med venner.
create or replace function public.shared_runs_for(owner uuid)
returns table (id uuid, distance_m integer, duration_sec integer, date timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.distance_m, r.duration_sec, r.date
  from public.run_records r
  where r.user_id = owner
    and r.is_shared
    and public.are_friends(auth.uid(), owner)
  order by r.date desc;
$$;

-- ============================================================ styrke-ledertavle
-- Tyngste løft per venn for én øvelse og ett sett-opplegg. Kandidater hentes
-- fra to kilder: arbeidssett i økter (min_sets sett på SAMME vekt i SAMME økt,
-- alle med minst min_reps reps) og manuelle rekorder (enkeltsett — teller kun
-- når opplegget krever ett sett). Security definer omgår RLS: udelte økter og
-- rekorder teller derfor kun for kalleren selv, aldri for vennene.
-- Jsonb-verdiene er klientskrevne: typeof-vakter og klemming til (0, 1000]
-- som i workout_aggregates, så en rad med søppeldata ikke velter tavlen.
create or replace function public.strength_leaderboard(ex_id text, min_reps integer, min_sets integer)
returns table (user_id uuid, best_weight_kg numeric, achieved_at timestamptz)
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
  ),
  -- Fullførte arbeidssett i riktig øvelse (manglende completed regnes som
  -- fullført, manglende isWarmup som arbeidssett — likt klientlogikken)
  workout_sets as (
    select w.id as workout_id, w.user_id as uid, w.date as achieved,
           (st.value ->> 'weightKg')::numeric as weight
    from public.workouts w
    join members m on m.uid = w.user_id
    cross join lateral jsonb_array_elements(w.exercises) as ex(value)
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(ex.value -> 'sets') = 'array' then ex.value -> 'sets' else '[]'::jsonb end
    ) as st(value)
    where (w.is_shared or w.user_id = auth.uid())
      and jsonb_typeof(ex.value) = 'object'
      and ex.value ->> 'exerciseId' = ex_id
      and jsonb_typeof(st.value) = 'object'
      and not coalesce(case when jsonb_typeof(st.value -> 'isWarmup') = 'boolean'
                            then (st.value ->> 'isWarmup')::boolean end, false)
      and coalesce(case when jsonb_typeof(st.value -> 'completed') = 'boolean'
                        then (st.value ->> 'completed')::boolean end, true)
      and jsonb_typeof(st.value -> 'reps') = 'number'
      and jsonb_typeof(st.value -> 'weightKg') = 'number'
      and (st.value ->> 'reps')::numeric >= min_reps
      and (st.value ->> 'reps')::numeric <= 1000
      and (st.value ->> 'weightKg')::numeric > 0
      and (st.value ->> 'weightKg')::numeric <= 1000
  ),
  workout_hits as (
    select ws.uid, ws.weight, min(ws.achieved) as achieved
    from workout_sets ws
    group by ws.workout_id, ws.uid, ws.weight
    having count(*) >= min_sets
  ),
  manual_hits as (
    select r.user_id as uid, r.weight_kg as weight, r.date as achieved
    from public.manual_records r
    join members m on m.uid = r.user_id
    where min_sets = 1
      and r.exercise_id = ex_id
      and r.reps >= min_reps
      and (r.is_shared or r.user_id = auth.uid())
  ),
  hits as (
    select * from workout_hits
    union all
    select * from manual_hits
  )
  -- Beste vekt per bruker; ved lik vekt vinner den tidligste datoen
  select distinct on (h.uid) h.uid, h.weight, h.achieved
  from hits h
  order by h.uid, h.weight desc, h.achieved asc;
$$;

-- ============================================================ løpe-ledertavle
create or replace function public.running_leaderboard(dist_m integer)
returns table (user_id uuid, best_sec integer, achieved_at timestamptz)
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
  -- Security definer omgår RLS: skjulte løp teller kun for kalleren selv.
  -- Beste tid per bruker; ved lik tid vinner den tidligste datoen.
  select distinct on (r.user_id) r.user_id, r.duration_sec, r.date
  from public.run_records r
  join members m on m.uid = r.user_id
  where r.distance_m = dist_m
    and (r.is_shared or r.user_id = auth.uid())
  order by r.user_id, r.duration_sec asc, r.date asc;
$$;

-- ============================================================ herding
-- Som i 0004: blanket-revoke-en fra 0001 kjørte én gang og dekker ikke
-- funksjoner opprettet senere — gjenta den for de nye RPC-ene.
revoke execute on function public.shared_runs_for(uuid) from public, anon;
grant execute on function public.shared_runs_for(uuid) to authenticated;
revoke execute on function public.strength_leaderboard(text, integer, integer) from public, anon;
grant execute on function public.strength_leaderboard(text, integer, integer) to authenticated;
revoke execute on function public.running_leaderboard(integer) from public, anon;
grant execute on function public.running_leaderboard(integer) to authenticated;

-- ============================================================ best_reps regnes om
-- Klienten har endret PR-semantikk: best_reps betyr nå «reps på den beste
-- vekten», ikke rep-maks på tvers av alle vekter. Gamle rader kan derfor ha
-- et forurenset best_reps — regn det ut på nytt fra historikken. Rader uten
-- historikkpunkt på beste vekt beholder verdien sin (coalesce).
update public.prs
set best_reps = coalesce(
  (
    select max(floor((elem ->> 'reps')::numeric))::int
    from jsonb_array_elements(history) as elem
    where jsonb_typeof(elem) = 'object'
      and jsonb_typeof(elem -> 'reps') = 'number'
      and jsonb_typeof(elem -> 'weightKg') = 'number'
      and (elem ->> 'reps')::numeric between 0 and 1000
      and (elem ->> 'weightKg')::numeric = best_weight_kg
  ),
  best_reps
);
