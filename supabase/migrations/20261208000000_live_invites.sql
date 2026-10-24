-- =====================================================================
-- LIVE: atis k ap fè live la ka ENVITE yon lòt atis monte sou sèn nan
-- (atis ki an live kounye a sou sit la, oswa ki ap gade live li). Envite a aksepte oswa refize.
-- =====================================================================

alter table public.live_guests drop constraint live_guests_status_check;
alter table public.live_guests add constraint live_guests_status_check
  check (status in ('requested', 'invited', 'accepted', 'rejected', 'left', 'removed'));

drop index public.live_guests_open_idx;
create unique index live_guests_open_idx on public.live_guests (live_id, user_id) where status in ('requested', 'invited', 'accepted');

-- Atis la envite yon lòt atis
create function public.invite_to_live(p_live uuid, p_artist uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_host text;
  v_name text;
begin
  select p.display_name into v_host
  from public.lives l join public.profiles p on p.id = l.artist_id
  where l.id = p_live and l.artist_id = v_uid and l.status = 'live';
  if not found then
    raise exception 'Se atis k ap fè live la sèlman ki ka envite';
  end if;
  if p_artist = v_uid then
    raise exception 'Ou pa ka envite tèt ou';
  end if;
  select display_name into v_name from public.profiles
  where id = p_artist and role = 'artist' and status = 'approved' and archived_at is null;
  if not found then
    raise exception 'Se atis yo sèlman ki ka monte sou sèn nan';
  end if;
  if exists (select 1 from public.live_guests where live_id = p_live and user_id = p_artist and status in ('requested', 'invited', 'accepted')) then
    raise exception '% gen yon demann oswa yon envitasyon deja', v_name;
  end if;
  if (select count(*) from public.live_guests where live_id = p_live and status = 'invited' and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Tann yon ti moman anvan w envite plis moun';
  end if;

  insert into public.live_guests (live_id, user_id, guest_name, status) values (p_live, p_artist, v_name, 'invited');
  perform public.notify(p_artist, 'live', '🎤 ' || coalesce(v_host, 'Yon atis') || ' envite w monte nan live li!',
    'Antre nan live la pou w aksepte envitasyon an.', '/live/' || p_live::text);
end;
$$;

revoke execute on function public.invite_to_live(uuid, uuid) from public, anon;
grant execute on function public.invite_to_live(uuid, uuid) to authenticated;

-- Envite a reponn (menm règ kapasite ak demann yo)
create function public.respond_live_invite(p_guest uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  g public.live_guests;
  v_cap integer;
  v_on  integer;
begin
  select * into g from public.live_guests where id = p_guest and user_id = auth.uid() and status = 'invited' for update;
  if not found then
    raise exception 'Envitasyon sa a pa egziste ankò';
  end if;
  if not exists (select 1 from public.lives where id = g.live_id and status = 'live') then
    raise exception 'Live sa a fini';
  end if;
  if not p_accept then
    update public.live_guests set status = 'rejected', decided_at = now() where id = p_guest;
    return;
  end if;
  v_cap := public.live_capacity(g.live_id);
  select count(*) into v_on from public.live_guests where live_id = g.live_id and status = 'accepted';
  if v_on >= v_cap then
    if v_cap = 1 then
      update public.live_guests set status = 'left', decided_at = now() where live_id = g.live_id and status = 'accepted';
    else
      raise exception 'Sèn nan plen (% moun). Tann yon plas.', v_cap;
    end if;
  end if;
  update public.live_guests set status = 'accepted', decided_at = now() where id = p_guest;
end;
$$;

revoke execute on function public.respond_live_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_live_invite(uuid, boolean) to authenticated;

-- Demann monte: pa si moun nan deja envite
create or replace function public.request_join_live(p_live uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'Konekte pou w mande monte';
  end if;
  select display_name into v_name from public.profiles
  where id = v_uid and role = 'artist' and status = 'approved' and archived_at is null;
  if not found then
    raise exception 'Se atis yo sèlman ki ka mande monte nan yon live';
  end if;
  if not exists (select 1 from public.lives where id = p_live and status = 'live' and artist_id <> v_uid) then
    raise exception 'Ou pa ka monte nan live sa a';
  end if;
  if exists (select 1 from public.live_guests where live_id = p_live and user_id = v_uid and status in ('requested', 'invited', 'accepted')) then
    raise exception 'Ou gen yon demann oswa yon envitasyon k ap tann deja';
  end if;
  if (select count(*) from public.live_guests where live_id = p_live and user_id = v_uid and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Tann yon ti moman anvan w mande ankò';
  end if;
  insert into public.live_guests (live_id, user_id, guest_name) values (p_live, v_uid, coalesce(v_name, 'Atis'));
end;
$$;

-- Fen live la: envitasyon yo fèmen tou
create or replace function public.end_live(p_live uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.lives set status = 'ended', ended_at = now()
  where id = p_live and status = 'live' and (artist_id = auth.uid() or public.is_admin());
  update public.live_guests set status = 'left', decided_at = now()
  where live_id = p_live and status in ('requested', 'invited', 'accepted');
end;
$$;

-- Atis la ka anile yon envitasyon (oswa retire yon envite), envite a ka desann
create or replace function public.leave_live_stage(p_guest uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.live_guests g
  set status = case when g.user_id = auth.uid() then 'left' else 'removed' end, decided_at = now()
  where g.id = p_guest and g.status in ('requested', 'invited', 'accepted')
    and (g.user_id = auth.uid() or exists (select 1 from public.lives l where l.id = g.live_id and l.artist_id = auth.uid()));
$$;
