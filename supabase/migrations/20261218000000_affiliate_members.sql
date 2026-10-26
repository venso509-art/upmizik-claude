-- =====================================================================
-- SISTÈM MANM AFILYE (Referral): moun ki ede atis yo enskri sou UpMizik
--  1. members: demann manm (non, imèl, telefòn) → admin apwouve → yon pseudo inik (egz: VENSO2026)
--  2. profiles.referred_by_member_id: ki manm ki te fè atis la enskri (pseudo a nan fòm enskripsyon an)
--  3. Lè ekip la APWOUVE atis la: +1 pou manm nan, epi atis la jwenn 2 jou promo sou paj akèy la
--     (nou konte sèlman atis apwouve yo, pou pèsonn pa ka ranpli kont fo)
--  4. Kòb la chak mwa: 1 $ pa atis jiska objektif la (50), 2,50 $ pa atis apre sa
--  5. member_payouts: admin anrejistre peman yo (MonCash/NatCash)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. MANM YO
-- ---------------------------------------------------------------------
create table public.members (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references public.profiles (id) on delete cascade,
  full_name        text not null check (char_length(trim(full_name)) between 2 and 80),
  email            text not null check (char_length(email) between 5 and 120),
  phone            text not null check (char_length(phone) between 8 and 20),
  city             text check (char_length(city) <= 60),
  motivation       text check (char_length(motivation) <= 500),
  pseudo_referral  text unique check (pseudo_referral ~ '^[A-Z0-9]{4,20}$'),
  objective_total  integer not null default 50 check (objective_total between 1 and 10000),
  current_progress integer not null default 0,            -- tout atis apwouve li fè enskri (depi l kòmanse)
  total_earned     numeric(12, 2) not null default 0,     -- tout sa ekip la deja peye l ($)
  contract_months  integer not null default 6 check (contract_months between 1 and 60),
  status           text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  admin_note       text check (char_length(admin_note) <= 500),
  approved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index members_status_idx on public.members (status, created_at desc);
alter table public.members enable row level security;

-- Manm nan wè pwòp fich li; admin wè tout. Pa gen insert/update dirèk: se fonksyon yo sèlman.
create policy "Manm wè fich li, admin wè tout" on public.members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------------
-- 2. KI MANM KI TE FÈ ATIS LA ENSKRI
-- ---------------------------------------------------------------------
alter table public.profiles
  add column referred_by_member_id uuid references public.members (id) on delete set null,
  add column referral_counted_at   timestamptz;   -- dat atis la te konte pou manm nan (apre apwobasyon)

create index profiles_referred_idx on public.profiles (referred_by_member_id) where referred_by_member_id is not null;

-- Enskripsyon: menm fonksyon an + li pseudo manm nan (si atis la mete youn)
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
    select id into v_member from public.members where pseudo_referral = v_ref and status = 'approved';
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

-- Pseudo a valid? (fòm enskripsyon an tcheke l pandan atis la ap tape)
create function public.check_referral(p_code text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select split_part(trim(m.full_name), ' ', 1) from public.members m
  where m.pseudo_referral = upper(trim(p_code)) and m.status = 'approved';
$$;

grant execute on function public.check_referral(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. ATIS LA APWOUVE → +1 POU MANM NAN + 2 JOU PROMO
-- ---------------------------------------------------------------------
create function public.count_referral_on_approval()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  m public.members;
begin
  if new.status <> 'approved' or old.status = 'approved' or new.referred_by_member_id is null or new.referral_counted_at is not null or new.role <> 'artist' then
    return new;
  end if;
  select * into m from public.members where id = new.referred_by_member_id;
  if not found or m.status <> 'approved' then
    return new;
  end if;

  new.referral_counted_at := now();
  -- 2 jou promo: atis la parèt an premye sou paj akèy la (menm sistèm ak boost la).
  -- Trigger sa a pase APRE gad boost la ("zz..."), kidonk li ka mete kolòn yo dirèkteman.
  new.is_boosted := true;
  new.boost_type := 'profil';
  new.boost_days := 2;
  new.boost_expires_at := greatest(coalesce(old.boost_expires_at, now()), now()) + interval '2 days';

  update public.members set current_progress = current_progress + 1 where id = m.id;

  perform public.notify(m.user_id, 'account', '🎉 Yon nouvo atis konte pou ou!',
    coalesce(new.display_name, 'Yon atis') || ' fèk apwouve sou UpMizik. +1 nan objektif ou!', '/manm/dashboard');
  perform public.notify(new.id, 'account', 'Ou gen 2 jou promo!',
    'Paske ou enskri ak pseudo ' || m.pseudo_referral || ', pwofil ou parèt an premye sou UpMizik pandan 2 jou.', '/atis/' || new.id::text);
  return new;
end;
$$;

-- Pèsonn pa ka chanje "ki manm ki fè m enskri" sou pwòp pwofil li (sèlman enskripsyon an oswa admin)
create function public.guard_referral_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.referred_by_member_id := old.referred_by_member_id;
    new.referral_counted_at := old.referral_counted_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_referral before update on public.profiles
  for each row execute function public.guard_referral_columns();

-- "BEFORE" pou nou ka mete kolòn yo dirèkteman; non an kòmanse pa "zz" pou l pase APRE gad yo
create trigger zz_profiles_count_referral before update of status on public.profiles
  for each row execute function public.count_referral_on_approval();

-- ---------------------------------------------------------------------
-- 4. DEMANN MANM + ESPAS MANM
-- ---------------------------------------------------------------------
create function public.request_membership(p_full_name text, p_email text, p_phone text, p_city text, p_motivation text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte pou w vin manm';
  end if;
  if exists (select 1 from public.members where user_id = v_uid) then
    raise exception 'Ou deja voye yon demann manm';
  end if;
  insert into public.members (user_id, full_name, email, phone, city, motivation)
  values (v_uid, trim(p_full_name), lower(trim(p_email)), trim(p_phone), nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_motivation, '')), ''))
  returning id into v_id;

  perform public.notify(p.id, 'account', 'Nouvo demann manm afilye',
    trim(p_full_name) || ' vle vin manm afilye. Tcheke demann nan.', '/admin/manm')
  from public.profiles p where p.is_admin;
  return v_id;
end;
$$;

revoke execute on function public.request_membership(text, text, text, text, text) from public, anon;
grant execute on function public.request_membership(text, text, text, text, text) to authenticated;

-- Atis yon manm fè enskri (manm nan li menm oswa admin)
create function public.member_referrals(p_member uuid)
returns table (artist_id uuid, name text, avatar_url text, status text, signed_up_at timestamptz, counted_at timestamptz, promo_until timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url, p.status::text, p.created_at, p.referral_counted_at,
         case when p.is_boosted and p.boost_expires_at > now() then p.boost_expires_at end
  from public.profiles p
  join public.members m on m.id = p.referred_by_member_id
  where m.id = p_member and (m.user_id = auth.uid() or public.is_admin())
  order by p.created_at desc;
$$;

revoke execute on function public.member_referrals(uuid) from public, anon;
grant execute on function public.member_referrals(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. PEMAN MANM YO (admin)
-- ---------------------------------------------------------------------
create table public.member_payouts (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members (id) on delete cascade,
  period        date not null,                       -- premye jou mwa a (egz: 2026-10-01)
  artists_count integer not null,
  amount_usd    numeric(10, 2) not null check (amount_usd >= 0),
  amount_htg    numeric(12, 2) not null check (amount_htg >= 0),
  method        public.donation_method not null,
  reference     text check (char_length(reference) <= 80),
  paid_at       timestamptz not null default now(),
  paid_by       uuid references public.profiles (id) on delete set null,
  unique (member_id, period)
);

alter table public.member_payouts enable row level security;
create policy "Manm wè peman li, admin wè tout" on public.member_payouts
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())));

