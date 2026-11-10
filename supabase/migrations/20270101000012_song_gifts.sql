-- =====================================================================
-- 🎁 KADO SOU MIZIK YO (ak kredi, menm kado ak live yo)
--  Yon koutè KONEKTE voye yon kado sou yon chante ak kredi li te deja achte.
--  Pataj la menm jan ak yon don: 85 % pou atis yo (pwopriyetè + featuring + kolaboratè), 15 % pou UpMizik.
--  (Kado LIVE yo kenbe pwòp pousantaj pa yo.)
--  Moun ki pa konekte yo toujou ka voye yon don MonCash / NatCash jan sa te ye a.
--  Kontablite: lajan an te deja antre lè moun nan te achte kredi yo. Kado a separe l sèlman
--  (rapò revni an mete l ak kado live yo; relve atis yo mete l ak don yo).
-- =====================================================================

-- ---------- 1. Tablo kado yo ----------
create table public.song_gifts (
  id                   uuid primary key default gen_random_uuid(),
  song_id              uuid references public.songs (id) on delete set null,
  artist_id            uuid not null references public.profiles (id) on delete cascade, -- pwopriyetè chante a
  sender_id            uuid not null references public.profiles (id) on delete cascade,
  sender_name          text not null,
  song_title           text not null,  -- kenbe tit la menm si chante a efase
  gift_id              text not null references public.live_gift_types (id),
  quantity             integer not null default 1 check (quantity between 1 and 99),
  credits              integer not null check (credits > 0),
  amount_htg           numeric(12, 2) not null check (amount_htg > 0),
  platform_fee_percent numeric(5, 2) not null default 15,
  artist_share_htg     numeric(12, 2) generated always as (round(amount_htg * (100 - platform_fee_percent) / 100, 2)) stored,
  message              text check (char_length(message) <= 300),
  created_at           timestamptz not null default now()
);

create index song_gifts_artist_idx on public.song_gifts (artist_id, created_at desc);
create index song_gifts_song_idx on public.song_gifts (song_id, created_at desc);
create index song_gifts_sender_idx on public.song_gifts (sender_id, created_at desc);

