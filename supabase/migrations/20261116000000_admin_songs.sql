-- 🎵 Admin: jere TOUT mizik yo (modifye, efase, mete an poz).
-- "Poz" la itilize fonksyon set_archived ki deja egziste a (archived_at).

-- Admin ka modifye ak efase nenpòt chante
create policy "Admin modifye chante"
  on public.songs for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admin efase chante"
  on public.songs for delete
  to authenticated
  using ((select public.is_admin()));

-- Fichye yo: admin ka chanje pochèt yon chante, epi efase fichye yon chante li efase
create policy "Admin voye pochèt"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'covers' and (select public.is_admin()));

create policy "Admin efase fichye chante"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('audio', 'covers') and (select public.is_admin()));

-- Jounal: chak fwa admin modifye chante YON LÒT moun
create function public.audit_song_admin_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.is_admin() and auth.uid() is distinct from new.artist_id
     and (new.title is distinct from old.title
          or new.genre is distinct from old.genre
          or new.youtube_url is distinct from old.youtube_url
          or new.cover_path is distinct from old.cover_path) then
    perform public.audit('song.updated', 'songs', new.id, jsonb_build_object(
      'title', new.title,
      'old_title', old.title,
      'cover_changed', new.cover_path is distinct from old.cover_path
    ));
  end if;
  return null;
end;
$$;

create trigger songs_audit_admin_update
  after update on public.songs
  for each row execute function public.audit_song_admin_update();
