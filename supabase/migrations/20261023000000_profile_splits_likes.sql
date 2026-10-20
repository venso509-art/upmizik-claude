-- =====================================================================
-- UpMizik: pwofil konplè, pataj royalties (splits), ak likes
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PWOFIL: nouvo chan pou atis yo
-- ---------------------------------------------------------------------
alter table public.profiles
  add column location      text check (char_length(location) <= 100),
  add column influences    text check (char_length(influences) <= 500),   -- atis ki enspire l
  add column vision        text check (char_length(vision) <= 1000),      -- vizyon li pou mizik
  add column youtube_url   text check (youtube_url ~ '^https://' and char_length(youtube_url) <= 300),
  add column instagram_url text check (instagram_url ~ '^https://' and char_length(instagram_url) <= 300),
  add column donation_url  text check (donation_url ~ '^https://' and char_length(donation_url) <= 300);

-- Foto pwofil yo: avatars/<user_id>/foto.jpg (2 MB maks)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Itilizatè upload pwòp avatar li"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Itilizatè efase pwòp avatar li"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 2. CHANTE: lyen YouTube (pa egzanp videyo klip la)
-- ---------------------------------------------------------------------
alter table public.songs
  add column youtube_url text check (youtube_url ~ '^https://' and char_length(youtube_url) <= 300);

-- ---------------------------------------------------------------------
-- 3. SPLITS: pataj royalties ak jiska 5 kolaboratè pa chante
--    Pati atis la = 100% - total kolaboratè yo
-- ---------------------------------------------------------------------
create table public.song_splits (
  id                 uuid primary key default gen_random_uuid(),
  song_id            uuid not null references public.songs (id) on delete cascade,
  collaborator_name  text not null check (char_length(trim(collaborator_name)) between 1 and 80),
  collaborator_role  text not null check (char_length(trim(collaborator_role)) between 1 and 40),
  collaborator_email text check (char_length(collaborator_email) <= 200),
  percentage         numeric(5, 2) not null check (percentage > 0 and percentage <= 100),
  created_at         timestamptz not null default now()
);

create index song_splits_song_id_idx on public.song_splits (song_id);

alter table public.song_splits enable row level security;

-- Se SÈLMAN atis ki pwopriyetè chante a ki ka wè oswa chanje splits li
create policy "Atis jere splits pwòp chante li"
  on public.song_splits for all
  to authenticated
  using (exists (select 1 from public.songs where songs.id = song_splits.song_id and songs.artist_id = (select auth.uid())))
  with check (exists (select 1 from public.songs where songs.id = song_splits.song_id and songs.artist_id = (select auth.uid())));

-- Règ: maksimòm 5 kolaboratè, e total la pa ka depase 100%
create function public.check_song_splits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.song_splits where song_id = new.song_id) > 5 then
    raise exception 'Maksimòm 5 kolaboratè pa chante';
  end if;
  if (select sum(percentage) from public.song_splits where song_id = new.song_id) > 100 then
    raise exception 'Total pousantaj yo pa ka depase 100%%';
  end if;
  return new;
end;
$$;

create trigger song_splits_check
  after insert or update on public.song_splits
  for each row execute function public.check_song_splits();

-- Ranplase TOUT splits yon chante an yon sèl fwa (si yon bagay echwe, anyen pa chanje)
create function public.set_song_splits(p_song_id uuid, p_splits jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.songs where id = p_song_id and artist_id = auth.uid()) then
    raise exception 'Chante sa a pa pou ou';
  end if;

  delete from public.song_splits where song_id = p_song_id;

  insert into public.song_splits (song_id, collaborator_name, collaborator_role, collaborator_email, percentage)
  select p_song_id,
         trim(s ->> 'name'),
         trim(s ->> 'role'),
         nullif(trim(s ->> 'email'), ''),
         (s ->> 'percentage')::numeric
  from jsonb_array_elements(coalesce(p_splits, '[]'::jsonb)) as s;
end;
$$;

grant execute on function public.set_song_splits(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 4. LIKES: yon moun ka like yon chante yon sèl fwa
-- ---------------------------------------------------------------------
create table public.song_likes (
  song_id    uuid not null references public.songs (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, user_id)
);

create index song_likes_user_id_idx on public.song_likes (user_id);

alter table public.song_likes enable row level security;

create policy "Likes vizib pou tout moun"
  on public.song_likes for select
  using (true);

create policy "Itilizatè like pou tèt li"
  on public.song_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Itilizatè retire pwòp like li"
  on public.song_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);
