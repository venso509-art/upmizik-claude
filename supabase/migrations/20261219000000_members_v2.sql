-- =====================================================================
-- MANM AFILYE v2
--  1. Sèks (fi / gason) nan demann nan
--  2. Manm nan ka chanje pseudo li: maksimòm 3 fwa chak 30 jou.
--     Ansyen pseudo li yo kontinye mache pou atis ki gen ansyen lyen an (si pèsonn pa pran l).
--  3. Admin: "Rejte" (rezon an voye bay moun nan, li ka korije epi voye ankò) apa de "Bloke"
-- =====================================================================

alter table public.members
  add column sex text check (sex in ('fi', 'gason'));

alter table public.members drop constraint members_status_check;
alter table public.members add constraint members_status_check check (status in ('pending', 'approved', 'rejected', 'blocked'));

-- ---------------------------------------------------------------------
-- 1. DEMANN NAN (ak sèks); yon moun yo te rejte ka voye ankò
-- ---------------------------------------------------------------------
drop function public.request_membership(text, text, text, text, text);

create function public.request_membership(p_full_name text, p_email text, p_phone text, p_city text, p_motivation text, p_sex text)
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
  select * into v_old from public.members where user_id = v_uid;
  if found then
    if v_old.status <> 'rejected' then
      raise exception 'Ou deja voye yon demann manm';
    end if;
    -- Te rejte: li korije enfòmasyon yo epi l voye ankò
    update public.members
    set full_name = trim(p_full_name), email = lower(trim(p_email)), phone = trim(p_phone),
        city = nullif(trim(coalesce(p_city, '')), ''), motivation = nullif(trim(coalesce(p_motivation, '')), ''),
        sex = p_sex, status = 'pending', admin_note = null, created_at = now()
    where id = v_old.id
    returning id into v_id;
  else
    insert into public.members (user_id, full_name, email, phone, city, motivation, sex)
    values (v_uid, trim(p_full_name), lower(trim(p_email)), trim(p_phone), nullif(trim(coalesce(p_city, '')), ''),
            nullif(trim(coalesce(p_motivation, '')), ''), p_sex)
    returning id into v_id;
  end if;

  perform public.notify(p.id, 'account', 'Nouvo demann manm afilye',
    trim(p_full_name) || ' vle vin manm afilye. Tcheke demann nan.', '/admin/manm')
  from public.profiles p where p.is_admin;
  return v_id;
end;
$$;

revoke execute on function public.request_membership(text, text, text, text, text, text) from public, anon;
grant execute on function public.request_membership(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. CHANJE PSEUDO (3 fwa maksimòm chak 30 jou)
-- ---------------------------------------------------------------------
create table public.member_pseudo_changes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  old_code   text not null,
  new_code   text not null,
  changed_at timestamptz not null default now()
);

create index member_pseudo_changes_member_idx on public.member_pseudo_changes (member_id, changed_at desc);
create index member_pseudo_changes_old_idx on public.member_pseudo_changes (old_code);
alter table public.member_pseudo_changes enable row level security;
create policy "Manm wè chanjman pseudo li, admin wè tout" on public.member_pseudo_changes
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())));

