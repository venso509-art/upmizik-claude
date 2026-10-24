-- =====================================================================
-- SISTÈM LIVE UPMIZIK (tankou TikTok Live)
--  1. Paramèt (valè kredi, pousantaj atis la) + blokaj live sou pwofil yo
--  2. Kredi: bous chak moun, istwa tranzaksyon, acha ak MonCash/NatCash (admin valide)
--  3. Kado: katalòg (Rose, Lyon, Avyon...) + kado voye nan live yo (60% atis / 40% UpMizik)
--  4. Live yo: kòmanse / fini / "batman kè", espektatè, like (tap san limit), chat
--  5. Monte sou sèn (co-host): demann atis, aksepte/refize, kapasite dapre like ak kado
--  6. Istwa ak revni live pou atis la; Admin: tout live yo + bloke yon atis X jou
-- Videyo a li menm pase pa LiveKit Cloud (kle yo nan Coolify, pa nan baz done a).
-- =====================================================================

alter type public.notification_type add value if not exists 'live';

-- ---------------------------------------------------------------------
-- 1. PARAMÈT + BLOKAJ
-- ---------------------------------------------------------------------
alter table public.settings
  add column credit_htg          numeric(10, 2) not null default 1  check (credit_htg > 0),           -- 1 kredi = 1 goud
  add column live_artist_percent numeric(5, 2)  not null default 60 check (live_artist_percent between 0 and 100);

alter table public.profiles
  add column live_banned_until timestamptz,
  add column live_ban_reason   text check (char_length(live_ban_reason) <= 300);

-- Gad pwofil la: menm règ yo, plis blokaj live la (admin sèlman)
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
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Se sèlman admin ki ka verifye yon kont';
    end if;
    if new.pro_until is distinct from old.pro_until then
      raise exception 'Se sèlman peman Pro a ki ka chanje sa';
    end if;
    if new.live_banned_until is distinct from old.live_banned_until or new.live_ban_reason is distinct from old.live_ban_reason then
      raise exception 'Se sèlman admin ki ka chanje blokaj live la';
    end if;
    if new.featured_song_id is distinct from old.featured_song_id and new.featured_song_id is not null then
      if not coalesce(old.pro_until > now(), false) then
        raise exception 'Chante an vedèt la se pou atis Pro yo';
      end if;
      if not exists (select 1 from public.songs
                     where id = new.featured_song_id and artist_id = new.id and archived_at is null) then
        raise exception 'Chante sa a pa pou ou';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. KREDI
-- ---------------------------------------------------------------------
create table public.credit_wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  delta         integer not null,
  balance_after integer not null,
  kind          text not null check (kind in ('topup', 'gift', 'refund', 'admin')),
  ref_id        uuid,
  note          text check (char_length(note) <= 200),
  created_at    timestamptz not null default now()
);

create index credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);

alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;