-- Kòb yon mwa: 1 $ pa atis jiska objektif la, 2,50 $ pa atis apre sa
create function public.member_month_earnings(p_count integer, p_objective integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select least(p_count, p_objective) * 1.00 + greatest(p_count - p_objective, 0) * 2.50;
$$;

-- Admin: apwouve (pseudo otomatik), bloke, oswa remete yon manm
create function public.admin_review_member(p_member uuid, p_action text, p_note text default null)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  m      public.members;
  v_base text;
  v_code text;
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
      -- Pseudo inik: premye non an (lèt ak chif sèlman) + ane a, egz: VENSO2026
      v_base := left(upper(regexp_replace(translate(split_part(trim(m.full_name), ' ', 1),
                  'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'), '[^A-Za-z0-9]', '', 'g')), 12);
      if char_length(v_base) < 3 then v_base := 'MANM'; end if;
      v_code := v_base || to_char(now(), 'YYYY');
      while exists (select 1 from public.members where pseudo_referral = v_code) loop
        i := i + 1;
        v_code := v_base || to_char(now(), 'YYYY') || i::text;
      end loop;
    end if;
    update public.members
    set status = 'approved', pseudo_referral = v_code, approved_at = coalesce(approved_at, now()),
        admin_note = nullif(trim(coalesce(p_note, '')), '')
    where id = p_member;
    perform public.notify(m.user_id, 'account', '🎉 Ou se manm afilye UpMizik kounye a!',
      'Pseudo ou: ' || v_code || '. Pataje l ak atis yo pou yo enskri.', '/manm/dashboard');
    return v_code;
  elsif p_action = 'block' then
    update public.members set status = 'blocked', admin_note = nullif(trim(coalesce(p_note, '')), '') where id = p_member;
    perform public.notify(m.user_id, 'account', 'Kont manm ou bloke',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Kontakte ekip UpMizik la pou plis enfòmasyon.'), '/manm/dashboard');
    return null;
  else
    raise exception 'Aksyon an pa valid';
  end if;
end;
$$;

revoke execute on function public.admin_review_member(uuid, text, text) from public, anon;
grant execute on function public.admin_review_member(uuid, text, text) to authenticated;

-- Admin: anrejistre peman yon mwa (kantite atis apwouve nan mwa a × to a)
create function public.admin_pay_member(p_member uuid, p_period date, p_method public.donation_method, p_reference text)
returns numeric
language plpgsql
security definer set search_path = ''
as $$
declare
  m        public.members;
  v_start  date := date_trunc('month', p_period)::date;
  v_count  integer;
  v_usd    numeric;
  v_rate   numeric;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into m from public.members where id = p_member for update;
  if not found then
    raise exception 'Manm sa a pa egziste';
  end if;
  if exists (select 1 from public.member_payouts where member_id = p_member and period = v_start) then
    raise exception 'Mwa sa a deja peye';
  end if;

  select count(*) into v_count from public.profiles
  where referred_by_member_id = p_member
    and referral_counted_at >= v_start and referral_counted_at < (v_start + interval '1 month');
  if v_count = 0 then
    raise exception 'Pa gen atis apwouve nan mwa sa a';
  end if;

  v_usd := public.member_month_earnings(v_count, m.objective_total);
  select coalesce(htg_per_usd, 0) into v_rate from public.settings where id;

  insert into public.member_payouts (member_id, period, artists_count, amount_usd, amount_htg, method, reference, paid_by)
  values (p_member, v_start, v_count, v_usd, round(v_usd * coalesce(v_rate, 0), 2), p_method,
          nullif(trim(coalesce(p_reference, '')), ''), auth.uid());
  update public.members set total_earned = total_earned + v_usd where id = p_member;

  perform public.notify(m.user_id, 'payout', '💸 Peman manm ou voye!',
    v_usd || ' $ pou ' || v_count || ' atis (' || to_char(v_start, 'MM/YYYY') || ').', '/manm/dashboard');
  return v_usd;
end;
$$;

revoke execute on function public.admin_pay_member(uuid, date, public.donation_method, text) from public, anon;
grant execute on function public.admin_pay_member(uuid, date, public.donation_method, text) to authenticated;
