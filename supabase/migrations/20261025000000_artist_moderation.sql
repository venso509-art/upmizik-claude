-- =====================================================================
-- UpMizik: validasyon (moderasyon) kont atis yo
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ESTATI KONT: pending (ap tann) / approved (apwouve) / blocked (bloke)
-- ---------------------------------------------------------------------
create type public.account_status as enum ('pending', 'approved', 'blocked');

alter table public.profiles
  add column status public.account_status not null default 'pending';

-- Tout kont ki te deja egziste yo vin apwouve
update public.profiles set status = 'approved';

-- Nouvo kont: koutè yo apwouve otomatikman; atis yo tann validasyon admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  is_artist boolean := new.raw_user_meta_data ->> 'role' = 'artist';
begin
  insert into public.profiles (id, display_name, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when is_artist then 'artist'::public.user_role else 'listener'::public.user_role end,
    case when is_artist then 'pending'::public.account_status else 'approved'::public.account_status end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. PWOTEKSYON: yon itilizatè pa ka chanje pwòp wòl li, dwa admin li,
--    NI estati li. Admin yo ka chanje yo pou lòt moun.
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Ou pa ka chanje wòl ou';
    end if;
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Ou pa ka chanje dwa admin';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Ou pa ka chanje estati kont ou';
    end if;
  end if;
  return new;
end;
$$;

-- Admin yo ka modifye nenpòt pwofil (pou apwouve oswa bloke)
create policy "Admin modifye pwofil yo"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. BLOKAJ UPLOAD: sèlman atis APWOUVE ka ajoute chante ak fichye
-- ---------------------------------------------------------------------
drop policy "Atis ajoute pwòp chante yo" on public.songs;

create policy "Atis apwouve ajoute pwòp chante yo"
  on public.songs for insert
  to authenticated
  with check (
    (select auth.uid()) = artist_id
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist' and status = 'approved'
    )
  );

drop policy "Atis upload nan pwòp folder yo" on storage.objects;

create policy "Atis apwouve upload nan pwòp folder yo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist' and status = 'approved'
    )
  );

-- ---------------------------------------------------------------------
-- 4. LIS ITILIZATÈ POU ADMIN (ak imèl yo, ki nan auth.users)
--    Retounen anyen si moun ki rele l la pa admin.
-- ---------------------------------------------------------------------
create function public.admin_list_users()
returns table (
  id uuid,
  display_name text,
  role public.user_role,
  status public.account_status,
  is_admin boolean,
  email text,
  created_at timestamptz,
  song_count bigint
)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.role, p.status, p.is_admin, u.email::text, p.created_at,
         (select count(*) from public.songs s where s.artist_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where (select public.is_admin())
  order by p.created_at desc;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------
-- 5. FÈ VENSO ADMIN (etap ki pa t pase a)
-- ---------------------------------------------------------------------
update public.profiles set is_admin = true
where id = '6a5cd2a4-fb43-42d1-bf0a-3f64f20a4831';
