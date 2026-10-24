-- =====================================================================
-- STATI ATIS (tankou WhatsApp): atis PRO yo poste yon tèks, yon foto, yon videyo oswa yon odyo
-- ki dire 24 è. Maksimòm 5 stati pa 24 è. Fanatik yo wè yo lè yo klike sou ti wonn atis la.
-- =====================================================================

create table public.artist_statuses (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('text', 'image', 'video', 'audio')),
  media_path  text,                                            -- statuses/<artist_id>/<fichye>
  body        text check (char_length(body) <= 500),           -- tèks la, oswa yon ti deskripsyon
  bg          text check (bg ~ '^#[0-9A-Fa-f]{6}$'),           -- koulè fon pou stati tèks yo
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  check ((kind = 'text' and media_path is null and char_length(trim(coalesce(body, ''))) > 0)
      or (kind <> 'text' and media_path is not null))
);

create index artist_statuses_live_idx on public.artist_statuses (artist_id, expires_at desc);

alter table public.artist_statuses enable row level security;

-- Tout moun wè stati ki poko ekspire yo (atis apwouve sèlman); atis la wè pa l yo; admin wè tout
create policy "Stati vivan yo vizib pou tout moun"
  on public.artist_statuses for select
  using (
    (expires_at > now() and exists (select 1 from public.profiles p
                                    where p.id = artist_id and p.status = 'approved' and p.archived_at is null))
    or artist_id = (select auth.uid())
    or public.is_admin()
  );

create policy "Atis Pro poste stati"
  on public.artist_statuses for insert
  to authenticated
  with check (artist_id = (select auth.uid()));

create policy "Atis efase stati li, admin efase nenpòt"
  on public.artist_statuses for delete
  to authenticated
  using (artist_id = (select auth.uid()) or public.is_admin());

-- Gad la: Pro sèlman, 5 pa 24 è, dat yo fikse pa baz done a, fichye a nan pwòp folder atis la
create function public.artist_statuses_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_recent integer;
begin
  if not exists (select 1 from public.profiles
                 where id = new.artist_id and role = 'artist' and status = 'approved' and archived_at is null) then
    raise exception 'Se atis ki apwouve yo sèlman ki ka poste stati';
  end if;
  if not public.is_pro(new.artist_id) then
    raise exception 'Stati yo se pou atis Pro yo sèlman';
  end if;
  select count(*) into v_recent from public.artist_statuses
  where artist_id = new.artist_id and created_at > now() - interval '24 hours';
  if v_recent >= 5 then
    raise exception 'Ou rive nan limit lan: 5 stati chak 24 è. Eseye ankò pita.';
  end if;
  if new.media_path is not null and split_part(new.media_path, '/', 1) <> new.artist_id::text then
    raise exception 'Fichye a pa valid';
  end if;
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  new.body := nullif(trim(coalesce(new.body, '')), '');
  return new;
end;
$$;

create trigger artist_statuses_guard
  before insert on public.artist_statuses
  for each row execute function public.artist_statuses_guard();

-- ---------------------------------------------------------------------
-- FICHYE STATI YO: bucket piblik "statuses", folder <artist_id>/, 30 MB maks
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statuses', 'statuses', true, 31457280, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'
]);

create policy "Atis Pro voye fichye stati"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'statuses'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_pro((select auth.uid()))
  );

create policy "Atis oswa admin efase fichye stati"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'statuses'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
