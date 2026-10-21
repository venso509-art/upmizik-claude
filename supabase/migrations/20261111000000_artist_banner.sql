-- 🖼️ Banyè pwofil atis: yon gwo foto anlè paj atis la

alter table public.profiles
  add column banner_url text check (banner_url ~ '^https://' and char_length(banner_url) <= 500);

-- Banyè yo: banners/<user_id>/<tan>.jpg (5 MB maks)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Se sèlman atis ki ka monte yon banyè, nan pwòp dosye pa l
create policy "Atis upload pwòp banyè li"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'banners'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'artist')
  );

create policy "Atis efase pwòp banyè li"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