alter table public.song_gifts enable row level security;
-- Moun ki voye l, atis chante a, oswa admin (pèsonn pa ka ekri dirèkteman: se send_song_gift sèlman)
create policy "Moun ki konsène wè kado mizik yo" on public.song_gifts for select to authenticated
  using (sender_id = (select auth.uid()) or artist_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- 2. Liv kont: revni yo ka soti nan yon kado mizik tou ----------
alter table public.earnings add column song_gift_id uuid references public.song_gifts (id) on delete cascade;
alter table public.earnings drop constraint earnings_source_check;
alter table public.earnings add constraint earnings_source_check check (num_nonnulls(donation_id, live_gift_id, song_gift_id) = 1);
create index earnings_song_gift_idx on public.earnings (song_gift_id) where song_gift_id is not null;

-- ---------- 3. Voye yon kado ----------
create function public.send_song_gift(p_song uuid, p_gift text, p_quantity integer, p_message text default null)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_song    record;
  v_gift    public.live_gift_types;
  v_qty     integer := least(greatest(coalesce(p_quantity, 1), 1), 99);
  v_cost    integer;
  v_htg     numeric;
  v_share   numeric;
  v_name    text;
  v_id      uuid;
  v_balance integer;
  v_used    numeric := 0;
  v_pct     numeric := 0;
  v_amount  numeric;
  s         record;
begin
  if v_uid is null then
    raise exception 'Konekte pou w voye kado';
  end if;
  select so.id, so.title, so.artist_id into v_song
  from public.songs so
  join public.profiles a on a.id = so.artist_id
  where so.id = p_song and so.archived_at is null and a.status = 'approved' and a.archived_at is null;
  if v_song.id is null then
    raise exception 'Chante sa a pa disponib';
  end if;
  if v_song.artist_id = v_uid then
    raise exception 'Ou pa ka voye kado bay tèt ou';
  end if;
  select * into v_gift from public.live_gift_types where id = p_gift and active;
  if not found then
    raise exception 'Kado sa a pa egziste';
  end if;

  v_cost := v_gift.credits * v_qty;
  select round(v_cost * credit_htg, 2) into v_htg from public.settings where id;
  select coalesce(nullif(trim(display_name), ''), 'Fanatik') into v_name from public.profiles where id = v_uid;

  insert into public.song_gifts (song_id, artist_id, sender_id, sender_name, song_title, gift_id, quantity, credits, amount_htg, message)
  values (v_song.id, v_song.artist_id, v_uid, v_name, v_song.title, p_gift, v_qty, v_cost, v_htg, nullif(trim(p_message), ''))
  returning id, artist_share_htg into v_id, v_share;

  -- Retire kredi yo (erè si l pa gen ase: tout bagay anile)
  v_balance := public.add_credits(v_uid, -v_cost, 'gift', v_id, v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text || ' · ' || left(v_song.title, 80));

  -- 85 %: menm pataj ak yon don (kolaboratè → featuring → pwopriyetè a pran rès la)
  for s in select * from public.song_splits where song_id = v_song.id order by created_at loop
    v_amount := round(v_share * s.percentage / 100, 2);
    insert into public.earnings (song_gift_id, artist_id, kind, collaborator_name, collaborator_role,
                                 collaborator_phone, collaborator_method, collaborator_email,
                                 percentage, amount_htg, earned_at)
    values (v_id, v_song.artist_id, 'collaborator', s.collaborator_name, s.collaborator_role,
            s.collaborator_phone, s.collaborator_method, s.collaborator_email,
            s.percentage, v_amount, now());
    v_used := v_used + v_amount;
    v_pct := v_pct + s.percentage;
  end loop;

  for s in
    select sa.artist_id, sa.split_percentage from public.song_artists sa
    where sa.song_id = v_song.id and sa.split_percentage > 0 and sa.artist_id <> v_song.artist_id
    order by sa.created_at
  loop
    v_amount := round(v_share * s.split_percentage / 100, 2);
    insert into public.earnings (song_gift_id, artist_id, kind, percentage, amount_htg, earned_at)
    values (v_id, s.artist_id, 'artist', s.split_percentage, v_amount, now());
    v_used := v_used + v_amount;
    v_pct := v_pct + s.split_percentage;
    perform public.notify(s.artist_id, 'donation', '🎁 Kado sou yon chante ou nan featuring',
      v_name || ' voye ' || v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text || ' sou « ' || v_song.title || ' ».', '/dashboard/finans');
  end loop;

  insert into public.earnings (song_gift_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (v_id, v_song.artist_id, 'artist', greatest(100 - v_pct, 0), greatest(v_share - v_used, 0), now());

  perform public.notify(v_song.artist_id, 'donation', '🎁 Ou resevwa yon kado!',
    v_name || ' voye ' || v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text || ' sou « ' || v_song.title || ' »'
      || coalesce(': « ' || left(nullif(trim(p_message), ''), 120) || ' »', '.'), '/dashboard/finans');

  return v_balance;
end;
$$;

revoke execute on function public.send_song_gift(uuid, text, integer, text) from public, anon;
grant execute on function public.send_song_gift(uuid, text, integer, text) to authenticated;

-- ---------- 4. Atis la: lis kado li resevwa sou mizik li (pwòp chante l + featuring) ----------
create function public.my_song_gifts()
returns table (
  id               uuid,
  sender_name      text,
  message          text,
  song_title       text,
  gift_label       text,
  quantity         integer,
  amount_htg       numeric,
  my_share_htg     numeric,
  collab_share_htg numeric,
  received_at      timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select g.id, g.sender_name, case when g.artist_id = auth.uid() then g.message end, g.song_title,
         t.emoji || ' ' || t.name, g.quantity, g.amount_htg,
         coalesce(sum(e.amount_htg) filter (where e.kind = 'artist' and e.artist_id = auth.uid()), 0),
         case when g.artist_id = auth.uid() then coalesce(sum(e.amount_htg) filter (where e.kind = 'collaborator'), 0) else 0 end,
         g.created_at
  from public.song_gifts g
  join public.live_gift_types t on t.id = g.gift_id
  join public.earnings e on e.song_gift_id = g.id
  where exists (select 1 from public.earnings x where x.song_gift_id = g.id and x.artist_id = auth.uid())
  group by g.id, t.emoji, t.name
  order by g.created_at desc;
$$;

revoke execute on function public.my_song_gifts() from public, anon;
grant execute on function public.my_song_gifts() to authenticated;

-- ---------- 5. Revni pa chante (dashboard → revni): don + kado ----------
create or replace function public.my_song_revenue()
returns table (
  song_id         uuid,
  title           text,
  owner_name      text,
  is_owner        boolean,
  my_percentage   numeric,
  plays           integer,
  donations_count bigint,
  total_htg       numeric,
  artists_htg     numeric,
  my_htg          numeric
)
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
    select g.id, g.song_id, g.amount_htg, g.artist_share_htg from public.song_gifts g
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
         coalesce((select sum(e.amount_htg) from public.earnings e join src on src.id = coalesce(e.donation_id, e.song_gift_id)
                   where src.song_id = m.id and e.kind = 'artist' and e.artist_id = auth.uid()), 0)
  from mine m
  join public.profiles o on o.id = m.artist_id
  order by m.is_owner desc, m.title;
$$;

-- ---------- 6. Relve mwa admin nan: kado mizik yo konte tankou don ----------
create or replace function public.finance_month_rows()
returns table (
  month             date,
  artist_id         uuid,
  donations_count   bigint,
  gross_htg         numeric,
  platform_htg      numeric,
  own_htg           numeric,
  featuring_in_htg  numeric,
  featuring_out_htg numeric,
  collaborators_htg numeric,
  fee_htg           numeric,
  net_htg           numeric,
  paid_htg          numeric,
  closed            boolean,
  live_gross_htg    numeric,
  live_htg          numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with cur as (
    select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m
  ), src as (
    -- Don valide + kado mizik (ak kredi)
    select d.id, d.artist_id, coalesce(d.reviewed_at, d.created_at) as at_, d.amount_htg, d.artist_share_htg
    from public.donations d where d.status = 'verified'
    union all
    select g.id, g.artist_id, g.created_at, g.amount_htg, g.artist_share_htg from public.song_gifts g
  ), don as (
    select s.artist_id,
           date_trunc('month', s.at_ at time zone 'America/Port-au-Prince')::date as month,
           count(*) as cnt, sum(s.amount_htg) as gross, sum(s.amount_htg - s.artist_share_htg) as platform
    from src s
    group by 1, 2
  ), earn as (
    select e.artist_id as earner, s.artist_id as owner, e.kind,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month,
           sum(e.amount_htg) as amt
    from public.earnings e
    join src s on s.id = coalesce(e.donation_id, e.song_gift_id)
    group by 1, 2, 3, 4
  ), lv as (
    select e.artist_id,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month,
           sum(e.amount_htg) as amt
    from public.earnings e
    where e.live_gift_id is not null and e.kind = 'artist'
    group by 1, 2
  ), lg as (
    select l.artist_id,
           date_trunc('month', l.started_at at time zone 'America/Port-au-Prince')::date as month,
           sum(s.gift_htg) as amt
    from public.live_earnings_summary s
    join public.lives l on l.id = s.live_id
    where s.gift_htg > 0
    group by 1, 2
  ), pays as (
    select p.artist_id,
           date_trunc('month', p.processed_at at time zone 'America/Port-au-Prince')::date as month,
           sum(p.amount_htg) as amt
    from public.payouts p
    where p.status = 'paid' and p.processed_at is not null
    group by 1, 2
  ), keys as (
    select artist_id, month from don
    union select earner, month from earn where kind = 'artist'
    union select owner, month from earn
    union select artist_id, month from lv
    union select artist_id, month from lg
    union select artist_id, month from pays
  ), agg as (
    select k.month, k.artist_id,
           coalesce(dn.cnt, 0) as cnt,
           coalesce(dn.gross, 0) as gross,
           coalesce(dn.platform, 0) as platform,
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
         a.paid,
         a.month < (select m from cur),
         a.live_gross,
         a.live
  from agg a
  where public.is_admin();
$$;

-- ---------- 7. Rapò revni an: "kado" = kado live + kado mizik (tou de peye ak kredi) ----------
create or replace function public.admin_revenue_extras_at(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  live_gifts_htg      numeric,  -- valè kado yo (live + mizik)
  live_artist_htg     numeric,  -- pa atis yo (ak featuring/kolaboratè sou kado mizik)
  live_platform_htg   numeric,  -- pa sit la
  fee_htg             numeric,
  artist_paid_htg     numeric,
  member_paid_htg     numeric,
  member_paid_usd     numeric,
  credits_unspent_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with rng as (select p_t0 as t0, p_t1 as t1),
  lvs as (
    select s.gift_htg, s.artist_htg, s.platform_htg from public.live_earnings_summary s join public.lives l on l.id = s.live_id
    where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)
  ),
  sg as (
    select g.amount_htg, g.artist_share_htg from public.song_gifts g
    where g.created_at >= (select t0 from rng) and g.created_at < (select t1 from rng)
  )
  select
    coalesce((select sum(gift_htg) from lvs), 0) + coalesce((select sum(amount_htg) from sg), 0),
    coalesce((select sum(artist_htg) from lvs), 0) + coalesce((select sum(artist_share_htg) from sg), 0),
    coalesce((select sum(platform_htg) from lvs), 0) + coalesce((select sum(amount_htg - artist_share_htg) from sg), 0),
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
      - coalesce((select sum(g.amount_htg) from public.song_gifts g), 0), 0)
  where public.is_admin()
$$;

-- ---------- 8. Kont pa moun (atis): kado mizik yo parèt ak don yo ----------
create or replace function public.admin_people_artists(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  artist_id     uuid,
  name          text,
  avatar_url    text,
  don_count     bigint,
  don_gross     numeric,
  don_site      numeric,
  earn_don      numeric,
  live_count    bigint,
  live_gross    numeric,
  live_artist   numeric,
  paid_htg      numeric,
  available_htg numeric,
  pending_htg   numeric,
  month_htg     numeric,
  detail        jsonb
)
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
    select g.artist_id, g.created_at, g.amount_htg, g.amount_htg - g.artist_share_htg, g.artist_share_htg,
           '🎁 ' || g.sender_name || ' (kredi)', g.song_title
    from public.song_gifts g
    where g.created_at >= p_t0 and g.created_at < p_t1
  ), ed as (
    select e.artist_id, sum(e.amount_htg) as amt
    from public.earnings e
    where (e.donation_id is not null or e.song_gift_id is not null) and e.kind = 'artist' and e.earned_at >= p_t0 and e.earned_at < p_t1
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
