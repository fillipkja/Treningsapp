-- 0003: avatar-ikon, kjønn, manuelle rekorder og lagringsbøtte for profilbilder.
-- Endringer mot 0001:
--   * profiles får avatar_icon — et Ionicons-navn som identitetsalternativ til
--     initialer når brukeren ikke har lastet opp bilde.
--   * profile_private får gender — kjønn er helsedata og skal, som høyde/vekt,
--     KUN være lesbart for eieren (profiles er lesbar for alle innloggede).
--   * manual_records — rekorder brukeren registrerer selv (også fra før appen),
--     med valgfritt sted og kroppsvekt da rekorden ble satt. Kun egne rader.
--   * storage-bøtta «avatars» med policyer: hver bruker skriver kun i sin egen
--     mappe (<user_id>/...), lesing er offentlig (avatar_url deles med venner).

-- ============================================================ avatar-ikon
alter table public.profiles
  add column avatar_icon text
  check (avatar_icon is null or avatar_icon ~ '^[a-z0-9-]{1,40}$');

-- ============================================================ kjønn (privat)
alter table public.profile_private
  add column gender text
  check (gender in ('mann', 'kvinne', 'annet'));

-- ============================================================ manuelle rekorder
create table public.manual_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 80),
  weight_kg numeric(6, 1) not null check (weight_kg > 0 and weight_kg <= 1000),
  reps integer not null default 1 check (reps between 1 and 100),
  date timestamptz not null default now(),
  location text check (char_length(location) <= 80),
  bodyweight_kg numeric(5, 1) check (bodyweight_kg between 20 and 400),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index manual_records_user_date_idx on public.manual_records (user_id, date desc);

alter table public.manual_records enable row level security;

create policy "manual_records_own" on public.manual_records
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================ profilbilder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Selve bildene serveres via offentlige URL-er som omgår RLS (bøtta er public).
-- SELECT-policyen trengs kun for list()-kallet som rydder egen mappe — og
-- begrenses dit, ellers kunne hvem som helst med anon-nøkkelen listet alle
-- mappenavn (= bruker-id-er) via storage-API-et.
create policy "avatars_list_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Skriving kun i egen mappe: objektnavnet må starte med egen bruker-id
create policy "avatars_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
