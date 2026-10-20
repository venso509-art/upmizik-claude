-- =====================================================================
-- UpMizik: anrejistre chak ekout + rapò ak estatistik
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CHAK EKOUT
--    "start"  = moun nan peze ▶
--    "is_real" = li koute omwen 5 segonn san rete (se sa ki konte nan play_count)
-- ---------------------------------------------------------------------
create table public.song_plays (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,  -- null = moun ki pa konekte
  is_real    boolean not null default false,
  started_at timestamptz not null default now()
);

create index song_plays_started_idx on public.song_plays (started_at);
create index song_plays_artist_idx on public.song_plays (artist_id, started_at);
create index song_plays_song_idx on public.song_plays (song_id, started_at);

-- RLS aktive SAN règ: pèsonn pa ka li oswa ekri dirèkteman, sèlman atravè fonksyon yo anba a
alter table public.song_plays enable row level security;

-- ---------------------------------------------------------------------
-- 2. ANREJISTRE YON EKOUT
-- ---------------------------------------------------------------------
-- Moun nan peze ▶: nou kreye yon liy epi nou retounen ID li
create function public.start_play(p_song_id uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.song_plays (song_id, artist_id, user_id)
  select s.id, s.artist_id, auth.uid() from public.songs s where s.id = p_song_id
  returning id into v_id;
  return v_id;
end;
$$;

-- Apre 5 segonn: ekout la vin "reyèl" epi play_count monte.
-- Garanti: omwen 4 segonn dwe pase depi start_play, e yon ekout ka konfime YON SÈL fwa.
create function public.confirm_play(p_play_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song uuid;
begin
  update public.song_plays
  set is_real = true
  where id = p_play_id
    and not is_real
    and started_at <= now() - interval '4 seconds'
    and started_at > now() - interval '6 hours'
  returning song_id into v_song;

  if v_song is not null then
    update public.songs set play_count = play_count + 1 where id = v_song;
  end if;
end;
$$;

grant execute on function public.start_play(uuid) to anon, authenticated;
grant execute on function public.confirm_play(uuid) to anon, authenticated;

-- Ansyen fonksyon an te kite nenpòt moun ogmante kontè a san limit: nou dezaktive l
revoke execute on function public.increment_play_count(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. ESTATISTIK (dapre lè Ayiti)
--    p_artist_id = null → tout platfòm nan (admin sèlman)
--    p_artist_id = yon atis → atis la li menm oswa yon admin
-- ---------------------------------------------------------------------
create function public.can_see_stats(p_artist_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select case
    when p_artist_id is null then public.is_admin()
    else p_artist_id = auth.uid() or public.is_admin()
  end;
$$;

-- 3a. Ekout chak jou
create function public.play_stats_daily(p_days integer, p_artist_id uuid default null)
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
    select (p.started_at at time zone 'America/Port-au-Prince')::date as d, p.is_real, p.user_id
    from public.song_plays p, bounds b
    where p.started_at > now() - make_interval(days => b.n + 1)
      and (p_artist_id is null or p.artist_id = p_artist_id)
  )
  select days.d,
         count(plays.d),
         count(plays.d) filter (where plays.is_real),
         count(distinct plays.user_id)   -- sèlman moun ki konekte
  from days
  left join plays on plays.d = days.d
  where public.can_see_stats(p_artist_id)
  group by days.d
  order by days.d;
$$;

-- 3b. Mizik ki pi koute nan peryòd la
create function public.top_songs_period(p_days integer, p_artist_id uuid default null, p_limit integer default 10)
returns table (song_id uuid, title text, artist_id uuid, artist_name text, starts bigint, real_plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, s.title, s.artist_id, a.display_name,
         count(p.id),
         count(p.id) filter (where p.is_real) as real_count
  from public.song_plays p
  join public.songs s on s.id = p.song_id
  join public.profiles a on a.id = s.artist_id
  where p.started_at > now() - make_interval(days => least(greatest(p_days, 1), 366))
    and (p_artist_id is null or p.artist_id = p_artist_id)
    and public.can_see_stats(p_artist_id)
  group by s.id, s.title, s.artist_id, a.display_name
  order by real_count desc, count(p.id) desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- 3c. Atis ki pi koute nan peryòd la (admin sèlman)
create function public.top_artists_period(p_days integer, p_limit integer default 10)
returns table (artist_id uuid, artist_name text, starts bigint, real_plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name,
         count(p.id),
         count(p.id) filter (where p.is_real) as real_count
  from public.song_plays p
  join public.profiles a on a.id = p.artist_id
  where p.started_at > now() - make_interval(days => least(greatest(p_days, 1), 366))
    and public.is_admin()
  group by a.id, a.display_name
  order by real_count desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.can_see_stats(uuid) from public, anon;
revoke execute on function public.play_stats_daily(integer, uuid) from public, anon;
revoke execute on function public.top_songs_period(integer, uuid, integer) from public, anon;
revoke execute on function public.top_artists_period(integer, integer) from public, anon;
grant execute on function public.can_see_stats(uuid) to authenticated;
grant execute on function public.play_stats_daily(integer, uuid) to authenticated;
grant execute on function public.top_songs_period(integer, uuid, integer) to authenticated;
grant execute on function public.top_artists_period(integer, integer) to authenticated;
