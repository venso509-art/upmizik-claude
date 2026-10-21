-- 🏆 Trofe otomatik: chif yon atis (piblik). Lis trofe yo ak papòt yo nan src/lib/trophies.ts.
-- Pa ekspoze okenn done prive (pa gen non/kontak donatè, se sèlman kantite).

create or replace function public.artist_trophy_stats(p_artist uuid)
returns table (
  songs           integer,  -- chante pibliye
  best_song_plays integer,  -- chante ki pi koute a
  total_plays     bigint,
  likes           bigint,
  comments        bigint,
  donations       bigint,   -- don verifye
  donors          bigint,   -- moun diferan ki fè don
  fans            bigint,   -- koutè konekte diferan
  in_top3         boolean,
  in_top10        boolean,
  is_verified     boolean,
  approved_at     timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  with a as (
    select id, is_verified, approved_at
    from public.profiles
    where id = p_artist and role = 'artist' and status = 'approved' and archived_at is null
  ),
  s as (
    select id, play_count from public.songs where artist_id = p_artist and archived_at is null
  )
  select
    (select count(*) from s)::integer,
    coalesce((select max(play_count) from s), 0)::integer,
    coalesce((select sum(play_count) from s), 0)::bigint,
    (select count(*) from public.song_likes l where l.song_id in (select id from s)),
    (select count(*) from public.comments c where c.song_id in (select id from s)),
    (select count(*) from public.donations d where d.artist_id = p_artist and d.status = 'verified'),
    (select count(distinct lower(d.contact_value)) from public.donations d where d.artist_id = p_artist and d.status = 'verified'),
    (select count(distinct p.user_id) from public.song_plays p where p.artist_id = p_artist and p.is_real and p.user_id is not null),
    exists (select 1 from public.top_songs t where t.song_id in (select id from s)),
    exists (
      select 1 from public.top10_songs(array(select song_id from public.top_songs)) t
      where t.song_id in (select id from s)
    ),
    a.is_verified,
    a.approved_at
  from a;
$$;

grant execute on function public.artist_trophy_stats(uuid) to anon, authenticated;
