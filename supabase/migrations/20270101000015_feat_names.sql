-- =====================================================================
-- 🎤 NON ATIS FEAT YO (menm si yo pa sou UpMizik)
--  Atis la tape non feat yo lè l ap mete chante a; yo parèt anba tit la: « Atis feat. X & Y ».
--  Featuring UpMizik yo (song_artists, ak pousantaj) toujou la; non sa yo se tèks sèlman.
--  Kolaboratè ki gen wòl « Featuring » nan pataj royalties la parèt tou (non an sèlman, rès enfòmasyon yo rete prive).
-- =====================================================================

alter table public.songs
  add column if not exists feat_names text[] not null default '{}'
    check (cardinality(feat_names) <= 6);

-- Non piblik yo pou yon lis chante (feat_names + kolaboratè « Featuring »)
create or replace function public.song_feat_names(p_song_ids uuid[])
returns table (song_id uuid, name text)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, trim(n.name)
  from public.songs s
  cross join lateral unnest(s.feat_names) with ordinality as n(name, ord)
  where s.id = any (p_song_ids) and char_length(trim(n.name)) between 1 and 60
  union all
  select sp.song_id, trim(sp.collaborator_name)
  from public.song_splits sp
  where sp.song_id = any (p_song_ids) and sp.collaborator_role = 'Featuring' and char_length(trim(sp.collaborator_name)) between 1 and 60;
$$;

grant execute on function public.song_feat_names(uuid[]) to anon, authenticated;
