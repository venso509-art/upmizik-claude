-- =====================================================================
-- UpMizik: estrikti baz done inisyal
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. WÒL: yon itilizatè se swa "listener" (koutè) swa "artist" (atis)
-- ---------------------------------------------------------------------
create type public.user_role as enum ('listener', 'artist');

-- ---------------------------------------------------------------------
-- 2. PROFILES: enfòmasyon piblik chak itilizatè
--    (imèl ak modpas rete nan auth.users, ke Supabase jere)
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role         public.user_role not null default 'listener',
  avatar_url   text,
  bio          text check (char_length(bio) <= 1000),
  created_at   timestamptz not null default now()
);

-- Kreye yon profile otomatikman chak fwa yon moun enskri.
-- Fòm enskripsyon an ap voye "display_name" ak "role" nan metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'artist'
         then 'artist'::public.user_role
         else 'listener'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. SONGS: chante atis yo upload
-- ---------------------------------------------------------------------
create table public.songs (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid not null references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  genre            text,
  audio_path       text not null,   -- chemen fichye a nan bucket "audio"
  cover_path       text,            -- chemen imaj la nan bucket "covers"
  duration_seconds integer check (duration_seconds > 0),
  play_count       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index songs_artist_id_idx on public.songs (artist_id);
create index songs_created_at_idx on public.songs (created_at desc);

-- ---------------------------------------------------------------------
-- 4. SEKIRITE (Row Level Security)
--    San RLS, nenpòt moun ki gen kle piblik la ta ka modifye tout bagay.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs    enable row level security;

-- Profiles: tout moun ka wè yo; chak moun modifye pwòp pa l sèlman
create policy "Profiles vizib pou tout moun"
  on public.profiles for select
  using (true);

create policy "Itilizatè modifye pwòp profile li"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Pèsonn pa ka chanje pwòp wòl li apre enskripsyon (pa egzanp koutè → atis)
-- san pase pa yon admin.
create function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and current_user = 'authenticated' then
    raise exception 'Ou pa ka chanje wòl ou';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- Songs: tout moun ka koute; sèlman atis yo ka ajoute/modifye/efase PWÒP chante yo
create policy "Chante vizib pou tout moun"
  on public.songs for select
  using (true);

create policy "Atis ajoute pwòp chante yo"
  on public.songs for insert
  to authenticated
  with check (
    (select auth.uid()) = artist_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist'
    )
  );

create policy "Atis modifye pwòp chante yo"
  on public.songs for update
  to authenticated
  using ((select auth.uid()) = artist_id)
  with check ((select auth.uid()) = artist_id);

create policy "Atis efase pwòp chante yo"
  on public.songs for delete
  to authenticated
  using ((select auth.uid()) = artist_id);

-- ---------------------------------------------------------------------
-- 5. STORAGE: kote fichye yo sere
--    Chak atis mete fichye l nan yon folder ki pote ID li: audio/<user_id>/chante.mp3
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio',  'audio',  true, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac']), -- 50 MB
  ('covers', 'covers', true, 5242880,  array['image/jpeg', 'image/png', 'image/webp']);                                            -- 5 MB

-- Bucket yo "public": tout moun ka koute/wè fichye yo san règ siplemantè.
-- Règ anba yo kontwole kiyès ki ka AJOUTE, MODIFYE oswa EFASE.

create policy "Atis upload nan pwòp folder yo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist'
    )
  );

create policy "Atis modifye pwòp fichye yo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Atis efase pwòp fichye yo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
