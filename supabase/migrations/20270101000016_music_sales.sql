-- =====================================================================
-- 🛒 VANN MIZIK AK KREDI
--  Atis la mete yon pri (an kredi; 1 kredi = 1 goud) sou yon chante, oswa sou tout yon pwojè
--  (album, EP, mixtape, demo). Li ka bloke acha chante youn pa youn: lè sa a se tout pwojè a pou moun achte.
--  Moun nan peye ak kredi li deja genyen: pa gen validasyon admin.
--  Pataj: 85 % pou atis yo (pwopriyetè + featuring + kolaboratè, menm jan ak yon don), 15 % pou UpMizik.
--  Koute a rete gratis; se telechajman fichye a ki peye. Mizik moun nan achte yo rete nan "Acha mwen yo".
-- =====================================================================

-- ---------- 1. Pri yo ----------
alter table public.songs
  add column if not exists sale_price integer check (sale_price between 10 and 50000); -- null = pa an vant pou kont li
alter table public.releases
  add column if not exists sale_price integer check (sale_price between 10 and 100000), -- null = pwojè a pa an vant
  add column if not exists sell_tracks boolean not null default true;                     -- false = se tout pwojè a sèlman

-- ---------- 2. Acha yo ----------
create table public.music_purchases (
  id                   uuid primary key default gen_random_uuid(),
  buyer_id             uuid references public.profiles (id) on delete set null, -- kont moun nan efase: atis la kenbe lajan l
  artist_id            uuid not null references public.profiles (id) on delete cascade,
  song_id              uuid references public.songs (id) on delete set null,
  release_id           uuid references public.releases (id) on delete set null,
  item_title           text not null,
  credits              integer not null check (credits > 0),
  amount_htg           numeric(12, 2) not null check (amount_htg > 0),
  platform_fee_percent numeric(5, 2) not null default 15,
  artist_share_htg     numeric(12, 2) generated always as (round(amount_htg * (100 - platform_fee_percent) / 100, 2)) stored,
  created_at           timestamptz not null default now(),
  check (num_nonnulls(song_id, release_id) <= 1)
);

create unique index music_purchases_song_once on public.music_purchases (buyer_id, song_id) where song_id is not null;
create unique index music_purchases_release_once on public.music_purchases (buyer_id, release_id) where release_id is not null;
create index music_purchases_artist_idx on public.music_purchases (artist_id, created_at desc);

alter table public.music_purchases enable row level security;
create policy "Moun ki achte a ak atis la wè acha yo" on public.music_purchases for select to authenticated
  using (buyer_id = (select auth.uid()) or artist_id = (select auth.uid()) or (select public.is_admin()));

alter table public.earnings add column purchase_id uuid references public.music_purchases (id) on delete cascade;
alter table public.earnings drop constraint earnings_source_check;
alter table public.earnings add constraint earnings_source_check
  check (num_nonnulls(donation_id, live_gift_id, song_gift_id, purchase_id) = 1);
create index earnings_purchase_idx on public.earnings (purchase_id) where purchase_id is not null;

alter table public.credit_transactions drop constraint credit_transactions_kind_check;
alter table public.credit_transactions add constraint credit_transactions_kind_check
  check (kind in ('topup', 'gift', 'refund', 'admin', 'purchase'));

