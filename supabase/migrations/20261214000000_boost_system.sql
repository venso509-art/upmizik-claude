-- =====================================================================
-- BOOST (piblisite peye) pou atis yo
--  1. Kolòn boost sou songs ak profiles (is_boosted, boost_expires_at, boost_type)
--  2. Plan boost yo (1 semèn = 1000 goud, 2 semèn = 1800 goud), admin ka chanje yo
--  3. boost_purchases: istwa demann yo + prèv peman (MonCash/NatCash)
--  4. request_boost: atis la mande yon boost → demann "pending" → admin yo resevwa notifikasyon
--  5. review_boost: admin "Aktive" (is_boosted = true, boost_expires_at = jodi a + jou yo) oswa "Refize"
-- Yon boost aktif = is_boosted AK boost_expires_at > now() (lè dat la pase, li sispann poukont li).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KOLÒN BOOST YO
-- ---------------------------------------------------------------------
alter table public.songs
  add column is_boosted       boolean not null default false,
  add column boost_expires_at timestamptz,
  add column boost_type       text check (boost_type in ('mizik', 'profil'));

alter table public.profiles
  add column is_boosted       boolean not null default false,
  add column boost_expires_at timestamptz,
  add column boost_type       text check (boost_type in ('mizik', 'profil'));

create index songs_boost_idx on public.songs (boost_expires_at desc) where is_boosted;
create index profiles_boost_idx on public.profiles (boost_expires_at desc) where is_boosted;

-- Pèsonn pa ka mete tèt li "boosted" pou kont li: se review_boost sèlman ki ka chanje kolòn sa yo
create function public.guard_boost_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('upmizik.boost_admin', true), '') <> '1' then
    new.is_boosted := old.is_boosted;
    new.boost_expires_at := old.boost_expires_at;
    new.boost_type := old.boost_type;
  end if;
  return new;
end;
$$;

create trigger songs_guard_boost before update on public.songs
  for each row execute function public.guard_boost_columns();
create trigger profiles_guard_boost before update on public.profiles
  for each row execute function public.guard_boost_columns();

-- ---------------------------------------------------------------------
-- 2. PLAN BOOST YO
-- ---------------------------------------------------------------------
create table public.boost_plans (
  id         text primary key,
  label      text not null,
  days       integer not null check (days between 1 and 365),
  price_htg  integer not null check (price_htg > 0),
  active     boolean not null default true,
  sort       integer not null default 0
);

alter table public.boost_plans enable row level security;
create policy "Tout moun wè plan boost yo" on public.boost_plans for select using (true);
create policy "Admin chanje plan boost yo" on public.boost_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.boost_plans (id, label, days, price_htg, sort) values
  ('1-semen', '1 semèn', 7, 1000, 1),
  ('2-semen', '2 semèn', 14, 1800, 2);

-- ---------------------------------------------------------------------
-- 3. ISTWA DEMANN BOOST YO
-- ---------------------------------------------------------------------
create table public.boost_purchases (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete cascade,
  boost_type      text not null check (boost_type in ('mizik', 'profil')),
  target_id       uuid not null,                         -- id chante a, oswa id atis la (pwofil)
  plan_id         text references public.boost_plans (id) on delete set null,
  amount          integer not null check (amount > 0),   -- goud
  duration_days   integer not null check (duration_days > 0),
  method          public.donation_method not null,
  transaction_ref text check (char_length(transaction_ref) <= 60),
  proof_path      text not null,
  status          text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  admin_note      text check (char_length(admin_note) <= 500),
  starts_at       timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles (id) on delete set null
);

create index boost_purchases_artist_idx on public.boost_purchases (artist_id, created_at desc);
create index boost_purchases_status_idx on public.boost_purchases (status, created_at desc);

alter table public.boost_purchases enable row level security;

-- Atis la wè pa l yo, admin wè tout. Pa gen insert/update dirèk: se fonksyon yo sèlman.
create policy "Atis wè boost li, admin wè tout" on public.boost_purchases
  for select to authenticated
  using (artist_id = (select auth.uid()) or public.is_admin());

-- Foto prèv peman an: bucket prive "donation-proofs", folder boost/<id atis>/ (admin deja ka li tout bucket la)
create policy "Atis voye prèv peman boost"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-proofs'
    and (storage.foldername(name))[1] = 'boost'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------
