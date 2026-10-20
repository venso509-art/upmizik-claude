-- =====================================================================
-- UpMizik: kòmantè sou chante yo
-- =====================================================================

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_song_id_idx on public.comments (song_id, created_at desc);
create index comments_user_id_idx on public.comments (user_id);

alter table public.comments enable row level security;

-- Tout moun ka li kòmantè yo
create policy "Kòmantè vizib pou tout moun"
  on public.comments for select
  using (true);

-- Sèlman moun ki konekte ka ekri, e sèlman sou pwòp non yo
create policy "Itilizatè konekte ekri kòmantè"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Ou ka efase pwòp kòmantè ou, OSWA nenpòt kòmantè sou pwòp chante ou (moderasyon)
create policy "Efase pwòp kòmantè oswa kòmantè sou pwòp chante"
  on public.comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.songs
      where songs.id = comments.song_id and songs.artist_id = (select auth.uid())
    )
  );