-- ---------- 3. Èske yon chante an vant? Èske moun sa a ka telechaje l? ----------
create or replace function public.song_for_sale(p_song uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((
    select s.sale_price is not null or coalesce(r.sale_price is not null, false)
    from public.songs s left join public.releases r on r.id = s.release_id
    where s.id = p_song), false);
$$;

create or replace function public.can_download(p_song uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not public.song_for_sale(p_song)
    or exists (select 1 from public.songs s where s.id = p_song and s.artist_id = auth.uid())
    or exists (select 1 from public.music_purchases mp where mp.buyer_id = auth.uid() and mp.song_id = p_song)
    or exists (select 1 from public.music_purchases mp join public.songs s on s.release_id = mp.release_id
               where mp.buyer_id = auth.uid() and s.id = p_song)
    or (select public.is_admin());
$$;

grant execute on function public.song_for_sale(uuid) to anon, authenticated;
grant execute on function public.can_download(uuid) to anon, authenticated;

-- ---------- 4. Pataje pa atis yo sou yon chante (kolaboratè → featuring → pwopriyetè a) ----------
create function public.purchase_share_song(p_purchase uuid, p_song uuid, p_owner uuid, p_amount numeric)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_used   numeric := 0;
  v_pct    numeric := 0;
  v_amount numeric;
  s        record;
begin
  for s in select * from public.song_splits where song_id = p_song order by created_at loop
    v_amount := round(p_amount * s.percentage / 100, 2);
    insert into public.earnings (purchase_id, artist_id, kind, collaborator_name, collaborator_role,
                                 collaborator_phone, collaborator_method, collaborator_email, percentage, amount_htg, earned_at)
    values (p_purchase, p_owner, 'collaborator', s.collaborator_name, s.collaborator_role,
            s.collaborator_phone, s.collaborator_method, s.collaborator_email, s.percentage, v_amount, now());
    v_used := v_used + v_amount;
    v_pct := v_pct + s.percentage;
  end loop;
  for s in
    select sa.artist_id, sa.split_percentage from public.song_artists sa
    where sa.song_id = p_song and sa.split_percentage > 0 and sa.artist_id <> p_owner order by sa.created_at
  loop
    v_amount := round(p_amount * s.split_percentage / 100, 2);
    insert into public.earnings (purchase_id, artist_id, kind, percentage, amount_htg, earned_at)
    values (p_purchase, s.artist_id, 'artist', s.split_percentage, v_amount, now());
    v_used := v_used + v_amount;
    v_pct := v_pct + s.split_percentage;
  end loop;
  insert into public.earnings (purchase_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (p_purchase, p_owner, 'artist', greatest(100 - v_pct, 0), greatest(p_amount - v_used, 0), now());
end;
$$;

revoke execute on function public.purchase_share_song(uuid, uuid, uuid, numeric) from public, anon, authenticated;

-- ---------- 5. Achte yon chante ----------
create function public.buy_song(p_song uuid)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_song    record;
  v_htg     numeric;
  v_share   numeric;
  v_id      uuid;
  v_balance integer;
  v_name    text;
begin
  if v_uid is null then
    raise exception 'Konekte pou w achte mizik';
  end if;
  select s.id, s.title, s.artist_id, s.sale_price, r.id as release_id, r.title as release_title, r.sell_tracks, r.sale_price as release_price
  into v_song
  from public.songs s
  join public.profiles a on a.id = s.artist_id
  left join public.releases r on r.id = s.release_id
  where s.id = p_song and s.archived_at is null and a.status = 'approved' and a.archived_at is null;
  if v_song.id is null then
    raise exception 'Chante sa a pa disponib';
  end if;
  if v_song.artist_id = v_uid then
    raise exception 'Se pwòp mizik ou';
  end if;
  if v_song.release_id is not null and not v_song.sell_tracks and v_song.release_price is not null then
    raise exception 'Atis la vann « % » an antye sèlman: achte tout pwojè a', v_song.release_title;
  end if;
  if v_song.sale_price is null then
    raise exception 'Chante sa a pa an vant';
  end if;
  if public.can_download(p_song) then
    raise exception 'Ou deja gen chante sa a: gade nan Acha mwen yo';
  end if;

  select round(v_song.sale_price * credit_htg, 2) into v_htg from public.settings where id;
  insert into public.music_purchases (buyer_id, artist_id, song_id, item_title, credits, amount_htg)
  values (v_uid, v_song.artist_id, v_song.id, v_song.title, v_song.sale_price, v_htg)
  returning id, artist_share_htg into v_id, v_share;

  v_balance := public.add_credits(v_uid, -v_song.sale_price, 'purchase', v_id, '🛒 ' || left(v_song.title, 120));
  perform public.purchase_share_song(v_id, v_song.id, v_song.artist_id, v_share);

  select coalesce(nullif(trim(display_name), ''), 'Yon fanatik') into v_name from public.profiles where id = v_uid;
  perform public.notify(v_song.artist_id, 'donation', '🛒 Ou vann yon chante!',
    v_name || ' achte « ' || v_song.title || ' » (🪙 ' || v_song.sale_price::text || ').', '/dashboard/finans');
  return v_balance;
end;
$$;

-- ---------- 6. Achte tout yon pwojè ----------
create function public.buy_release(p_release uuid)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_rel     record;
  v_htg     numeric;
  v_share   numeric;
  v_id      uuid;
  v_balance integer;
  v_name    text;
  v_n       integer;
  v_each    numeric;
  v_left    numeric;
  v_i       integer := 0;
  t         record;
begin
  if v_uid is null then
    raise exception 'Konekte pou w achte mizik';
  end if;
  select r.id, r.title, r.artist_id, r.sale_price into v_rel
  from public.releases r join public.profiles a on a.id = r.artist_id
  where r.id = p_release and a.status = 'approved' and a.archived_at is null;
  if v_rel.id is null or v_rel.sale_price is null then
    raise exception 'Pwojè sa a pa an vant';
  end if;
  if v_rel.artist_id = v_uid then
    raise exception 'Se pwòp mizik ou';
  end if;
  if exists (select 1 from public.music_purchases where buyer_id = v_uid and release_id = p_release) then
    raise exception 'Ou deja achte pwojè sa a: gade nan Acha mwen yo';
  end if;
  select count(*) into v_n from public.songs where release_id = p_release and archived_at is null;
  if v_n = 0 then
    raise exception 'Pwojè sa a poko gen chante';
  end if;

  select round(v_rel.sale_price * credit_htg, 2) into v_htg from public.settings where id;
  insert into public.music_purchases (buyer_id, artist_id, release_id, item_title, credits, amount_htg)
  values (v_uid, v_rel.artist_id, v_rel.id, v_rel.title, v_rel.sale_price, v_htg)
  returning id, artist_share_htg into v_id, v_share;

  v_balance := public.add_credits(v_uid, -v_rel.sale_price, 'purchase', v_id, '🛒 ' || left(v_rel.title, 120) || ' (pwojè)');

  -- 85 % la separe egal ant chante yo; chak chante respekte pwòp featuring/kolaboratè li
  v_each := round(v_share / v_n, 2);
  v_left := v_share;
  for t in select id, artist_id from public.songs where release_id = p_release and archived_at is null order by track_number nulls last, created_at loop
    v_i := v_i + 1;
    perform public.purchase_share_song(v_id, t.id, t.artist_id, case when v_i = v_n then v_left else v_each end);
    v_left := v_left - v_each;
  end loop;

  select coalesce(nullif(trim(display_name), ''), 'Yon fanatik') into v_name from public.profiles where id = v_uid;
  perform public.notify(v_rel.artist_id, 'donation', '🛒 Ou vann yon pwojè!',
    v_name || ' achte « ' || v_rel.title || ' » (🪙 ' || v_rel.sale_price::text || ').', '/dashboard/finans');
  return v_balance;
end;
$$;

revoke execute on function public.buy_song(uuid) from public, anon;
revoke execute on function public.buy_release(uuid) from public, anon;
grant execute on function public.buy_song(uuid) to authenticated;
grant execute on function public.buy_release(uuid) to authenticated;

-- ---------- 7. "Acha mwen yo": tout chante moun nan genyen (pou telechaje yo ankò) ----------
create function public.my_purchased_songs()
returns table (song_id uuid, title text, artist_id uuid, artist_name text, audio_path text, cover_path text,
               duration_seconds integer, bought_at timestamptz, via_release text)
language sql
stable
security definer set search_path = ''
as $$
  select distinct on (s.id) s.id, s.title, s.artist_id, p.display_name, s.audio_path, s.cover_path,
         s.duration_seconds, mp.created_at, case when mp.release_id is not null then mp.item_title end
  from public.music_purchases mp
  join public.songs s on (s.id = mp.song_id or (mp.release_id is not null and s.release_id = mp.release_id))
  join public.profiles p on p.id = s.artist_id
  where mp.buyer_id = auth.uid() and s.archived_at is null
  order by s.id, mp.created_at;
$$;

revoke execute on function public.my_purchased_songs() from public, anon;
grant execute on function public.my_purchased_songs() to authenticated;

-- ---------- 8. Atis la: mizik li vann ----------
create function public.my_music_sales()
returns table (id uuid, item_title text, is_release boolean, buyer_name text, credits integer, amount_htg numeric,
               my_share_htg numeric, collab_share_htg numeric, sold_at timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select mp.id, mp.item_title, mp.release_id is not null, coalesce(nullif(trim(b.display_name), ''), 'Fanatik'),
         mp.credits, mp.amount_htg,
         coalesce(sum(e.amount_htg) filter (where e.kind = 'artist' and e.artist_id = auth.uid()), 0),
         case when mp.artist_id = auth.uid() then coalesce(sum(e.amount_htg) filter (where e.kind = 'collaborator'), 0) else 0 end,
         mp.created_at
  from public.music_purchases mp
  join public.earnings e on e.purchase_id = mp.id
  left join public.profiles b on b.id = mp.buyer_id
  where exists (select 1 from public.earnings x where x.purchase_id = mp.id and x.artist_id = auth.uid())
  group by mp.id, b.display_name
  order by mp.created_at desc;
$$;

revoke execute on function public.my_music_sales() from public, anon;
grant execute on function public.my_music_sales() to authenticated;

-- ---------- 9. Rapò yo: tout sa moun peye ak kredi (kado mizik + acha) ----------
create or replace view public.credit_sales with (security_invoker = true) as
  select g.id, g.artist_id, g.song_id, g.created_at, g.amount_htg, g.artist_share_htg,
         '🎁 ' || g.sender_name || ' (kredi)' as label, g.song_title as item
  from public.song_gifts g
  union all
  select mp.id, mp.artist_id, mp.song_id, mp.created_at, mp.amount_htg, mp.artist_share_htg,
         '🛒 Acha', mp.item_title
  from public.music_purchases mp;

revoke all on public.credit_sales from anon, authenticated;

create or replace function public.my_song_revenue()
returns table (song_id uuid, title text, owner_name text, is_owner boolean, my_percentage numeric, plays integer,
               donations_count bigint, total_htg numeric, artists_htg numeric, my_htg numeric)
language sql
stable
security definer set search_path = ''
as $$
  with mine as (
    select s.id, s.title, s.artist_id, s.play_count, true as is_owner
    from public.songs s where s.artist_id = auth.uid()
    union
    select s.id, s.title, s.artist_id, s.play_count, false
    from public.song_artists sa join public.songs s on s.id = sa.song_id
    where sa.artist_id = auth.uid() and s.artist_id <> auth.uid()
  ), src as (
    select d.id, d.song_id, d.amount_htg, d.artist_share_htg from public.donations d where d.status = 'verified'
    union all
    select c.id, c.song_id, c.amount_htg, c.artist_share_htg from public.credit_sales c where c.song_id is not null
  )
  select m.id, m.title, o.display_name, m.is_owner,
         case when m.is_owner then
           100 - coalesce((select sum(split_percentage) from public.song_artists where song_id = m.id), 0)
               - coalesce((select sum(percentage) from public.song_splits where song_id = m.id), 0)
         else (select split_percentage from public.song_artists where song_id = m.id and artist_id = auth.uid())
         end,
         m.play_count,
         (select count(*) from src where src.song_id = m.id),
         coalesce((select sum(src.amount_htg) from src where src.song_id = m.id), 0),
         coalesce((select sum(src.artist_share_htg) from src where src.song_id = m.id), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join src on src.id = coalesce(e.donation_id, e.song_gift_id, e.purchase_id)
                   where src.song_id = m.id and e.kind = 'artist' and e.artist_id = auth.uid()), 0)
  from mine m
  join public.profiles o on o.id = m.artist_id
  order by m.is_owner desc, m.title;
$$;

create or replace function public.finance_month_rows()
returns table (month date, artist_id uuid, donations_count bigint, gross_htg numeric, platform_htg numeric, own_htg numeric,
               featuring_in_htg numeric, featuring_out_htg numeric, collaborators_htg numeric, fee_htg numeric, net_htg numeric,
               paid_htg numeric, closed boolean, live_gross_htg numeric, live_htg numeric)
language sql
stable
security definer set search_path = ''
as $$
  with cur as (
    select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m
  ), src as (
    select d.id, d.artist_id, coalesce(d.reviewed_at, d.created_at) as at_, d.amount_htg, d.artist_share_htg
    from public.donations d where d.status = 'verified'
    union all
    select c.id, c.artist_id, c.created_at, c.amount_htg, c.artist_share_htg from public.credit_sales c
  ), don as (
    select s.artist_id, date_trunc('month', s.at_ at time zone 'America/Port-au-Prince')::date as month,
           count(*) as cnt, sum(s.amount_htg) as gross, sum(s.amount_htg - s.artist_share_htg) as platform
    from src s group by 1, 2
  ), earn as (
    select e.artist_id as earner, s.artist_id as owner, e.kind,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month, sum(e.amount_htg) as amt
    from public.earnings e
    join src s on s.id = coalesce(e.donation_id, e.song_gift_id, e.purchase_id)
    group by 1, 2, 3, 4
  ), lv as (
    select e.artist_id, date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month, sum(e.amount_htg) as amt
    from public.earnings e where e.live_gift_id is not null and e.kind = 'artist' group by 1, 2
  ), lg as (
    select l.artist_id, date_trunc('month', l.started_at at time zone 'America/Port-au-Prince')::date as month, sum(s.gift_htg) as amt
    from public.live_earnings_summary s join public.lives l on l.id = s.live_id where s.gift_htg > 0 group by 1, 2
  ), pays as (
    select p.artist_id, date_trunc('month', p.processed_at at time zone 'America/Port-au-Prince')::date as month, sum(p.amount_htg) as amt
    from public.payouts p where p.status = 'paid' and p.processed_at is not null group by 1, 2
  ), keys as (
    select artist_id, month from don
    union select earner, month from earn where kind = 'artist'
    union select owner, month from earn
    union select artist_id, month from lv
    union select artist_id, month from lg
    union select artist_id, month from pays
  ), agg as (
    select k.month, k.artist_id,
           coalesce(dn.cnt, 0) as cnt, coalesce(dn.gross, 0) as gross, coalesce(dn.platform, 0) as platform,
           coalesce((select sum(amt) from earn where kind = 'artist' and earner = k.artist_id and owner = k.artist_id and month = k.month), 0) as own,
           coalesce((select sum(amt) from earn where kind = 'artist' and earner = k.artist_id and owner <> k.artist_id and month = k.month), 0) as fin,
           coalesce((select sum(amt) from earn where kind = 'artist' and owner = k.artist_id and earner <> k.artist_id and month = k.month), 0) as fout,
           coalesce((select sum(amt) from earn where kind = 'collaborator' and owner = k.artist_id and month = k.month), 0) as col,
           coalesce((select amt from lv where lv.artist_id = k.artist_id and lv.month = k.month), 0) as live,
           coalesce((select amt from lg where lg.artist_id = k.artist_id and lg.month = k.month), 0) as live_gross,
           coalesce(p.amt, 0) as paid
    from keys k
    left join don dn on dn.artist_id = k.artist_id and dn.month = k.month
    left join pays p on p.artist_id = k.artist_id and p.month = k.month
  )
  select a.month, a.artist_id, a.cnt, a.gross, a.platform, a.own, a.fin, a.fout, a.col,
         case when a.month < (select m from cur) then least(a.own + a.fin + a.live, public.monthly_fee_htg()) else 0 end,
         (a.own + a.fin + a.live) - case when a.month < (select m from cur) then least(a.own + a.fin + a.live, public.monthly_fee_htg()) else 0 end,
         a.paid, a.month < (select m from cur), a.live_gross, a.live
  from agg a
  where public.is_admin();
$$;

create or replace function public.admin_revenue_extras_at(p_t0 timestamptz, p_t1 timestamptz)
returns table (live_gifts_htg numeric, live_artist_htg numeric, live_platform_htg numeric, fee_htg numeric,
               artist_paid_htg numeric, member_paid_htg numeric, member_paid_usd numeric, credits_unspent_htg numeric)
language sql
stable
security definer set search_path = ''
as $$
  with rng as (select p_t0 as t0, p_t1 as t1),
  lvs as (
    select s.gift_htg, s.artist_htg, s.platform_htg from public.live_earnings_summary s join public.lives l on l.id = s.live_id
    where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)
  ),
  cs as (
    select c.amount_htg, c.artist_share_htg from public.credit_sales c
    where c.created_at >= (select t0 from rng) and c.created_at < (select t1 from rng)
  )
  select
    coalesce((select sum(gift_htg) from lvs), 0) + coalesce((select sum(amount_htg) from cs), 0),
    coalesce((select sum(artist_htg) from lvs), 0) + coalesce((select sum(artist_share_htg) from cs), 0),
    coalesce((select sum(platform_htg) from lvs), 0) + coalesce((select sum(amount_htg - artist_share_htg) from cs), 0),
    coalesce((select sum(f.fee_htg) from public.finance_month_rows() f
              where ((f.month + interval '1 month')::timestamp at time zone 'America/Port-au-Prince') > (select t0 from rng)
                and ((f.month + interval '1 month')::timestamp at time zone 'America/Port-au-Prince') <= (select t1 from rng)), 0),
    coalesce((select sum(p.amount_htg) from public.payouts p
              where p.status = 'paid' and p.processed_at >= (select t0 from rng) and p.processed_at < (select t1 from rng)), 0),
    coalesce((select sum(mp.amount_htg) from public.member_payouts mp
              where mp.paid_at >= (select t0 from rng) and mp.paid_at < (select t1 from rng)), 0),
    coalesce((select sum(mp.amount_usd) from public.member_payouts mp
              where mp.paid_at >= (select t0 from rng) and mp.paid_at < (select t1 from rng)), 0),
    greatest(
      coalesce((select sum(c.amount_htg) from public.credit_purchases c where c.status = 'verified'), 0)
      - coalesce((select sum(s.gift_htg) from public.live_earnings_summary s), 0)
      - coalesce((select sum(c.amount_htg) from public.credit_sales c), 0), 0)
  where public.is_admin()
$$;

create or replace function public.admin_people_artists(p_t0 timestamptz, p_t1 timestamptz)
returns table (artist_id uuid, name text, avatar_url text, don_count bigint, don_gross numeric, don_site numeric, earn_don numeric,
               live_count bigint, live_gross numeric, live_artist numeric, paid_htg numeric, available_htg numeric,
               pending_htg numeric, month_htg numeric, detail jsonb)
language sql
stable
security definer set search_path = ''
as $$
  with d as (
    select d.artist_id, coalesce(d.reviewed_at, d.created_at) as at_, d.amount_htg,
           d.amount_htg - coalesce(d.artist_share_htg, 0) as site, coalesce(d.artist_share_htg, 0) as artist_part,
           coalesce(nullif(trim(d.donor_name), ''), 'Anonim') as donor, s.title
    from public.donations d
    left join public.songs s on s.id = d.song_id
    where d.status = 'verified'
      and coalesce(d.reviewed_at, d.created_at) >= p_t0 and coalesce(d.reviewed_at, d.created_at) < p_t1
    union all
    select c.artist_id, c.created_at, c.amount_htg, c.amount_htg - c.artist_share_htg, c.artist_share_htg, c.label, c.item
    from public.credit_sales c
    where c.created_at >= p_t0 and c.created_at < p_t1
  ), ed as (
    select e.artist_id, sum(e.amount_htg) as amt
    from public.earnings e
    where (e.donation_id is not null or e.song_gift_id is not null or e.purchase_id is not null)
      and e.kind = 'artist' and e.earned_at >= p_t0 and e.earned_at < p_t1
    group by 1
  ), lv as (
    select l.artist_id, l.started_at, l.title, s.gift_htg, s.artist_htg
    from public.lives l
    join public.live_earnings_summary s on s.live_id = l.id
    where s.gift_htg > 0 and l.started_at >= p_t0 and l.started_at < p_t1
  ), pays as (
    select p.artist_id, sum(p.amount_htg) as amt
    from public.payouts p
    where p.status = 'paid' and p.processed_at >= p_t0 and p.processed_at < p_t1
    group by 1
  ), rows_ as (
    select pr.id, pr.display_name, pr.avatar_url,
           (select count(*) from d where d.artist_id = pr.id) as don_count,
           coalesce((select sum(amount_htg) from d where d.artist_id = pr.id), 0) as don_gross,
           coalesce((select sum(site) from d where d.artist_id = pr.id), 0) as don_site,
           coalesce((select amt from ed where ed.artist_id = pr.id), 0) as earn_don,
           (select count(*) from lv where lv.artist_id = pr.id) as live_count,
           coalesce((select sum(gift_htg) from lv where lv.artist_id = pr.id), 0) as live_gross,
           coalesce((select sum(artist_htg) from lv where lv.artist_id = pr.id), 0) as live_artist,
           coalesce((select amt from pays where pays.artist_id = pr.id), 0) as paid_htg,
           coalesce(b.available_htg, 0) as available_htg,
           coalesce(b.pending_htg, 0) as pending_htg,
           coalesce(b.current_month_htg, 0) as month_htg,
           coalesce((
             select jsonb_agg(x order by x ->> 'at' desc)
             from (
               select jsonb_build_object('k', 'don', 'at', d.at_, 'label', d.donor || ' · ' || coalesce('« ' || d.title || ' »', 'pwofil la'),
                                         'gross', d.amount_htg, 'mine', d.artist_part, 'site', d.site) as x
               from d where d.artist_id = pr.id
               union all
               select jsonb_build_object('k', 'live', 'at', lv.started_at, 'label', coalesce(nullif(trim(lv.title), ''), 'Live'),
                                         'gross', lv.gift_htg, 'mine', lv.artist_htg, 'site', lv.gift_htg - lv.artist_htg)
               from lv where lv.artist_id = pr.id
             ) q
           ), '[]'::jsonb) as detail
    from public.profiles pr
    left join lateral public.artist_balance(pr.id) b on true
    where pr.role = 'artist'
  )
  select r.id, r.display_name, r.avatar_url, r.don_count, r.don_gross, r.don_site, r.earn_don, r.live_count, r.live_gross,
         r.live_artist, r.paid_htg, r.available_htg, r.pending_htg, r.month_htg, r.detail
  from rows_ r
  where public.is_admin()
    and (r.don_count > 0 or r.live_count > 0 or r.earn_don > 0 or r.paid_htg > 0 or r.available_htg > 0 or r.pending_htg > 0 or r.month_htg > 0)
  order by r.available_htg + r.pending_htg desc, r.don_gross + r.live_gross desc, r.display_name;
$$;