-- 4. ATIS LA MANDE YON BOOST
-- ---------------------------------------------------------------------
create function public.request_boost(
  p_type text,
  p_target uuid,
  p_plan text,
  p_method public.donation_method,
  p_transaction_ref text,
  p_proof_path text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  public.boost_plans;
  v_label text;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  if not exists (select 1 from public.profiles
                 where id = v_uid and role = 'artist' and status = 'approved' and archived_at is null) then
    raise exception 'Se atis ki apwouve yo sèlman ki ka achte yon boost';
  end if;
  if p_type not in ('mizik', 'profil') then
    raise exception 'Chwazi yon mizik oswa pwofil ou';
  end if;

  -- Sib la dwe pou atis la
  if p_type = 'mizik' then
    select title into v_label from public.songs
    where id = p_target and artist_id = v_uid and archived_at is null;
    if v_label is null then
      raise exception 'Chante sa a pa pou ou oswa li pa egziste';
    end if;
    v_label := '« ' || v_label || ' »';
  else
    if p_target is distinct from v_uid then
      raise exception 'Ou ka boost pwòp pwofil ou sèlman';
    end if;
    v_label := 'pwofil ou';
  end if;

  select * into v_plan from public.boost_plans where id = p_plan and active;
  if not found then
    raise exception 'Plan boost sa a pa egziste';
  end if;
  if p_proof_path is null or p_proof_path not like 'boost/' || v_uid::text || '/%' then
    raise exception 'Foto prèv peman an pa valid';
  end if;
  if exists (select 1 from public.boost_purchases where target_id = p_target and status = 'pending') then
    raise exception 'Ou gen yon demann boost k ap tann deja pou sa. Tann ekip la verifye l.';
  end if;
  if (select count(*) from public.boost_purchases where artist_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Twòp demann. Eseye ankò pita.';
  end if;

  insert into public.boost_purchases (artist_id, boost_type, target_id, plan_id, amount, duration_days, method, transaction_ref, proof_path)
  values (v_uid, p_type, p_target, v_plan.id, v_plan.price_htg, v_plan.days, p_method,
          nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path)
  returning id into v_id;

  perform public.notify(v_uid, 'account', 'Demann boost ou an rive!',
    'Boost ' || v_label || ' (' || v_plan.label || '). Ekip la ap verifye peman an epi aktive l byento.', '/dashboard#boost');
  perform public.notify(p.id, 'account', 'Nouvo demann boost',
    'Yon atis peye ' || v_plan.price_htg || ' goud pou boost ' || case when p_type = 'mizik' then 'yon mizik' else 'pwofil li' end || '. Tcheke prèv la.',
    '/admin/boost')
  from public.profiles p where p.is_admin;

  return v_id;
end;
$$;

revoke execute on function public.request_boost(text, uuid, text, public.donation_method, text, text) from public, anon;
grant execute on function public.request_boost(text, uuid, text, public.donation_method, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. ADMIN: AKTIVE OSWA REFIZE
-- ---------------------------------------------------------------------
create function public.review_boost(p_id uuid, p_approve boolean, p_note text default null)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  r        public.boost_purchases;
  v_until  timestamptz;
  v_label  text;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into r from public.boost_purchases where id = p_id for update;
  if not found then
    raise exception 'Demann sa a pa egziste';
  end if;
  if r.status <> 'pending' then
    raise exception 'Demann sa a deja trete';
  end if;

  if r.boost_type = 'mizik' then
    select '« ' || title || ' »' into v_label from public.songs where id = r.target_id;
  else
    v_label := 'pwofil ou';
  end if;

  if not p_approve then
    update public.boost_purchases
    set status = 'rejected', admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_id;
    perform public.notify(r.artist_id, 'account', 'Boost la pa aktive',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Nou pa jwenn peman boost ' || coalesce(v_label, '') || ' la. Kontakte ekip UpMizik la si se yon erè.'),
      '/dashboard#boost');
    return null;
  end if;

  -- Aktive: jodi a + jou yo (si l te deja boosted, nou ajoute jou yo sou sa ki rete a)
  perform set_config('upmizik.boost_admin', '1', true);
  if r.boost_type = 'mizik' then
    update public.songs
    set is_boosted = true, boost_type = 'mizik',
        boost_expires_at = greatest(coalesce(boost_expires_at, now()), now()) + make_interval(days => r.duration_days)
    where id = r.target_id
    returning boost_expires_at into v_until;
  else
    update public.profiles
    set is_boosted = true, boost_type = 'profil',
        boost_expires_at = greatest(coalesce(boost_expires_at, now()), now()) + make_interval(days => r.duration_days)
    where id = r.target_id
    returning boost_expires_at into v_until;
  end if;
  perform set_config('upmizik.boost_admin', '', true);

  if v_until is null then
    raise exception 'Mizik oswa pwofil sa a pa egziste ankò';
  end if;

  update public.boost_purchases
  set status = 'active', starts_at = now(), expires_at = v_until,
      admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id;

  perform public.notify(r.artist_id, 'account', '🔥 Boost ou an aktive!',
    'Boost ' || coalesce(v_label, '') || ' aktif jiska ' || to_char(v_until at time zone 'America/Port-au-Prince', 'DD/MM/YYYY') || '. Fanatik yo ap wè l an premye!',
    case when r.boost_type = 'mizik' then '/chante/' || r.target_id::text else '/atis/' || r.artist_id::text end);

  return v_until;
end;
$$;

revoke execute on function public.review_boost(uuid, boolean, text) from public, anon;
grant execute on function public.review_boost(uuid, boolean, text) to authenticated;
