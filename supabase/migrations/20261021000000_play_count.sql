-- =====================================================================
-- UpMizik: konte konbyen fwa yo koute yon chante
-- =====================================================================
-- RLS anpeche koutè yo modifye tablo songs (se bon bagay).
-- Fonksyon sa a gen pèmisyon espesyal (security definer) pou l fè
-- YON SÈL bagay: ajoute +1 nan play_count yon chante.

create function public.increment_play_count(song_id uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.songs
  set play_count = play_count + 1
  where id = song_id;
$$;

-- Tout moun ka rele l, menm moun ki pa konekte
grant execute on function public.increment_play_count(uuid) to anon, authenticated;
