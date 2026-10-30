-- =====================================================================
-- EKOUT VIZITÈ YO KONTE (moun ki pa konekte)
--  - Chak navigatè gen yon ID vizitè (UUID sere sou aparèy la, localStorage).
--  - Menm règ ak moun ki konekte: 1 ekout konte pa vizitè pa chante
--    (li koute menm chante a 20 fwa → 1 ekout).
--  - Pwoteksyon kont moun k ap efase ID a pou fè chif monte:
--      * maks 3 ekout vizitè konte pou menm chante a, pa adrès IP, chak 24 è
--        (yon fanmi sou menm wifi a ka toujou konte)
--      * maks 60 ekout vizitè konte pa adrès IP chak èdtan (tout chante)
--    Adrès IP a pa sere: se yon "anprent" (hash) ki sere, pou kalkile limit yo sèlman.
--  - Moun ki konekte yo pa chanje: 1 ekout pa kont pa chante.
-- =====================================================================

alter table public.song_plays
  add column if not exists visitor_id uuid,
  add column if not exists ip_hash    text;

-- Garanti: yon sèl ekout konte pa vizitè pa chante
create unique index if not exists song_plays_one_counted_visitor
  on public.song_plays (visitor_id, song_id) where counted and visitor_id is not null;
create index if not exists song_plays_ip_idx on public.song_plays (ip_hash, started_at) where ip_hash is not null;

-- Anprent adrès IP moun k ap rele a (pa janm adrès la li menm)
create or replace function public.request_ip_hash()
returns text
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_headers json;
  v_ip      text;
begin
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  v_ip := coalesce(nullif(v_headers ->> 'cf-connecting-ip', ''), split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1));
  v_ip := nullif(trim(v_ip), '');
  if v_ip is null then
    return null;
  end if;
  return md5('upmizik-plays:' || v_ip);
end;
$$;
revoke execute on function public.request_ip_hash() from public, anon, authenticated;

-- Kòmansman yon ekout: + ID vizitè a (si moun nan pa konekte)
drop function if exists public.start_play(uuid);
create function public.start_play(p_song_id uuid, p_visitor uuid default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id  uuid;
  v_uid uuid := auth.uid();
begin
  insert into public.song_plays (song_id, artist_id, user_id, visitor_id, ip_hash)
  select s.id, s.artist_id, v_uid,
         case when v_uid is null then p_visitor end,
         case when v_uid is null then public.request_ip_hash() end
  from public.songs s
  where s.id = p_song_id
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.start_play(uuid, uuid) to anon, authenticated;

-- Konfimasyon (apre 5 segonn): kont konekte OSWA vizitè, yon sèl fwa pa chante
create or replace function public.confirm_play(p_play_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song    uuid;
  v_user    uuid;
  v_visitor uuid;
  v_ip      text;
begin
  -- 1. Ekout la vin "reyèl" (omwen 4-5 segonn)
  update public.song_plays
  set is_real = true
  where id = p_play_id
    and not is_real
    and started_at <= now() - interval '4 seconds'
    and started_at > now() - interval '6 hours'
  returning song_id, user_id, visitor_id, ip_hash into v_song, v_user, v_visitor, v_ip;

  if v_song is null then
    return;
  end if;

  -- 2a. Moun ki konekte: premye fwa kont sa a koute chante sa a → +1
  if v_user is not null then
    begin
      update public.song_plays
      set counted = true
      where id = p_play_id
        and not exists (select 1 from public.song_plays where user_id = v_user and song_id = v_song and counted);
      if found then
        update public.songs set play_count = play_count + 1 where id = v_song;
      end if;
    exception when unique_violation then
      null;
    end;
    return;
  end if;

  -- 2b. Vizitè: premye fwa ID sa a koute chante sa a, epi limit adrès IP la pa depase → +1
  if v_visitor is null then
    return;
  end if;
  if v_ip is not null and (
       (select count(*) from public.song_plays
        where ip_hash = v_ip and song_id = v_song and counted and visitor_id is not null
          and started_at > now() - interval '24 hours') >= 3
    or (select count(*) from public.song_plays
        where ip_hash = v_ip and counted and visitor_id is not null
          and started_at > now() - interval '1 hour') >= 60
  ) then
    return;
  end if;
  begin
    update public.song_plays
    set counted = true
    where id = p_play_id
      and not exists (select 1 from public.song_plays where visitor_id = v_visitor and song_id = v_song and counted);
    if found then
      update public.songs set play_count = play_count + 1 where id = v_song;
    end if;
  exception when unique_violation then
    null;  -- 2 konfimasyon an menm tan: sèlman youn konte
  end;
end;
$$;

grant execute on function public.confirm_play(uuid) to anon, authenticated;

-- Estatistik: "moun ki koute" konte vizitè yo tou
create or replace function public.play_stats_daily(p_days integer, p_artist_id uuid default null)
returns table (day date, starts bigint, real_plays bigint, listeners bigint)
language sql
stable
security definer set search_path = ''
as $$
  with bounds as (
    select least(greatest(p_days, 1), 366) as n,
           (now() at time zone 'America/Port-au-Prince')::date as today
  ), days as (
    select generate_series(b.today - (b.n - 1), b.today, interval '1 day')::date as d
    from bounds b
  ), plays as (
    select (p.started_at at time zone 'America/Port-au-Prince')::date as d, p.counted, coalesce(p.user_id, p.visitor_id) as who
    from public.song_plays p, bounds b
    where p.started_at > now() - make_interval(days => b.n + 1)
      and (p_artist_id is null or p.artist_id = p_artist_id)
  )
  select days.d,
         count(plays.d),
         count(plays.d) filter (where plays.counted),
         count(distinct plays.who)
  from days
  left join plays on plays.d = days.d
  where public.can_see_stats(p_artist_id)
  group by days.d
  order by days.d;
$$;
