-- =====================================================================
-- UpMizik: finans — pataj 85% atis / 15% platfòm, balans, ak retrè
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KOMISYON SOU CHAK DON
--    Pousantaj la anrejistre sou chak don: si l chanje pita,
--    ansyen don yo kenbe pousantaj yo te genyen an.
-- ---------------------------------------------------------------------
alter table public.donations
  add column platform_fee_percent numeric(5, 2) not null default 15
    check (platform_fee_percent between 0 and 100),
  add column artist_share_htg numeric(12, 2)
    generated always as (round(amount_htg * (100 - platform_fee_percent) / 100, 2)) stored,
  add column platform_share_htg numeric(12, 2)
    generated always as (amount_htg - round(amount_htg * (100 - platform_fee_percent) / 100, 2)) stored;

-- Yon donatè pa ka chwazi pwòp komisyon li: se toujou 15% (sof si se yon admin)
create function public.enforce_platform_fee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    new.platform_fee_percent := 15;
  end if;
  return new;
end;
$$;

create trigger donations_enforce_fee
  before insert on public.donations
  for each row execute function public.enforce_platform_fee();

-- ---------------------------------------------------------------------
-- 2. RETRÈ (PAYOUTS)
-- ---------------------------------------------------------------------
create type public.payout_status as enum ('pending', 'paid', 'rejected');

create table public.payouts (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references public.profiles (id) on delete cascade,
  method       public.donation_method not null,
  phone        text not null check (char_length(phone) between 8 and 20),
  amount_htg   numeric(12, 2) not null check (amount_htg > 0),
  status       public.payout_status not null default 'pending',
  reference    text check (char_length(reference) <= 100),   -- nimewo referans transfè a
  admin_note   text check (char_length(admin_note) <= 500),  -- rezon si l rejte
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at   timestamptz not null default now(),
  -- Yon retrè "peye" dwe gen yon referans; yon retrè "rejte" dwe gen yon rezon
  check (status <> 'paid' or reference is not null),
  check (status <> 'rejected' or admin_note is not null)
);

create index payouts_artist_id_idx on public.payouts (artist_id, created_at desc);
create index payouts_status_idx on public.payouts (status, created_at);

alter table public.payouts enable row level security;

-- Atis la wè pwòp retrè li; admin wè tout
create policy "Atis wè pwòp retrè li"
  on public.payouts for select
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- Se sèlman admin ki ka make yon retrè "peye" oswa "rejte"
create policy "Admin trete retrè yo"
  on public.payouts for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- PA GEN règ "insert": atis yo DWE pase pa fonksyon request_payout() anba a,
-- ki verifye balans lan.

-- ---------------------------------------------------------------------
-- 3. BALANS YON ATIS (an goud)
--    disponib = 85% don apwouve yo − retrè peye − retrè k ap tann
-- ---------------------------------------------------------------------
create function public.artist_balance(p_artist_id uuid)
returns table (
  earned_htg     numeric,
  paid_htg       numeric,
  pending_htg    numeric,
  available_htg  numeric,
  donation_count bigint
)
language sql
stable
security definer set search_path = ''
as $$
  with e as (
    select coalesce(sum(artist_share_htg), 0) as earned, count(*) as cnt
    from public.donations
    where artist_id = p_artist_id and status = 'verified'
  ), p as (
    select coalesce(sum(amount_htg) filter (where status = 'paid'), 0) as paid,
           coalesce(sum(amount_htg) filter (where status = 'pending'), 0) as pending
    from public.payouts
    where artist_id = p_artist_id
  )
  select e.earned, p.paid, p.pending, e.earned - p.paid - p.pending, e.cnt
  from e, p
  -- Sèlman atis la li menm oswa yon admin ka wè balans lan
  where p_artist_id = auth.uid() or public.is_admin();
$$;

revoke execute on function public.artist_balance(uuid) from public, anon;
grant execute on function public.artist_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. ISTWA DON YON ATIS (san enfòmasyon kontak donatè yo)
-- ---------------------------------------------------------------------
create function public.my_donations()
returns table (
  id               uuid,
  donor_name       text,
  message          text,
  song_title       text,
  method           public.donation_method,
  amount_usd       numeric,
  amount_htg       numeric,
  artist_share_htg numeric,
  received_at      timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select d.id, d.donor_name, d.message, s.title, d.method, d.amount_usd, d.amount_htg,
         d.artist_share_htg, coalesce(d.reviewed_at, d.created_at)
  from public.donations d
  left join public.songs s on s.id = d.song_id
  where d.artist_id = auth.uid() and d.status = 'verified'
  order by coalesce(d.reviewed_at, d.created_at) desc;
$$;

revoke execute on function public.my_donations() from public, anon;
grant execute on function public.my_donations() to authenticated;

-- ---------------------------------------------------------------------
-- 5. MANDE YON RETRÈ
--    Verifye: atis apwouve, montan ≥ 500 goud, montan ≤ balans disponib.
--    Kadna a (advisory lock) anpeche 2 demann an menm tan depase balans lan.
-- ---------------------------------------------------------------------
create function public.request_payout(p_method public.donation_method, p_phone text, p_amount_htg numeric)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_available numeric;
  v_id        uuid;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'artist' and status = 'approved') then
    raise exception 'Se sèlman atis apwouve ki ka mande yon retrè';
  end if;
  if p_amount_htg is null or p_amount_htg < 500 then
    raise exception 'Montan minimòm pou yon retrè se 500 goud';
  end if;
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 8 then
    raise exception 'Nimewo telefòn nan pa valid';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select available_htg into v_available from public.artist_balance(v_uid);
  if p_amount_htg > coalesce(v_available, 0) then
    raise exception 'Montan an depase balans disponib ou (% goud)', coalesce(v_available, 0);
  end if;

  insert into public.payouts (artist_id, method, phone, amount_htg)
  values (v_uid, p_method, trim(p_phone), round(p_amount_htg, 2))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.request_payout(public.donation_method, text, numeric) from public, anon;
grant execute on function public.request_payout(public.donation_method, text, numeric) to authenticated;
