-- =====================================================================
-- UpMizik: Top 3 sou paj akèy la (admin chwazi l)
-- =====================================================================

create table public.top_songs (
  position   smallint primary key check (position between 1 and 3),  -- 1ye, 2yèm, 3yèm plas
  song_id    uuid not null unique references public.songs (id) on delete cascade,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.top_songs enable row level security;

-- Tout moun ka wè Top 3 la (se pou paj akèy la)
create policy "Top 3 vizib pou tout moun"
  on public.top_songs for select
  using (true);

-- PA GEN règ insert/update/delete: admin yo dwe pase pa fonksyon anba a

-- Ranplase tout Top 3 la an yon sèl fwa.
-- p_song_ids = [mizik #1, mizik #2, mizik #3]; yon null = plas sa a vid.
-- (Si nou te modifye plas yo youn pa youn, chanje 2 mizik de plas t ap bay erè "unique".)
create function public.set_top_songs(p_song_ids uuid[])
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka chanje Top 3 la';
  end if;
  if coalesce(array_length(p_song_ids, 1), 0) > 3 then
    raise exception 'Top 3 la gen 3 plas sèlman';
  end if;

  delete from public.top_songs where true;

  insert into public.top_songs (position, song_id, updated_by)
  select t.ord::smallint, t.song_id, auth.uid()
  from unnest(p_song_ids) with ordinality as t(song_id, ord)
  where t.song_id is not null;
end;
$$;

revoke execute on function public.set_top_songs(uuid[]) from public, anon;
grant execute on function public.set_top_songs(uuid[]) to authenticated;
