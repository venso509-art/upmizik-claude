-- =====================================================================
-- UpMizik: yon moun ki konekte = yon sèl ekout reyèl pa mizik
--   • Moun ki pa konekte ka koute, men ekout yo pa konte
--   • Menm moun nan koute yon mizik 20 fwa → 1 ekout pou mizik sa a
-- =====================================================================

-- "counted" = ekout sa a te konte nan play_count (premye ekout reyèl moun nan pou mizik sa a)
alter table public.song_plays add column counted boolean not null default false;

-- Ekout ki deja la yo: make premye ekout reyèl chak moun konekte pou chak mizik kòm "konte"
update public.song_plays p
set counted = true
from (
  select distinct on (user_id, song_id) id
  from public.song_plays
  where is_real and user_id is not null
  order by user_id, song_id, started_at
) first_play
where p.id = first_play.id;

-- Garanti nan baz done a: yon sèl ekout konte pa moun pa mizik
create unique index song_plays_one_counted on public.song_plays (user_id, song_id) where counted;

create or replace function public.confirm_play(p_play_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song uuid;
  v_user uuid;
begin
  -- 1. Ekout la vin "reyèl" (omwen 4-5 segonn)
  update public.song_plays
  set is_real = true
  where id = p_play_id
    and not is_real
    and started_at <= now() - interval '4 seconds'
    and started_at > now() - interval '6 hours'
  returning song_id, user_id into v_song, v_user;

  -- 2. Sèlman moun ki konekte konte
  if v_song is null or v_user is null then
    return;
  end if;

  -- 3. Premye fwa moun sa a koute mizik sa a? Lè sa a l konte (+1)
  begin
    update public.song_plays
    set counted = true
    where id = p_play_id
      and not exists (
        select 1 from public.song_plays where user_id = v_user and song_id = v_song and counted
      );
    if found then
      update public.songs set play_count = play_count + 1 where id = v_song;
    end if;
  exception when unique_violation then
    null;  -- 2 konfimasyon an menm tan: sèlman youn konte
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Estatistik yo konte ekout INIK yo (counted) kounye a
-- ---------------------------------------------------------------------
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
    select (p.started_at at time zone 'America/Port-au-Prince')::date as d, p.counted, p.user_id
    from public.song_plays p, bounds b
    where p.started_at > now() - make_interval(days => b.n + 1)
      and (p_artist_id is null or p.artist_id = p_artist_id)
  )
  select days.d,
         count(plays.d),
         count(plays.d) filter (where plays.counted),
         count(distinct plays.user_id)
  from days
  left join plays on plays.d = days.d
  where public.can_see_stats(p_artist_id)
  group by days.d
  order by days.d;
$$;

create or replace function public.top_songs_period(p_days integer, p_artist_id uuid default null, p_limit integer default 10)
returns table (song_id uuid, title text, artist_id uuid, artist_name text, starts bigint, real_plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, s.title, s.artist_id, a.display_name,
         count(p.id),
         count(p.id) filter (where p.counted) as real_count
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

create or replace function public.top_artists_period(p_days integer, p_limit integer default 10)
returns table (artist_id uuid, artist_name text, starts bigint, real_plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name,
         count(p.id),
         count(p.id) filter (where p.counted) as real_count
  from public.song_plays p
  join public.profiles a on a.id = p.artist_id
  where p.started_at > now() - make_interval(days => least(greatest(p_days, 1), 366))
    and public.is_admin()
  group by a.id, a.display_name
  order by real_count desc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.top10_songs(p_exclude uuid[] default '{}')
returns table (song_id uuid, score numeric, plays_30d bigint, donations_usd_30d numeric)
language sql
stable
security definer set search_path = ''
as $$
  with recent_plays as (
    select song_id, count(*) as n
    from public.song_plays
    where counted and started_at > now() - interval '30 days'
    group by song_id
  ), recent_donations as (
    select song_id, sum(amount_usd) as usd
    from public.donations
    where status = 'verified' and song_id is not null and coalesce(reviewed_at, created_at) > now() - interval '30 days'
    group by song_id
  )
  select s.id,
         coalesce(rp.n, 0) + 20 * coalesce(rd.usd, 0) + 0.05 * s.play_count as score,
         coalesce(rp.n, 0),
         coalesce(rd.usd, 0)
  from public.songs s
  join public.profiles a on a.id = s.artist_id and a.status = 'approved'
  left join recent_plays rp on rp.song_id = s.id
  left join recent_donations rd on rd.song_id = s.id
  where not (s.id = any (coalesce(p_exclude, '{}')))
  order by score desc, s.play_count desc, s.created_at desc
  limit 10;
$$;
