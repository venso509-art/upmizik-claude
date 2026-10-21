-- 🔍 Rechèch: chante ak atis, san pran aksan an kont ("pelen" jwenn "Pèlen")

create extension if not exists unaccent with schema extensions;

-- Retire aksan + mete tout an miniskil
create or replace function public.search_normalize(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

-- Chante: tit, non atis oswa jan an. Sa ki kòmanse ak mo a parèt anvan, apre sa pi koute yo.
create or replace function public.search_songs(p_q text, p_limit integer default 24)
returns table (id uuid)
language sql
stable
security definer set search_path = ''
as $$
  with q as (select public.search_normalize(trim(p_q)) as v)
  select s.id
  from public.songs s
  join public.profiles a on a.id = s.artist_id
  cross join q
  where char_length(q.v) >= 2
    and s.archived_at is null
    and a.status = 'approved' and a.archived_at is null
    and (
      position(q.v in public.search_normalize(s.title)) > 0
      or position(q.v in public.search_normalize(a.display_name)) > 0
      or position(q.v in public.search_normalize(s.genre)) > 0
    )
  order by
    (public.search_normalize(s.title) like q.v || '%') desc,
    (position(q.v in public.search_normalize(s.title)) > 0) desc,
    s.play_count desc,
    s.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Atis: non an. Sa ki kòmanse ak mo a parèt anvan, apre sa pi koute yo.
create or replace function public.search_artists(p_q text, p_limit integer default 12)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint, is_verified boolean)
language sql
stable
security definer set search_path = ''
as $$
  with q as (select public.search_normalize(trim(p_q)) as v)
  select a.id, a.display_name, a.avatar_url,
         coalesce((select sum(s.play_count) from public.songs s where s.artist_id = a.id and s.archived_at is null), 0)::bigint,
         a.is_verified
  from public.profiles a
  cross join q
  where char_length(q.v) >= 2
    and a.role = 'artist' and a.status = 'approved' and a.archived_at is null
    and position(q.v in public.search_normalize(a.display_name)) > 0
  order by
    (public.search_normalize(a.display_name) like q.v || '%') desc,
    4 desc
  limit least(greatest(p_limit, 1), 30);
$$;

grant execute on function public.search_normalize(text) to anon, authenticated;
grant execute on function public.search_songs(text, integer) to anon, authenticated;
grant execute on function public.search_artists(text, integer) to anon, authenticated;
