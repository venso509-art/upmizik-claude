-- =====================================================================
-- UpMizik: atis yon koutè koute plis yo (sèk won sou paj akèy la)
-- =====================================================================

-- Atis itilizatè ki konekte a koute plis (dapre ekout reyèl li yo).
-- Retounen anyen si moun nan pa konekte.
create function public.my_top_artists(p_limit integer default 15)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, count(*) as plays
  from public.song_plays p
  join public.profiles a on a.id = p.artist_id
  where p.user_id = auth.uid()
    and p.is_real
    and a.status = 'approved'
  group by a.id, a.display_name, a.avatar_url
  order by plays desc, max(p.started_at) desc
  limit least(greatest(p_limit, 1), 30);
$$;

-- Atis ki pi popilè sou tout platfòm nan (pou moun ki poko gen istwa)
create function public.popular_artists(p_limit integer default 15)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, coalesce(sum(s.play_count), 0) as plays
  from public.profiles a
  join public.songs s on s.artist_id = a.id
  where a.role = 'artist' and a.status = 'approved'
  group by a.id, a.display_name, a.avatar_url
  order by plays desc
  limit least(greatest(p_limit, 1), 30);
$$;

revoke execute on function public.my_top_artists(integer) from public, anon;
grant execute on function public.my_top_artists(integer) to authenticated;
grant execute on function public.popular_artists(integer) to anon, authenticated;
