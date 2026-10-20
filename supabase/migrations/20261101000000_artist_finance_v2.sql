-- =====================================================================
-- UpMizik: finans v2
--   • 85% pataje ant atis la ak kolaboratè yo (splits), UpMizik peye kolaboratè yo dirèkteman
--   • $0.99 pa mwa (143.55 goud) sou pa atis la, sèlman pou mwa li touche
--   • Lajan yon mwa disponib depi mwa a fini; retrè posib 3 mwa apre apwobasyon
--   • PIN pou konfime chak retrè; nimewo telefòn atis la prive
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Règ yo (yon sèl kote)
create function public.monthly_fee_htg() returns numeric language sql immutable as $$ select 143.55::numeric $$;  -- $0.99 × 145
create function public.payout_wait_months() returns integer language sql immutable as $$ select 3 $$;

-- Kòmansman mwa sa a, dapre lè Ayiti
create function public.current_month_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', now() at time zone 'America/Port-au-Prince')) at time zone 'America/Port-au-Prince';
$$;

-- ---------------------------------------------------------------------
-- 1. DAT APWOBASYON (pou règ 3 mwa a)
-- ---------------------------------------------------------------------
alter table public.profiles add column approved_at timestamptz;
update public.profiles set approved_at = created_at where status = 'approved';

create function public.set_approved_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_set_approved_at
  before update of status on public.profiles
  for each row execute function public.set_approved_at();

-- ---------------------------------------------------------------------
-- 2. ENFÒMASYON PRIVE ATIS LA (telefòn + PIN chifre)
--    Tablo sa a pa lizib dirèkteman: sèlman atravè fonksyon yo.
-- ---------------------------------------------------------------------
create table public.artist_private (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  phone               text check (char_length(phone) between 8 and 20),
  pin_hash            text,
  pin_failed_attempts integer not null default 0,
  pin_locked_until    timestamptz,
  updated_at          timestamptz not null default now()
);

alter table public.artist_private enable row level security;  -- san règ = pèsonn pa ka li l dirèkteman

-- Nouvo atis: sove nimewo telefòn nan (soti nan fòm enskripsyon an)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  is_artist boolean := new.raw_user_meta_data ->> 'role' = 'artist';
  v_phone   text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, display_name, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when is_artist then 'artist'::public.user_role else 'listener'::public.user_role end,
    case when is_artist then 'pending'::public.account_status else 'approved'::public.account_status end
  );
  if is_artist then
    insert into public.artist_private (user_id, phone)
    values (new.id, case when char_length(v_phone) between 8 and 20 then v_phone end);
  end if;
  return new;
end;
$$;

