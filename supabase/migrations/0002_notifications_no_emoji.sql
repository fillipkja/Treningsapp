-- 0002 — fjern emojier (og utropstegn-støy) fra varseltekstene.
-- DB-teksten er kun fallback; klienten lokaliserer visningen selv fra type+actor.
-- Kun tre funksjoner byttes: notify_on_like, notify_friends_on_pr og
-- notify_on_challenge_add. Logikken er identisk med 0001 (actor_id,
-- on conflict do nothing, security definer, set search_path = public) —
-- eneste endring er tekstene. Triggerne beholder bindingen sin ved
-- CREATE OR REPLACE FUNCTION, så de røres ikke.
-- notify_on_comment og notify_on_friendship er allerede emojifrie og røres ikke.

-- Like -> varsel til eieren (fjernet tommel-opp-emoji fra body)
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
      public.display_name_of(new.user_id) || ' likte økten din', new.workout_id::text, new.user_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Delt økt med PR -> varsle venner (tittel var 'Ny rekord!' med trofé-emoji)
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
      'venn_pr', 'Ny rekord',
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

-- Datarydding: normaliser rader som allerede ble skrevet av 0001-funksjonene,
-- slik at databasen ikke blir liggende med emoji/utropstegn i title/body.
-- Målrettet mot de eksakte tekstene fra 0001 — rører ikke annet innhold.
-- Emojiene skrives som unicode-escapes (U+1F44D tommel, U+1F3C6 trofé) for å
-- holde denne filen emoji-fri.
update public.notifications
set body = replace(body, ' ' || E'\U0001F44D', '')
where type = 'like' and body like '%' || E'\U0001F44D' || '%';

update public.notifications
set title = 'Ny rekord'
where type = 'venn_pr' and title = 'Ny rekord! ' || E'\U0001F3C6';

update public.notifications
set title = 'Ny utfordring'
where type = 'utfordring' and title like 'Ny utfordring!%';

-- Lagt til i utfordring -> varsel (tittel var 'Ny utfordring!' med sverd-emoji)
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
    values (new.user_id, 'utfordring', 'Ny utfordring',
      public.display_name_of(ch.creator_id) || ' utfordret deg: «' || ch.name || '»',
      ch.id::text, ch.creator_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
