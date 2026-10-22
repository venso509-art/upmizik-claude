-- 💿 Piblikasyon atis yo: EP, Mixtape, Album. Yon "single" se yon chante san piblikasyon.

create type public.release_kind as enum ('ep', 'mixtape', 'album');

create table public.releases (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(trim(title)) between 1 and 120),
  kind       public.release_kind not null,
  created_at timestamptz not null default now(),
  unique (artist_id, kind, title)
);

create index releases_artist_idx on public.releases (artist_id, created_at desc);

alter table public.releases enable row level security;

create policy "Piblikasyon vizib pou tout moun" on public.releases for select using (true);

create policy "Atis apwouve kreye pwòp piblikasyon li" on public.releases for insert to authenticated
  with check (
    artist_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'artist' and status = 'approved')
  );

create policy "Atis oswa admin modifye piblikasyon" on public.releases for update to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()))
  with check (artist_id = (select auth.uid()) or (select public.is_admin()));

create policy "Atis oswa admin efase piblikasyon" on public.releases for delete to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- Chante yo: ki piblikasyon yo fè pati, ak nimewo yo nan lis la (track 1, 2, 3...)
alter table public.songs
  add column release_id   uuid references public.releases (id) on delete set null,
  add column track_number smallint check (track_number between 1 and 99);

create index songs_release_idx on public.songs (release_id, track_number) where release_id is not null;

-- Yon chante ka sèlman nan yon piblikasyon PWÒP atis li (pa nan album yon lòt moun)
create or replace function public.songs_release_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.release_id is null then
    new.track_number := null;
    return new;
  end if;
  if not exists (select 1 from public.releases r where r.id = new.release_id and r.artist_id = new.artist_id) then
    raise exception 'Piblikasyon sa a pa pou atis chante a';
  end if;
  -- Pa gen nimewo? Mete l apre dènye chante ki deja nan piblikasyon an
  if new.track_number is null then
    select coalesce(max(track_number), 0) + 1 into new.track_number
    from public.songs where release_id = new.release_id and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger songs_release_guard
  before insert or update of release_id, track_number on public.songs
  for each row execute function public.songs_release_guard();