create function public.change_member_pseudo(p_code text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  m      public.members;
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  select * into m from public.members where user_id = auth.uid() and status = 'approved' for update;
  if not found then
    raise exception 'Se manm apwouve yo sèlman ki ka chanje pseudo';
  end if;
  if v_code !~ '^[A-Z0-9]{4,20}$' then
    raise exception 'Pseudo a dwe gen 4 a 20 lèt oswa chif (san espas)';
  end if;
  if v_code = m.pseudo_referral then
    return v_code;
  end if;
  if (select count(*) from public.member_pseudo_changes where member_id = m.id and changed_at > now() - interval '30 days') >= 3 then
    raise exception 'Ou deja chanje pseudo ou 3 fwa nan 30 dènye jou yo. Eseye ankò pita.';
  end if;
  if exists (select 1 from public.members where pseudo_referral = v_code)
     or exists (select 1 from public.member_pseudo_changes where old_code = v_code and member_id <> m.id) then
    raise exception 'Pseudo sa a deja pran. Chwazi yon lòt.';
  end if;

  insert into public.member_pseudo_changes (member_id, old_code, new_code) values (m.id, m.pseudo_referral, v_code);
  update public.members set pseudo_referral = v_code where id = m.id;
  return v_code;
end;
$$;

revoke execute on function public.change_member_pseudo(text) from public, anon;
grant execute on function public.change_member_pseudo(text) to authenticated;

-- Jwenn manm yon pseudo: pseudo aktyèl la, oswa yon ansyen pseudo (pou ansyen lyen yo kontinye mache)
create function public.member_by_code(p_code text)
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(
    (select id from public.members where pseudo_referral = upper(trim(p_code)) and status = 'approved'),
    (select m.id from public.member_pseudo_changes c join public.members m on m.id = c.member_id
     where c.old_code = upper(trim(p_code)) and m.status = 'approved'
     order by c.changed_at desc limit 1)
  );
$$;

revoke execute on function public.member_by_code(text) from public, anon, authenticated;

create or replace function public.check_referral(p_code text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select split_part(trim(m.full_name), ' ', 1) from public.members m where m.id = public.member_by_code(p_code);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  is_artist  boolean := new.raw_user_meta_data ->> 'role' = 'artist';
  v_phone    text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_location text := left(nullif(trim(new.raw_user_meta_data ->> 'location'), ''), 100);
  v_ref      text := upper(nullif(trim(new.raw_user_meta_data ->> 'referral'), ''));
  v_member   uuid;
begin
  if is_artist and v_ref is not null then
    v_member := public.member_by_code(v_ref);
  end if;

  insert into public.profiles (id, display_name, role, status, location, referred_by_member_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when is_artist then 'artist'::public.user_role else 'listener'::public.user_role end,
    case when is_artist then 'pending'::public.account_status else 'approved'::public.account_status end,
    v_location,
    v_member
  );
  if is_artist then
    insert into public.artist_private (user_id, phone)
    values (new.id, case when char_length(v_phone) between 8 and 20 then v_phone end);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. ADMIN: apwouve / rejte / bloke
-- ---------------------------------------------------------------------
create or replace function public.admin_review_member(p_member uuid, p_action text, p_note text default null)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  m      public.members;
  v_base text;
  v_code text;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  i      integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into m from public.members where id = p_member for update;
  if not found then
    raise exception 'Manm sa a pa egziste';
  end if;

  if p_action = 'approve' then
    v_code := m.pseudo_referral;
    if v_code is null then
      v_base := left(upper(regexp_replace(translate(split_part(trim(m.full_name), ' ', 1),
                  'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'), '[^A-Za-z0-9]', '', 'g')), 12);
      if char_length(v_base) < 3 then v_base := 'MANM'; end if;
      v_code := v_base || to_char(now(), 'YYYY');
      while exists (select 1 from public.members where pseudo_referral = v_code)
         or exists (select 1 from public.member_pseudo_changes where old_code = v_code) loop
        i := i + 1;
        v_code := v_base || to_char(now(), 'YYYY') || i::text;
      end loop;
    end if;
    update public.members
    set status = 'approved', pseudo_referral = v_code, approved_at = coalesce(approved_at, now()), admin_note = v_note
    where id = p_member;
    perform public.notify(m.user_id, 'account', '🎉 Ou se manm afilye UpMizik kounye a!',
      'Pseudo ou: ' || v_code || '. Pataje l ak atis yo pou yo enskri.', '/manm/dashboard');
    return v_code;
  elsif p_action = 'reject' then
    if v_note is null then
      raise exception 'Ekri rezon an pou moun nan ka korije demann li';
    end if;
    update public.members set status = 'rejected', admin_note = v_note where id = p_member;
    perform public.notify(m.user_id, 'account', 'Demann manm ou pa aksepte',
      v_note || ' Ou ka korije l epi voye l ankò.', '/manm');
    return null;
  elsif p_action = 'block' then
    update public.members set status = 'blocked', admin_note = v_note where id = p_member;
    perform public.notify(m.user_id, 'account', 'Kont manm ou bloke',
      coalesce(v_note, 'Kontakte ekip UpMizik la pou plis enfòmasyon.'), '/manm');
    return null;
  else
    raise exception 'Aksyon an pa valid';
  end if;
end;
$$;
