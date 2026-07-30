-- 0006: valgfri dato og sett-antall på rekorder.
-- Endringer mot 0005:
--   * manual_records og run_records: date kan være null — datoen er uvesentlig
--     kontekst brukeren ikke alltid kjenner (f.eks. rekorder fra før appen).
--     Default now() fjernes: en utelatt dato betyr «ukjent», ikke «i dag».
--   * manual_records får sets — 5x5 og andre flersett-opplegg kan registreres
--     som egne rekorder. Eksisterende rader er enkeltløft (sets = 1).
--   * shared_records_for returnerer sets (returtypen endres — drop + create).
--   * strength_leaderboard: manuelle rekorder teller mot sett-kravet
--     (r.sets >= min_sets), ikke lenger kun på enkeltsett-tavler.
--   * Dato-sorteringer og -tiebreaks får nulls last: udaterte rekorder taper
--     tiebreak ved lik vekt/tid og havner sist i delte lister.

-- ============================================================ valgfri dato
alter table public.manual_records
  alter column date drop not null,
  alter column date drop default;

alter table public.run_records
  alter column date drop not null,
  alter column date drop default;

-- ============================================================ sett-antall
alter table public.manual_records
  add column sets integer not null default 1 check (sets between 1 and 20);

-- ============================================================ rekorddeling med sett
-- Returtypen endres (sets legges til) — create or replace kan ikke endre
-- kolonnesettet, så funksjonen droppes og gjenskapes. location, bodyweight_kg
-- og notes utelates fortsatt bevisst (se 0004). Grants overlever ikke droppen
-- og gjentas under.
drop function public.shared_records_for(uuid);

create function public.shared_records_for(owner uuid)
returns table (id uuid, exercise_id text, weight_kg numeric, reps integer, sets integer, date timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.exercise_id, r.weight_kg, r.reps, r.sets, r.date
  from public.manual_records r
  where r.user_id = owner
    and r.is_shared
    and public.are_friends(auth.uid(), owner)
  order by r.date desc nulls last;
$$;

revoke execute on function public.shared_records_for(uuid) from public, anon;
grant execute on function public.shared_records_for(uuid) to authenticated;

-- ============================================================ delte løp: udaterte sist
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
  order by r.date desc nulls last;
$$;

-- ============================================================ styrke-ledertavle med sett
-- Som i 0005, med to endringer: manuelle rekorder teller når rekordens eget
-- sett-antall dekker tavlens krav, og udaterte rekorder taper dato-tiebreaken.
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
    where r.sets >= min_sets
      and r.exercise_id = ex_id
      and r.reps >= min_reps
      and (r.is_shared or r.user_id = auth.uid())
  ),
  hits as (
    select * from workout_hits
    union all
    select * from manual_hits
  )
  -- Beste vekt per bruker; ved lik vekt vinner den tidligste datoen, og en
  -- udatert manuell rekord taper mot en datert
  select distinct on (h.uid) h.uid, h.weight, h.achieved
  from hits h
  order by h.uid, h.weight desc, h.achieved asc nulls last;
$$;

-- ============================================================ løpe-ledertavle: udaterte sist
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
  -- Beste tid per bruker; ved lik tid vinner den tidligste datoen, udatert sist.
  select distinct on (r.user_id) r.user_id, r.duration_sec, r.date
  from public.run_records r
  join members m on m.uid = r.user_id
  where r.distance_m = dist_m
    and (r.is_shared or r.user_id = auth.uid())
  order by r.user_id, r.duration_sec asc, r.date asc nulls last;
$$;
