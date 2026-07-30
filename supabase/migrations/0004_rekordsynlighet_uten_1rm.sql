-- 0004: rekordsynlighet for venner og fjerning av estimert 1RM.
-- Endringer mot 0003:
--   * manual_records får is_shared — brukeren velger per rekord om venner
--     skal kunne se den.
--   * shared_records_for(owner) — RPC som gir venner et trygt utsnitt av
--     delte rekorder (kun øvelse, vekt, reps og dato).
--   * prs mister best_est_1rm, og gamle est1RM-nøkler strippes fra
--     history-jsonb: estimert 1RM er fjernet fra hele modellen — kun faktisk
--     løftede rekorder teller.

-- ============================================================ rekorddeling
-- default true er et bevisst produktvalg («venner ser rekorder, med mindre du
-- skjuler dem») og gjelder også rader fra før kolonnen fantes: innsyn åpnes
-- først av RPC-en under, i samme migrasjon som toggle-en kom inn i appen.
alter table public.manual_records
  add column is_shared boolean not null default true;

-- Venners innsyn i delte rekorder. Security definer omgår RLS (manual_records
-- er ellers kun egne rader), så funksjonen avgrenser selv til delte rader og
-- krever vennskap via are_friends — som igjen krever at kalleren er part.
-- location, bodyweight_kg og notes returneres BEVISST ikke: kroppsvekt er
-- helsedata (samme prinsipp som profile_private i 0001/0003), og sted/notater
-- er personlige og skal aldri deles med venner.
create or replace function public.shared_records_for(owner uuid)
returns table (id uuid, exercise_id text, weight_kg numeric, reps integer, date timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.exercise_id, r.weight_kg, r.reps, r.date
  from public.manual_records r
  where r.user_id = owner
    and r.is_shared
    and public.are_friends(auth.uid(), owner)
  order by r.date desc;
$$;

-- Herding som i 0001: blanket-revoke-en der kjørte én gang og dekker ikke
-- funksjoner opprettet senere — gjenta den for shared_records_for.
revoke execute on function public.shared_records_for(uuid) from public, anon;
grant execute on function public.shared_records_for(uuid) to authenticated;

-- ============================================================ estimert 1RM fjernes
alter table public.prs drop column best_est_1rm;

-- Strip utdaterte est1RM-nøkler fra eksisterende historikk, med bevart
-- rekkefølge. coalesce håndterer tomme arrays: jsonb_agg over null rader gir
-- null, som skal bli '[]' — ikke null (history er not null).
update public.prs
set history = coalesce(
  (
    select jsonb_agg(
             case when jsonb_typeof(elem) = 'object' then elem - 'est1RM' else elem end
             order by ord)
    from jsonb_array_elements(history) with ordinality as t(elem, ord)
  ),
  '[]'::jsonb
)
where history @> '[]'::jsonb;