-- Enfòmasyon prive pa m (san PIN nan)
create function public.my_private_info()
returns table (phone text, has_pin boolean, pin_locked_until timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select ap.phone, ap.pin_hash is not null, ap.pin_locked_until
  from public.artist_private ap
  where ap.user_id = auth.uid();
$$;

create function public.set_my_phone(p_phone text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 8 then
    raise exception 'Nimewo telefòn nan pa valid';
  end if;
  insert into public.artist_private (user_id, phone) values (auth.uid(), trim(p_phone))
  on conflict (user_id) do update set phone = excluded.phone, updated_at = now();
end;
$$;

-- Mete oswa chanje PIN nan (4 a 6 chif). Pou chanje l, fòk ou bay ansyen an.
create function public.set_withdrawal_pin(p_new_pin text, p_current_pin text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Ou dwe konekte';
  end if;
  if p_new_pin !~ '^\d{4,6}$' then
    raise exception 'PIN nan dwe gen 4 a 6 chif';
  end if;

  select pin_hash into v_hash from public.artist_private where user_id = auth.uid();
  if v_hash is not null and (p_current_pin is null or extensions.crypt(p_current_pin, v_hash) <> v_hash) then
    raise exception 'Ansyen PIN nan pa kòrèk';
  end if;

  insert into public.artist_private (user_id, pin_hash)
  values (auth.uid(), extensions.crypt(p_new_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, pin_failed_attempts = 0, pin_locked_until = null, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- 3. SPLITS: kolaboratè yo bezwen yon nimewo pou UpMizik peye yo
-- ---------------------------------------------------------------------
alter table public.song_splits
  add column collaborator_phone  text check (char_length(collaborator_phone) between 8 and 20),
  add column collaborator_method public.donation_method;

create or replace function public.set_song_splits(p_song_id uuid, p_splits jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.songs where id = p_song_id and artist_id = auth.uid()) then
    raise exception 'Chante sa a pa pou ou';
  end if;

  delete from public.song_splits where song_id = p_song_id;

  insert into public.song_splits (song_id, collaborator_name, collaborator_role, collaborator_email,
                                  collaborator_phone, collaborator_method, percentage)
  select p_song_id,
         trim(s ->> 'name'),
         trim(s ->> 'role'),
         nullif(trim(s ->> 'email'), ''),
         nullif(trim(s ->> 'phone'), ''),
         nullif(s ->> 'method', '')::public.donation_method,
         (s ->> 'percentage')::numeric
  from jsonb_array_elements(coalesce(p_splits, '[]'::jsonb)) as s;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. LIV KONT (earnings): konbyen CHAK moun touche sou chak don
--    Kreye otomatikman lè yon don valide, ak splits chante a nan moman sa a.
-- ---------------------------------------------------------------------
create type public.earning_kind as enum ('artist', 'collaborator');

create table public.earnings (
  id                  uuid primary key default gen_random_uuid(),
  donation_id         uuid not null references public.donations (id) on delete cascade,
  artist_id           uuid not null references public.profiles (id) on delete cascade,
  kind                public.earning_kind not null,
  collaborator_name   text,
  collaborator_role   text,
  collaborator_phone  text,
  collaborator_method public.donation_method,
  collaborator_email  text,
  percentage          numeric(5, 2) not null,   -- pousantaj nan 85% la
  amount_htg          numeric(12, 2) not null check (amount_htg >= 0),
  earned_at           timestamptz not null,
  paid_at             timestamptz,              -- pou kolaboratè yo: lè UpMizik peye yo
  paid_reference      text check (char_length(paid_reference) <= 100),
  paid_by             uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index earnings_artist_idx on public.earnings (artist_id, kind, earned_at);
create index earnings_unpaid_collab_idx on public.earnings (kind, paid_at) where kind = 'collaborator';
create index earnings_donation_idx on public.earnings (donation_id);

alter table public.earnings enable row level security;

-- Atis la wè liv kont chante li yo (pa l ak pa kolaboratè li yo); admin wè tout
create policy "Atis wè pwòp liv kont li"
  on public.earnings for select
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- Pataje yon don: kolaboratè yo dapre splits chante a, rès la pou atis la
create function public.create_donation_earnings(p_donation_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  d          record;
  v_collab   numeric := 0;
  v_pct      numeric := 0;
  s          record;
  v_amount   numeric;
begin
  select id, artist_id, song_id, artist_share_htg, coalesce(reviewed_at, created_at) as earned_at
  into d from public.donations where id = p_donation_id and status = 'verified';
  if d.id is null or exists (select 1 from public.earnings where donation_id = d.id) then
    return;
  end if;

  for s in
    select * from public.song_splits where song_id = d.song_id order by created_at
  loop
    v_amount := round(d.artist_share_htg * s.percentage / 100, 2);
    insert into public.earnings (donation_id, artist_id, kind, collaborator_name, collaborator_role,
                                 collaborator_phone, collaborator_method, collaborator_email,
                                 percentage, amount_htg, earned_at)
    values (d.id, d.artist_id, 'collaborator', s.collaborator_name, s.collaborator_role,
            s.collaborator_phone, s.collaborator_method, s.collaborator_email,
            s.percentage, v_amount, d.earned_at);
    v_collab := v_collab + v_amount;
    v_pct := v_pct + s.percentage;
  end loop;

  insert into public.earnings (donation_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (d.id, d.artist_id, 'artist', 100 - v_pct, d.artist_share_htg - v_collab, d.earned_at);
end;
$$;

revoke execute on function public.create_donation_earnings(uuid) from public, anon, authenticated;

-- Trigger la rele "donations_earnings" pou l kouri ANVAN "donations_notify" (lòd alfabetik)
create function public.donations_earnings_trigger()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    perform public.create_donation_earnings(new.id);
  elsif old.status = 'verified' and new.status <> 'verified' then
    delete from public.earnings where donation_id = new.id and paid_at is null;
  end if;
  return new;
end;
$$;

create trigger donations_earnings
  after update of status on public.donations
  for each row execute function public.donations_earnings_trigger();

-- Don ki te deja valide yo: kreye liv kont yo kounye a
select public.create_donation_earnings(id) from public.donations where status = 'verified';

-- Mesaj "Ou resevwa yon don" la montre pa atis la APRE splits
create or replace function public.notify_donation_verified()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song  text;
  v_share numeric;
begin
  if new.status = 'verified' and old.status <> 'verified' then
    select title into v_song from public.songs where id = new.song_id;
    select coalesce(sum(amount_htg), 0) into v_share
    from public.earnings where donation_id = new.id and kind = 'artist';

    perform public.notify(new.artist_id, 'donation', '💝 Ou resevwa yon don!',
      coalesce(nullif(trim(new.donor_name), ''), 'Yon fanatik') || ' voye $' || public.fmt_money(new.amount_usd)
        || ' (' || public.fmt_money(new.amount_htg) || ' goud)'
        || coalesce(' pou chante « ' || v_song || ' »', '') || '.'
        || E'\nPa w: ' || public.fmt_money(v_share) || ' goud. L ap disponib pou retrè depi mwa sa a fini.'
        || coalesce(E'\n\nMesaj: « ' || nullif(trim(new.message), '') || ' »', ''),
      '/dashboard/finans');
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. BALANS ATIS LA (v2)
-- ---------------------------------------------------------------------
drop function public.artist_balance(uuid);

create function public.artist_balance(p_artist_id uuid)
returns table (
  earned_htg         numeric,     -- tout pa atis la depi l kòmanse (apre splits)
  current_month_htg  numeric,     -- mwa sa a: poko disponib
  fees_htg           numeric,     -- total $0.99 pa mwa yo
  paid_htg           numeric,
  pending_htg        numeric,
  available_htg      numeric,     -- sa l ka retire kounye a
  donation_count     bigint,
  eligible_from      timestamptz  -- dat li ka kòmanse retire (3 mwa apre apwobasyon)
)
language sql
stable
security definer set search_path = ''
as $$
  with mine as (
    select e.amount_htg, e.earned_at, e.donation_id
    from public.earnings e
    where e.artist_id = p_artist_id and e.kind = 'artist'
  ), months as (
    -- Mwa ki FINI yo: frè a se $0.99, men li pa ka depase sa atis la touche mwa sa a
    select date_trunc('month', earned_at at time zone 'America/Port-au-Prince') as m, sum(amount_htg) as total
    from mine
    where earned_at < public.current_month_start()
    group by 1
  ), p as (
    select coalesce(sum(amount_htg) filter (where status = 'paid'), 0) as paid,
           coalesce(sum(amount_htg) filter (where status = 'pending'), 0) as pending
    from public.payouts where artist_id = p_artist_id
  )
  select
    coalesce((select sum(amount_htg) from mine), 0),
    coalesce((select sum(amount_htg) from mine where earned_at >= public.current_month_start()), 0),
    coalesce((select sum(least(total, public.monthly_fee_htg())) from months), 0),
    p.paid,
    p.pending,
    coalesce((select sum(total - least(total, public.monthly_fee_htg())) from months), 0) - p.paid - p.pending,
    (select count(distinct donation_id) from mine),
    (select pr.approved_at + make_interval(months => public.payout_wait_months())
     from public.profiles pr where pr.id = p_artist_id)
  from p
  where public.can_see_stats(p_artist_id);
$$;

revoke execute on function public.artist_balance(uuid) from public, anon;
grant execute on function public.artist_balance(uuid) to authenticated;

-- Istwa don yo ak pa atis la APRE splits
drop function public.my_donations();

create function public.my_donations()
returns table (
  id               uuid,
  donor_name       text,
  message          text,
  song_title       text,
  method           public.donation_method,
  amount_usd       numeric,
  amount_htg       numeric,
  my_share_htg     numeric,
  collab_share_htg numeric,
  received_at      timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select d.id, d.donor_name, d.message, s.title, d.method, d.amount_usd, d.amount_htg,
         coalesce(sum(e.amount_htg) filter (where e.kind = 'artist'), 0),
         coalesce(sum(e.amount_htg) filter (where e.kind = 'collaborator'), 0),
         coalesce(d.reviewed_at, d.created_at)
  from public.donations d
  left join public.songs s on s.id = d.song_id
  left join public.earnings e on e.donation_id = d.id
  where d.artist_id = auth.uid() and d.status = 'verified'
  group by d.id, s.title
  order by coalesce(d.reviewed_at, d.created_at) desc;
$$;

revoke execute on function public.my_donations() from public, anon;
grant execute on function public.my_donations() to authenticated;

-- ---------------------------------------------------------------------
-- 6. MANDE YON RETRÈ (v2): règ 3 mwa + PIN
--    Retounen { ok, error } olye leve yon erè, pou kontè move PIN yo pa anile.
-- ---------------------------------------------------------------------
drop function public.request_payout(public.donation_method, text, numeric);

create function public.request_payout(p_method public.donation_method, p_phone text, p_amount_htg numeric, p_pin text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_priv public.artist_private%rowtype;
  v_bal  record;
  v_id   uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Ou dwe konekte');
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'artist' and status = 'approved') then
    return jsonb_build_object('ok', false, 'error', 'Se sèlman atis apwouve ki ka mande yon retrè');
  end if;

  -- PIN nan
  select * into v_priv from public.artist_private where user_id = v_uid for update;
  if v_priv.pin_hash is null then
    return jsonb_build_object('ok', false, 'error', 'Ou dwe kreye yon PIN retrè anvan');
  end if;
  if v_priv.pin_locked_until is not null and v_priv.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'error',
      'Twòp move PIN. Eseye ankò apre ' || to_char(v_priv.pin_locked_until at time zone 'America/Port-au-Prince', 'HH24:MI'));
  end if;
  if p_pin is null or extensions.crypt(p_pin, v_priv.pin_hash) <> v_priv.pin_hash then
    update public.artist_private
    set pin_failed_attempts = pin_failed_attempts + 1,
        pin_locked_until = case when pin_failed_attempts + 1 >= 5 then now() + interval '30 minutes' end
    where user_id = v_uid;
    return jsonb_build_object('ok', false, 'error',
      case when v_priv.pin_failed_attempts + 1 >= 5
        then 'PIN nan pa kòrèk. Retrè yo bloke pou 30 minit.'
        else 'PIN nan pa kòrèk (' || (5 - v_priv.pin_failed_attempts - 1) || ' tantativ ki rete)' end);
  end if;
  update public.artist_private set pin_failed_attempts = 0, pin_locked_until = null where user_id = v_uid;

  -- Montan ak telefòn
  if p_amount_htg is null or p_amount_htg < 500 then
    return jsonb_build_object('ok', false, 'error', 'Montan minimòm pou yon retrè se 500 goud');
  end if;
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Nimewo telefòn nan pa valid');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select * into v_bal from public.artist_balance(v_uid);

  -- Règ 3 mwa a
  if v_bal.eligible_from is null or v_bal.eligible_from > now() then
    return jsonb_build_object('ok', false, 'error',
      'Ou ka mande retrè apati ' || to_char(v_bal.eligible_from at time zone 'America/Port-au-Prince', 'DD/MM/YYYY')
        || ' (3 mwa apre kont ou apwouve)');
  end if;
  if p_amount_htg > coalesce(v_bal.available_htg, 0) then
    return jsonb_build_object('ok', false, 'error',
      'Montan an depase balans disponib ou (' || public.fmt_money(coalesce(v_bal.available_htg, 0)) || ' goud)');
  end if;

  insert into public.payouts (artist_id, method, phone, amount_htg)
  values (v_uid, p_method, trim(p_phone), round(p_amount_htg, 2))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function public.request_payout(public.donation_method, text, numeric, text) from public, anon;
grant execute on function public.request_payout(public.donation_method, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. ADMIN: PEYE KOLABORATÈ YO
-- ---------------------------------------------------------------------
-- Sa UpMizik dwe chak kolaboratè (sèlman lajan mwa ki fini yo)
create function public.admin_collaborator_dues()
returns table (
  artist_id           uuid,
  artist_name         text,
  collaborator_name   text,
  collaborator_role   text,
  collaborator_phone  text,
  collaborator_method public.donation_method,
  amount_htg          numeric,
  earning_count       bigint,
  oldest              timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select e.artist_id, a.display_name, e.collaborator_name, max(e.collaborator_role),
         e.collaborator_phone, e.collaborator_method,
         sum(e.amount_htg), count(*), min(e.earned_at)
  from public.earnings e
  join public.profiles a on a.id = e.artist_id
  where e.kind = 'collaborator'
    and e.paid_at is null
    and e.earned_at < public.current_month_start()
    and public.is_admin()
  group by e.artist_id, a.display_name, e.collaborator_name, e.collaborator_phone, e.collaborator_method
  order by min(e.earned_at);
$$;

-- Make tout sa yo dwe yon kolaboratè (pou yon atis) kòm peye
create function public.mark_collaborator_paid(p_artist_id uuid, p_name text, p_phone text, p_reference text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fè sa';
  end if;
  if coalesce(trim(p_reference), '') = '' then
    raise exception 'Mete nimewo referans transfè a';
  end if;

  update public.earnings
  set paid_at = now(), paid_reference = trim(p_reference), paid_by = auth.uid()
  where kind = 'collaborator'
    and paid_at is null
    and earned_at < public.current_month_start()
    and artist_id = p_artist_id
    and collaborator_name = p_name
    and collaborator_phone is not distinct from p_phone;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.my_private_info() from public, anon;
revoke execute on function public.set_my_phone(text) from public, anon;
revoke execute on function public.set_withdrawal_pin(text, text) from public, anon;
revoke execute on function public.admin_collaborator_dues() from public, anon;
revoke execute on function public.mark_collaborator_paid(uuid, text, text, text) from public, anon;
grant execute on function public.my_private_info() to authenticated;
grant execute on function public.set_my_phone(text) to authenticated;
grant execute on function public.set_withdrawal_pin(text, text) to authenticated;
grant execute on function public.admin_collaborator_dues() to authenticated;
grant execute on function public.mark_collaborator_paid(uuid, text, text, text) to authenticated;