create policy "Moun nan wè bous li" on public.credit_wallets
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "Moun nan wè tranzaksyon li yo" on public.credit_transactions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- Ajoute oswa retire kredi (fonksyon entèn: pèsonn pa ka rele l dirèkteman)
create function public.add_credits(p_user uuid, p_delta integer, p_kind text, p_ref uuid, p_note text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_balance integer;
begin
  insert into public.credit_wallets (user_id, balance) values (p_user, 0) on conflict (user_id) do nothing;
  update public.credit_wallets
  set balance = balance + p_delta, updated_at = now()
  where user_id = p_user and balance + p_delta >= 0
  returning balance into v_balance;
  if v_balance is null then
    raise exception 'Ou pa gen ase kredi. Achte kredi sou paj Kredi a.';
  end if;
  insert into public.credit_transactions (user_id, delta, balance_after, kind, ref_id, note)
  values (p_user, p_delta, v_balance, p_kind, p_ref, p_note);
  return v_balance;
end;
$$;

revoke execute on function public.add_credits(uuid, integer, text, uuid, text) from public, anon, authenticated;

-- Acha kredi ak MonCash/NatCash: prèv peman → admin valide → kredi yo antre
create table public.credit_purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  credits         integer not null check (credits between 10 and 100000),
  amount_htg      numeric(12, 2) not null check (amount_htg > 0),
  method          public.donation_method not null,
  transaction_ref text check (char_length(transaction_ref) <= 60),
  proof_path      text not null,
  status          public.donation_status not null default 'pending',
  admin_note      text check (char_length(admin_note) <= 500),
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index credit_purchases_status_idx on public.credit_purchases (status, created_at desc);
create index credit_purchases_user_idx on public.credit_purchases (user_id, created_at desc);

alter table public.credit_purchases enable row level security;

create policy "Moun nan wè acha kredi li yo, admin wè tout" on public.credit_purchases
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- Foto prèv la: donation-proofs/credits/<id moun nan>/
create policy "Voye prèv acha kredi"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-proofs'
    and (storage.foldername(name))[1] = 'credits'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create function public.request_credit_purchase(p_credits integer, p_method public.donation_method, p_transaction_ref text, p_proof_path text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  if p_credits is null or p_credits < 10 or p_credits > 100000 then
    raise exception 'Chwazi ant 10 ak 100 000 kredi';
  end if;
  if p_proof_path is null or p_proof_path not like 'credits/' || v_uid::text || '/%' then
    raise exception 'Foto prèv la pa valid';
  end if;
  if (select count(*) from public.credit_purchases where user_id = v_uid and status = 'pending') >= 5 then
    raise exception 'Ou gen 5 acha k ap tann deja. Tann ekip la valide yo.';
  end if;
  insert into public.credit_purchases (user_id, credits, amount_htg, method, transaction_ref, proof_path)
  values (v_uid, p_credits, round(p_credits * (select credit_htg from public.settings where id), 2), p_method,
          nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path);
end;
$$;

revoke execute on function public.request_credit_purchase(integer, public.donation_method, text, text) from public, anon;
grant execute on function public.request_credit_purchase(integer, public.donation_method, text, text) to authenticated;

-- Son "ka-ching" pou admin yo
create function public.alert_admins_credit_purchase()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  select display_name into v_name from public.profiles where id = new.user_id;
  perform public.notify_admins('donation', '🪙 Nouvo acha kredi: ' || new.credits::text || ' kredi',
    coalesce(v_name, 'Yon moun') || ' voye ' || new.amount_htg::text || ' goud. Verifye prèv la.', '/admin/kredi');
  return new;
end;
$$;

create trigger credit_purchases_alert_admins
  after insert on public.credit_purchases
  for each row execute function public.alert_admins_credit_purchase();

create function public.review_credit_purchase(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  r public.credit_purchases;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into r from public.credit_purchases where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Acha sa a pa egziste oswa li deja trete';
  end if;
  if p_approve then
    update public.credit_purchases set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    perform public.add_credits(r.user_id, r.credits, 'topup', r.id, 'Acha ' || r.method::text);
    perform public.notify(r.user_id, 'account', '🪙 ' || r.credits::text || ' kredi ajoute!',
      'Ekip UpMizik la valide acha ou. Ou ka voye kado nan live yo kounye a.', '/kredi');
  else
    if coalesce(trim(p_note), '') = '' then
      raise exception 'Ou dwe bay yon rezon pou rejte l';
    end if;
    update public.credit_purchases set status = 'rejected', admin_note = trim(p_note), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
    perform public.notify(r.user_id, 'account', '❌ Acha kredi ou pa valide', 'Rezon: ' || trim(p_note), '/kredi');
  end if;
end;
$$;

revoke execute on function public.review_credit_purchase(uuid, boolean, text) from public, anon;
grant execute on function public.review_credit_purchase(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. KATALÒG KADO YO
-- ---------------------------------------------------------------------
create table public.live_gift_types (
  id      text primary key,
  name    text not null,
  emoji   text not null,
  credits integer not null check (credits > 0),
  sort    integer not null default 0,
  active  boolean not null default true
);

alter table public.live_gift_types enable row level security;
create policy "Tout moun wè kado yo" on public.live_gift_types for select using (true);

insert into public.live_gift_types (id, name, emoji, credits, sort) values
  ('rose',     'Woz',      '🌹', 5,    1),
  ('kafe',     'Kafe',     '☕', 10,   2),
  ('konpa',    'Konpa',    '🎶', 20,   3),
  ('tanbou',   'Tanbou',   '🥁', 30,   4),
  ('lyon',     'Lyon',     '🦁', 50,   5),
  ('kouwon',   'Kouwòn',   '👑', 75,   6),
  ('avyon',    'Avyon',    '✈️', 100,  7),
  ('fize',     'Fize',     '🚀', 200,  8),
  ('chato',    'Chato',    '🏰', 500,  9),
  ('diaman',   'Diaman',   '💎', 1000, 10);

-- ---------------------------------------------------------------------
-- 4. LIVE YO
-- ---------------------------------------------------------------------
create table public.lives (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references public.profiles (id) on delete cascade,
  title        text check (char_length(title) <= 100),
  status       text not null default 'live' check (status in ('live', 'ended', 'stopped')),
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  last_seen_at timestamptz not null default now(),   -- "batman kè" atis la (chak 20 segonn)
  peak_viewers integer not null default 0,
  viewers      integer not null default 0,            -- moun diferan ki konekte ki antre
  likes        bigint not null default 0,
  gifts_count  integer not null default 0,
  stop_reason  text check (char_length(stop_reason) <= 300)
);

create index lives_status_idx on public.lives (status, last_seen_at desc);
create index lives_artist_idx on public.lives (artist_id, started_at desc);

alter table public.lives enable row level security;
create policy "Tout moun wè live yo" on public.lives for select using (true);

-- Lajan chak live (atis la ak admin sèlman)
create table public.live_earnings_summary (
  live_id      uuid primary key references public.lives (id) on delete cascade,
  gift_credits bigint not null default 0,
  gift_htg     numeric(12, 2) not null default 0,
  artist_htg   numeric(12, 2) not null default 0,
  platform_htg numeric(12, 2) not null default 0
);

alter table public.live_earnings_summary enable row level security;
create policy "Atis la ak admin wè lajan live la" on public.live_earnings_summary
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.lives l where l.id = live_id and l.artist_id = (select auth.uid())));

-- Yon live "an dirèk" = status live + atis la te bay siy lavi nan 2 dènye minit yo
create function public.live_is_on(p_live public.lives)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_live.status = 'live' and p_live.last_seen_at > now() - interval '2 minutes';
$$;

-- Atis ki an live kounye a (pou ti pwen wouj la)
create function public.live_now()
returns table (live_id uuid, artist_id uuid, title text, started_at timestamptz, likes bigint, viewers integer)
language sql
stable
security definer set search_path = ''
as $$
  select l.id, l.artist_id, l.title, l.started_at, l.likes, l.viewers
  from public.lives l
  where l.status = 'live' and l.last_seen_at > now() - interval '2 minutes'
  order by l.started_at desc;
$$;

grant execute on function public.live_now() to anon, authenticated;

create function public.start_live(p_title text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_id   uuid;
  v_ban  timestamptz;
  v_recent boolean;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  select display_name, live_banned_until into v_name, v_ban from public.profiles
  where id = v_uid and role = 'artist' and status = 'approved' and archived_at is null;
  if not found then
    raise exception 'Se atis ki apwouve yo sèlman ki ka fè live';
  end if;
  if not public.is_pro(v_uid) then
    raise exception 'Live yo se pou atis Pro yo sèlman';
  end if;
  if v_ban is not null and v_ban > now() then
    raise exception 'Ou bloke pou live jiska %', to_char(v_ban at time zone 'America/Port-au-Prince', 'DD/MM/YYYY HH24:MI');
  end if;

  v_recent := exists (select 1 from public.lives where artist_id = v_uid and started_at > now() - interval '1 hour');
  -- Yon sèl live alafwa
  update public.lives set status = 'ended', ended_at = coalesce(ended_at, now())
  where artist_id = v_uid and status = 'live';

  insert into public.lives (artist_id, title) values (v_uid, nullif(trim(coalesce(p_title, '')), ''))
  returning id into v_id;
  insert into public.live_earnings_summary (live_id) values (v_id);

  -- Notifikasyon pou tout moun (pa plis pase 1 fwa pa èdtan pou menm atis la)
  if not v_recent then
    perform public.notify(p.id, 'live', '🔴 ' || coalesce(v_name, 'Yon atis') || ' ap fè live kounye a!',
      coalesce(nullif(trim(coalesce(p_title, '')), ''), 'Vin gade l epi voye yon kado!'), '/live/' || v_id::text)
    from public.profiles p
    where p.id <> v_uid and p.status = 'approved' and p.archived_at is null;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.start_live(text) from public, anon;
grant execute on function public.start_live(text) to authenticated;

-- "Batman kè" atis la + kantite moun k ap gade kounye a
create function public.live_heartbeat(p_live uuid, p_watching integer)
returns void
language sql
security definer set search_path = ''
as $$
  update public.lives
  set last_seen_at = now(), peak_viewers = greatest(peak_viewers, least(greatest(coalesce(p_watching, 0), 0), 1000000))
  where id = p_live and artist_id = auth.uid() and status = 'live';
$$;

revoke execute on function public.live_heartbeat(uuid, integer) from public, anon;
grant execute on function public.live_heartbeat(uuid, integer) to authenticated;

create function public.end_live(p_live uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.lives set status = 'ended', ended_at = now()
  where id = p_live and status = 'live' and (artist_id = auth.uid() or public.is_admin());
  update public.live_guests set status = 'left', decided_at = now()
  where live_id = p_live and status in ('requested', 'accepted');
end;
$$;

revoke execute on function public.end_live(uuid) from public, anon;
grant execute on function public.end_live(uuid) to authenticated;

-- Moun ki konekte ki antre nan live la (yon fwa pa moun)
create table public.live_viewers (
  live_id   uuid not null references public.lives (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (live_id, user_id)
);

alter table public.live_viewers enable row level security;
create policy "Atis la ak admin wè espektatè yo" on public.live_viewers
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.lives l where l.id = live_id and l.artist_id = (select auth.uid())));

create function public.join_live(p_live uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  insert into public.live_viewers (live_id, user_id) values (p_live, v_uid) on conflict do nothing;
  if found then
    update public.lives set viewers = viewers + 1 where id = p_live and artist_id <> v_uid;
  end if;
end;
$$;

revoke execute on function public.join_live(uuid) from public, anon;
grant execute on function public.join_live(uuid) to authenticated;

-- Like: moun nan tape kantite fwa li vle (paj la voye yo an pake chak segonn: maks 30 pa pake)
create table public.live_like_counts (
  live_id uuid not null references public.lives (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  taps    bigint not null default 0,
  last_at timestamptz not null default now(),
  primary key (live_id, user_id)
);

alter table public.live_like_counts enable row level security;   -- pa gen règ: fonksyon an sèlman

create function public.like_live(p_live uuid, p_taps integer)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_taps integer := least(greatest(coalesce(p_taps, 1), 1), 30);
  v_last timestamptz;
  v_likes bigint;
begin
  if v_uid is null then
    raise exception 'Konekte pou w like live la';
  end if;
  select last_at into v_last from public.live_like_counts where live_id = p_live and user_id = v_uid;
  -- Anti-spam: yon pake pa segonn pou chak moun
  if v_last is not null and v_last > now() - interval '800 milliseconds' then
    select likes into v_likes from public.lives where id = p_live;
    return v_likes;
  end if;
  update public.lives set likes = likes + v_taps
  where id = p_live and status = 'live'
  returning likes into v_likes;
  if v_likes is null then
    raise exception 'Live sa a fini';
  end if;
  insert into public.live_like_counts (live_id, user_id, taps, last_at) values (p_live, v_uid, v_taps, now())
  on conflict (live_id, user_id) do update set taps = public.live_like_counts.taps + v_taps, last_at = now();
  return v_likes;
end;
$$;

revoke execute on function public.like_live(uuid, integer) from public, anon;
grant execute on function public.like_live(uuid, integer) to authenticated;

-- Chat live la
create table public.live_messages (
  id          uuid primary key default gen_random_uuid(),
  live_id     uuid not null references public.lives (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  sender_name text not null,
  body        text not null check (char_length(trim(body)) between 1 and 200),
  created_at  timestamptz not null default now()
);

create index live_messages_live_idx on public.live_messages (live_id, created_at);
alter table public.live_messages enable row level security;
create policy "Tout moun wè chat live la" on public.live_messages for select using (true);

create function public.send_live_message(p_live uuid, p_body text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'Konekte pou w ekri nan live la';
  end if;
  if not exists (select 1 from public.lives where id = p_live and status = 'live') then
    raise exception 'Live sa a fini';
  end if;
  if (select count(*) from public.live_messages where user_id = v_uid and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'Ou ap ekri twò vit. Tann yon ti moman.';
  end if;
  select display_name into v_name from public.profiles where id = v_uid;
  insert into public.live_messages (live_id, user_id, sender_name, body)
  values (p_live, v_uid, coalesce(v_name, 'Fanatik'), left(trim(p_body), 200));
end;
$$;

revoke execute on function public.send_live_message(uuid, text) from public, anon;
grant execute on function public.send_live_message(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. KADO VOYE NAN LIVE YO (60% atis / 40% UpMizik)
-- ---------------------------------------------------------------------
create table public.live_gifts (
  id          uuid primary key default gen_random_uuid(),
  live_id     uuid not null references public.lives (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  sender_name text not null,
  gift_id     text not null references public.live_gift_types (id),
  quantity    integer not null default 1 check (quantity between 1 and 99),
  credits     integer not null check (credits > 0),
  created_at  timestamptz not null default now()
);

create index live_gifts_live_idx on public.live_gifts (live_id, created_at);
alter table public.live_gifts enable row level security;
create policy "Tout moun wè kado live yo" on public.live_gifts for select using (true);

-- Revni atis la antre nan menm kont lan (balans + retrè), men li make kòm "live"
alter table public.earnings alter column donation_id drop not null;
alter table public.earnings add column live_gift_id uuid references public.live_gifts (id) on delete cascade;
alter table public.earnings add constraint earnings_source_check check (num_nonnulls(donation_id, live_gift_id) = 1);
create index earnings_live_gift_idx on public.earnings (live_gift_id) where live_gift_id is not null;

create function public.send_gift(p_live uuid, p_gift text, p_quantity integer)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_live    public.lives;
  v_gift    public.live_gift_types;
  v_qty     integer := least(greatest(coalesce(p_quantity, 1), 1), 99);
  v_cost    integer;
  v_htg     numeric;
  v_pct     numeric;
  v_artist  numeric;
  v_name    text;
  v_id      uuid;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Konekte pou w voye kado';
  end if;
  select * into v_live from public.lives where id = p_live and status = 'live';
  if not found then
    raise exception 'Live sa a fini';
  end if;
  if v_live.artist_id = v_uid then
    raise exception 'Ou pa ka voye kado bay tèt ou';
  end if;
  select * into v_gift from public.live_gift_types where id = p_gift and active;
  if not found then
    raise exception 'Kado sa a pa egziste';
  end if;

  v_cost := v_gift.credits * v_qty;
  select round(v_cost * credit_htg, 2), live_artist_percent into v_htg, v_pct from public.settings where id;
  v_artist := round(v_htg * v_pct / 100, 2);
  select display_name into v_name from public.profiles where id = v_uid;

  insert into public.live_gifts (live_id, sender_id, sender_name, gift_id, quantity, credits)
  values (p_live, v_uid, coalesce(v_name, 'Fanatik'), p_gift, v_qty, v_cost)
  returning id into v_id;

  v_balance := public.add_credits(v_uid, -v_cost, 'gift', v_id, v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text);

  insert into public.earnings (live_gift_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (v_id, v_live.artist_id, 'artist', v_pct, v_artist, now());

  update public.lives set gifts_count = gifts_count + v_qty where id = p_live;
  update public.live_earnings_summary
  set gift_credits = gift_credits + v_cost, gift_htg = gift_htg + v_htg,
      artist_htg = artist_htg + v_artist, platform_htg = platform_htg + (v_htg - v_artist)
  where live_id = p_live;

  return v_balance;
end;
$$;

revoke execute on function public.send_gift(uuid, text, integer) from public, anon;
grant execute on function public.send_gift(uuid, text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 6. MONTE SOU SÈN (co-host)
-- ---------------------------------------------------------------------
create table public.live_guests (
  id         uuid primary key default gen_random_uuid(),
  live_id    uuid not null references public.lives (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  guest_name text not null,
  status     text not null default 'requested' check (status in ('requested', 'accepted', 'rejected', 'left', 'removed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index live_guests_open_idx on public.live_guests (live_id, user_id) where status in ('requested', 'accepted');
alter table public.live_guests enable row level security;
create policy "Tout moun wè sèn live la" on public.live_guests for select using (true);

-- Kapasite sèn nan: 1 envite; 100 like → 2; 100 like + $5 kado (an goud) → 5
create function public.live_capacity(p_live uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select case
    when l.likes >= 100 and coalesce(s.gift_htg, 0) >= 5 * (select htg_per_usd from public.settings where id) then 5
    when l.likes >= 100 then 2
    else 1
  end
  from public.lives l
  left join public.live_earnings_summary s on s.live_id = l.id
  where l.id = p_live;
$$;

grant execute on function public.live_capacity(uuid) to anon, authenticated;

create function public.request_join_live(p_live uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'Konekte pou w mande monte';
  end if;
  select display_name into v_name from public.profiles
  where id = v_uid and role = 'artist' and status = 'approved' and archived_at is null;
  if not found then
    raise exception 'Se atis yo sèlman ki ka mande monte nan yon live';
  end if;
  if not exists (select 1 from public.lives where id = p_live and status = 'live' and artist_id <> v_uid) then
    raise exception 'Ou pa ka monte nan live sa a';
  end if;
  if exists (select 1 from public.live_guests where live_id = p_live and user_id = v_uid and status in ('requested', 'accepted')) then
    raise exception 'Ou gen yon demann k ap tann deja';
  end if;
  if (select count(*) from public.live_guests where live_id = p_live and user_id = v_uid and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Tann yon ti moman anvan w mande ankò';
  end if;
  insert into public.live_guests (live_id, user_id, guest_name) values (p_live, v_uid, coalesce(v_name, 'Atis'));
end;
$$;

revoke execute on function public.request_join_live(uuid) from public, anon;
grant execute on function public.request_join_live(uuid) to authenticated;

-- Atis k ap fè live la aksepte oswa refize. Si sèn nan plen e kapasite a se 1: moun ki la a desann, nouvo a monte.
create function public.respond_join_live(p_guest uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  g public.live_guests;
  v_cap integer;
  v_on  integer;
begin
  select * into g from public.live_guests where id = p_guest and status = 'requested' for update;
  if not found then
    raise exception 'Demann sa a pa egziste ankò';
  end if;
  if not exists (select 1 from public.lives where id = g.live_id and artist_id = auth.uid() and status = 'live') then
    raise exception 'Se atis k ap fè live la sèlman ki ka reponn';
  end if;
  if not p_accept then
    update public.live_guests set status = 'rejected', decided_at = now() where id = p_guest;
    return;
  end if;

  v_cap := public.live_capacity(g.live_id);
  select count(*) into v_on from public.live_guests where live_id = g.live_id and status = 'accepted';
  if v_on >= v_cap then
    if v_cap = 1 then
      update public.live_guests set status = 'left', decided_at = now()
      where live_id = g.live_id and status = 'accepted';
    else
      raise exception 'Sèn nan plen (% moun). Retire yon moun anvan.', v_cap;
    end if;
  end if;
  update public.live_guests set status = 'accepted', decided_at = now() where id = p_guest;
end;
$$;

revoke execute on function public.respond_join_live(uuid, boolean) from public, anon;
grant execute on function public.respond_join_live(uuid, boolean) to authenticated;

-- Envite a desann pou kont li, oswa atis la retire l
create function public.leave_live_stage(p_guest uuid)
returns void
language sql
security definer set search_path = ''
as $$
  update public.live_guests g
  set status = case when g.user_id = auth.uid() then 'left' else 'removed' end, decided_at = now()
  where g.id = p_guest and g.status in ('requested', 'accepted')
    and (g.user_id = auth.uid() or exists (select 1 from public.lives l where l.id = g.live_id and l.artist_id = auth.uid()));
$$;

revoke execute on function public.leave_live_stage(uuid) from public, anon;
grant execute on function public.leave_live_stage(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. ISTWA AK REVNI LIVE (atis la)
-- ---------------------------------------------------------------------
create function public.my_live_history()
returns table (
  live_id uuid, title text, status text, started_at timestamptz, ended_at timestamptz,
  peak_viewers integer, viewers integer, likes bigint, gifts_count integer,
  gift_credits bigint, gift_htg numeric, artist_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  select l.id, l.title, l.status, l.started_at, l.ended_at, l.peak_viewers, l.viewers, l.likes, l.gifts_count,
         coalesce(s.gift_credits, 0), coalesce(s.gift_htg, 0), coalesce(s.artist_htg, 0)
  from public.lives l
  left join public.live_earnings_summary s on s.live_id = l.id
  where l.artist_id = auth.uid()
  order by l.started_at desc
  limit 200;
$$;

revoke execute on function public.my_live_history() from public, anon;
grant execute on function public.my_live_history() to authenticated;

-- Detay kado yon live (atis la oswa admin)
create function public.live_gift_breakdown(p_live uuid)
returns table (gift_id text, emoji text, name text, quantity bigint, credits bigint, senders bigint)
language sql
stable
security definer set search_path = ''
as $$
  select g.gift_id, t.emoji, t.name, sum(g.quantity), sum(g.credits), count(distinct g.sender_id)
  from public.live_gifts g
  join public.live_gift_types t on t.id = g.gift_id
  join public.lives l on l.id = g.live_id
  where g.live_id = p_live and (l.artist_id = auth.uid() or public.is_admin())
  group by g.gift_id, t.emoji, t.name, t.sort
  order by t.sort;
$$;

revoke execute on function public.live_gift_breakdown(uuid) from public, anon;
grant execute on function public.live_gift_breakdown(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. ADMIN: tout live yo + bloke yon atis X jou
-- ---------------------------------------------------------------------
create function public.admin_lives(p_limit integer default 100)
returns table (
  live_id uuid, artist_id uuid, artist_name text, title text, status text, is_on boolean,
  started_at timestamptz, ended_at timestamptz, peak_viewers integer, viewers integer, likes bigint,
  gifts_count integer, gift_htg numeric, artist_htg numeric, platform_htg numeric,
  live_banned_until timestamptz, stop_reason text
)
language sql
stable
security definer set search_path = ''
as $$
  select l.id, l.artist_id, p.display_name, l.title, l.status,
         l.status = 'live' and l.last_seen_at > now() - interval '2 minutes',
         l.started_at, l.ended_at, l.peak_viewers, l.viewers, l.likes, l.gifts_count,
         coalesce(s.gift_htg, 0), coalesce(s.artist_htg, 0), coalesce(s.platform_htg, 0),
         p.live_banned_until, l.stop_reason
  from public.lives l
  join public.profiles p on p.id = l.artist_id
  left join public.live_earnings_summary s on s.live_id = l.id
  where public.is_admin()
  order by (l.status = 'live') desc, l.started_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.admin_lives(integer) from public, anon;
grant execute on function public.admin_lives(integer) to authenticated;

create function public.admin_ban_live(p_artist uuid, p_days integer, p_reason text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Kantite jou a dwe ant 1 ak 3650';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Bay rezon blokaj la';
  end if;
  v_until := now() + make_interval(days => p_days);
  update public.profiles set live_banned_until = v_until, live_ban_reason = trim(p_reason) where id = p_artist;
  -- Kanpe live k ap fèt la
  update public.lives set status = 'stopped', ended_at = now(), stop_reason = trim(p_reason)
  where artist_id = p_artist and status = 'live';
  perform public.notify(p_artist, 'account', '⛔ Ou bloke pou live yo',
    'Ou pa ka fè live jiska ' || to_char(v_until at time zone 'America/Port-au-Prince', 'DD/MM/YYYY') || '. Rezon: ' || trim(p_reason), '/dashboard');
end;
$$;

revoke execute on function public.admin_ban_live(uuid, integer, text) from public, anon;
grant execute on function public.admin_ban_live(uuid, integer, text) to authenticated;

create function public.admin_unban_live(p_artist uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  update public.profiles set live_banned_until = null, live_ban_reason = null where id = p_artist;
end;
$$;

revoke execute on function public.admin_unban_live(uuid) from public, anon;
grant execute on function public.admin_unban_live(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 9. AN DIRÈK (Realtime): like, kado, chat, sèn nan
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['lives', 'live_gifts', 'live_messages', 'live_guests'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
