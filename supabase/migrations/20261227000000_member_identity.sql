-- =====================================================================
-- MANM AFILYE: VERIFIKASYON IDANTITE
--  - Demann manm nan mande 2 foto obligatwa:
--      1. Yon foto figi moun nan (selfie)
--      2. Yon foto pyès idantite li: paspò oswa kat idantite nasyonal
--  - Foto yo nan yon bucket PRIVE "member-ids": folder <id moun nan>/...
--    Sèlman moun nan li menm ak admin yo ka wè yo. Pèsonn pa ka wè yo piblikman.
--  - Manm ki te deja apwouve anvan yo pa bezwen voye foto (kolòn yo ka vid).
-- =====================================================================

alter table public.members
  add column if not exists id_selfie_path text,
  add column if not exists id_doc_path    text,
  add column if not exists id_doc_type    text check (id_doc_type in ('paspo', 'kat_idantite'));

-- Bucket prive pou foto idantite yo (5 MB maks)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-ids', 'member-ids', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Moun nan voye foto idantite li" on storage.objects;
create policy "Moun nan voye foto idantite li"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-ids' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Moun nan oswa admin wè foto idantite" on storage.objects;
create policy "Moun nan oswa admin wè foto idantite"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'member-ids' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

drop policy if exists "Moun nan oswa admin efase foto idantite" on storage.objects;
create policy "Moun nan oswa admin efase foto idantite"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-ids' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- Nouvo vèsyon demann nan: ak 2 foto yo
drop function if exists public.request_membership(text, text, text, text, text, text, text);

create function public.request_membership(
  p_full_name text, p_nickname text, p_email text, p_phone text, p_city text, p_motivation text, p_sex text,
  p_selfie_path text, p_id_path text, p_id_type text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.members;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte pou w vin manm';
  end if;
  if p_sex not in ('fi', 'gason') then
    raise exception 'Chwazi si w se fi oswa gason';
  end if;
  if char_length(trim(coalesce(p_nickname, ''))) not between 2 and 40 then
    raise exception 'Mete non jwèt ou oswa non atis ou (2 a 40 karaktè)';
  end if;
  if p_id_type not in ('paspo', 'kat_idantite') then
    raise exception 'Chwazi kalite pyès la: paspò oswa kat idantite nasyonal';
  end if;
  -- Foto yo dwe nan pwòp folder moun nan (pa ka itilize foto yon lòt moun)
  if coalesce(p_selfie_path, '') not like v_uid::text || '/%' or coalesce(p_id_path, '') not like v_uid::text || '/%' then
    raise exception 'Voye foto figi ou ak foto pyès idantite ou';
  end if;

  select * into v_old from public.members where user_id = v_uid;
  if found then
    if v_old.status <> 'rejected' then
      raise exception 'Ou deja voye yon demann manm';
    end if;
    update public.members
    set full_name = trim(p_full_name), nickname = trim(p_nickname), email = lower(trim(p_email)), phone = trim(p_phone),
        city = nullif(trim(coalesce(p_city, '')), ''), motivation = nullif(trim(coalesce(p_motivation, '')), ''),
        sex = p_sex, status = 'pending', admin_note = null, created_at = now(),
        id_selfie_path = p_selfie_path, id_doc_path = p_id_path, id_doc_type = p_id_type
    where id = v_old.id
    returning id into v_id;
  else
    insert into public.members (user_id, full_name, nickname, email, phone, city, motivation, sex, id_selfie_path, id_doc_path, id_doc_type)
    values (v_uid, trim(p_full_name), trim(p_nickname), lower(trim(p_email)), trim(p_phone), nullif(trim(coalesce(p_city, '')), ''),
            nullif(trim(coalesce(p_motivation, '')), ''), p_sex, p_selfie_path, p_id_path, p_id_type)
    returning id into v_id;
  end if;

  perform public.notify(p.id, 'account', 'Nouvo demann manm afilye',
    trim(p_nickname) || ' (' || trim(p_full_name) || ') vle vin manm afilye. Tcheke foto idantite l ak demann nan.', '/admin/manm')
  from public.profiles p where p.is_admin;
  return v_id;
end;
$$;

revoke execute on function public.request_membership(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.request_membership(text, text, text, text, text, text, text, text, text, text) to authenticated;
