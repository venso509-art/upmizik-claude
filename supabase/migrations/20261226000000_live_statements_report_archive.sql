-- =====================================================================
-- 1) KADO LIVE NAN RELVE MWA YO
--    Kado live yo te deja antre nan balans atis yo (retrè), men relve mwa a
--    te konte sèlman don yo. Kounya chak relve gen 2 nouvo kolòn:
--      live_gross_htg = valè kado live atis la resevwa nan mwa a
--      live_htg       = pa atis la sou kado sa yo (sa ki antre nan balans li)
--    "Pou li" (net) = pa don + featuring + live − frè $0.99 (menm kalkil ak balans lan).
--    Mwa ki te deja fèmen yo pa chanje (yo rete jan yo te jele a).
-- 2) RESET RAPÒ REVNI AN + ACHIV RAPÒ YO
--    Admin nan peze « Reset »: rapò lajan an (depi dènye reset la) anrejistre
--    pou toutan nan achiv (pa ka modifye ni efase), epi kontè rapò a rekòmanse a zewo.
--    Reset la PA touche okenn lajan, balans, ni peman: se rapò a sèlman.
--    Pou reset: ekri RESET + mo sekrè a (ki sere an hash, pa janm nan kòd la).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KADO LIVE NAN RELVE YO
-- ---------------------------------------------------------------------
alter table public.monthly_reports
  add column if not exists live_gross_htg numeric(12, 2) not null default 0,
  add column if not exists live_htg       numeric(12, 2) not null default 0;

drop function if exists public.finance_month_rows();
create function public.finance_month_rows()
returns table (
  month             date,
  artist_id         uuid,
  donations_count   bigint,
  gross_htg         numeric,  -- tout don valide pou atis la (100%)
  platform_htg      numeric,  -- 15% UpMizik
  own_htg           numeric,  -- pa atis la sou pwòp chante li
  featuring_in_htg  numeric,  -- sa l touche kòm featuring sou chante LÒT atis
  featuring_out_htg numeric,  -- sa featuring yo touche sou chante LI
  collaborators_htg numeric,  -- kolaboratè deyò (UpMizik peye yo)
  fee_htg           numeric,  -- $0.99 frè lojistik (mwa ki fini sèlman)
  net_htg           numeric,  -- sa atis la gen pou resevwa pou mwa a (don + live − frè)
  paid_htg          numeric,  -- retrè ki PEYE pandan mwa a
  closed            boolean,  -- mwa a fini (pa mwa kounye a)
  live_gross_htg    numeric,  -- valè kado live yo
  live_htg          numeric   -- pa atis la sou kado live yo
)
language sql
stable
security definer set search_path = ''
as $$
  with cur as (
    select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m
  ), don as (
    select d.artist_id,
           date_trunc('month', coalesce(d.reviewed_at, d.created_at) at time zone 'America/Port-au-Prince')::date as month,
           count(*) as cnt, sum(d.amount_htg) as gross, sum(d.amount_htg - d.artist_share_htg) as platform
    from public.donations d
    where d.status = 'verified'
    group by 1, 2
  ), earn as (
    select e.artist_id as earner, d.artist_id as owner, e.kind,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month,
           sum(e.amount_htg) as amt
    from public.earnings e
    join public.donations d on d.id = e.donation_id
    group by 1, 2, 3, 4
  ), lv as (
    -- Pa atis la sou kado live yo (menm liv kont ak balans lan)
    select e.artist_id,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month,
           sum(e.amount_htg) as amt
    from public.earnings e
    where e.live_gift_id is not null and e.kind = 'artist'
    group by 1, 2
  ), lg as (
    -- Valè total kado live yo (mwa live la te kòmanse)
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
         -- Menm règ ak balans atis la: $0.99 sèlman pou mwa ki fini, e pa plis pase sa l touche (don + live)
         case when a.month < (select m from cur) then least(a.own + a.fin + a.live, public.monthly_fee_htg()) else 0 end,
         (a.own + a.fin + a.live) - case when a.month < (select m from cur) then least(a.own + a.fin + a.live, public.monthly_fee_htg()) else 0 end,
         a.paid,
         a.month < (select m from cur),
         a.live_gross,
         a.live
  from agg a
  where public.is_admin();
$$;

revoke execute on function public.finance_month_rows() from public, anon;
grant execute on function public.finance_month_rows() to authenticated;

-- Fèmen yon mwa: jele kolòn live yo tou
create or replace function public.admin_close_month(p_month date)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fèmen yon mwa';
  end if;
  if v_month >= date_trunc('month', now() at time zone 'America/Port-au-Prince')::date then
    raise exception 'Ou ka fèmen yon mwa sèlman APRE li fini';
  end if;
  if exists (select 1 from public.closed_months where month = v_month) then
    raise exception 'Mwa sa a deja fèmen';
  end if;

  insert into public.closed_months (month, closed_by) values (v_month, auth.uid());
  insert into public.monthly_reports (month, artist_id, donations_count, gross_htg, platform_htg, own_htg, featuring_in_htg,
                                      featuring_out_htg, collaborators_htg, fee_htg, net_htg, paid_htg, live_gross_htg, live_htg)
  select r.month, r.artist_id, r.donations_count, r.gross_htg, r.platform_htg, r.own_htg, r.featuring_in_htg,
         r.featuring_out_htg, r.collaborators_htg, r.fee_htg, r.net_htg, r.paid_htg, r.live_gross_htg, r.live_htg
  from public.finance_month_rows() r
  where r.month = v_month;
  get diagnostics v_count = row_count;

  perform public.audit('month.closed', 'closed_months', null, jsonb_build_object('month', v_month, 'artists', v_count));
  return v_count;
end;
$$;

-- Lis mwa yo ak total yo (+ live)
drop function if exists public.admin_months();
create function public.admin_months()
returns table (
  month date, is_closed boolean, closed_at timestamptz, artists integer, donations_count bigint,
  gross_htg numeric, platform_htg numeric, artists_net_htg numeric, featuring_htg numeric,
  collaborators_htg numeric, fee_htg numeric, paid_htg numeric, live_gross_htg numeric, live_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with live as (select * from public.finance_month_rows()),
  months as (select distinct month from live union select month from public.closed_months),
  src as (
    select r.month, r.donations_count::bigint as donations_count, r.gross_htg, r.platform_htg, r.net_htg, r.featuring_in_htg,
           r.collaborators_htg, r.fee_htg, r.paid_htg, r.live_gross_htg, r.live_htg
    from public.monthly_reports r
    union all
    select l.month, l.donations_count, l.gross_htg, l.platform_htg, l.net_htg, l.featuring_in_htg,
           l.collaborators_htg, l.fee_htg, l.paid_htg, l.live_gross_htg, l.live_htg
    from live l
    where not exists (select 1 from public.closed_months c where c.month = l.month)
  )
  select m.month, cm.month is not null, cm.closed_at,
         (select count(*)::int from src s where s.month = m.month),
         coalesce((select sum(donations_count) from src s where s.month = m.month), 0),
         coalesce((select sum(gross_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(platform_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(net_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(featuring_in_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(collaborators_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(fee_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(paid_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(live_gross_htg) from src s where s.month = m.month), 0),
         coalesce((select sum(live_htg) from src s where s.month = m.month), 0)
  from months m
  left join public.closed_months cm on cm.month = m.month
  where public.is_admin()
  order by m.month desc;
$$;

revoke execute on function public.admin_months() from public, anon;
grant execute on function public.admin_months() to authenticated;

-- Detay yon mwa: yon liy pa atis (+ live)
drop function if exists public.admin_month_detail(date);
create function public.admin_month_detail(p_month date)
returns table (
  artist_id uuid, display_name text, is_closed boolean, donations_count bigint,
  gross_htg numeric, platform_htg numeric, own_htg numeric, featuring_in_htg numeric, featuring_out_htg numeric,
  collaborators_htg numeric, fee_htg numeric, net_htg numeric, paid_htg numeric, live_gross_htg numeric, live_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with m as (select date_trunc('month', p_month)::date as v),
  frozen as (
    select r.artist_id, true as is_closed, r.donations_count::bigint as donations_count, r.gross_htg, r.platform_htg, r.own_htg,
           r.featuring_in_htg, r.featuring_out_htg, r.collaborators_htg, r.fee_htg, r.net_htg, r.paid_htg, r.live_gross_htg, r.live_htg
    from public.monthly_reports r where r.month = (select v from m)
  ),
  live as (
    select l.artist_id, false, l.donations_count, l.gross_htg, l.platform_htg, l.own_htg,
           l.featuring_in_htg, l.featuring_out_htg, l.collaborators_htg, l.fee_htg, l.net_htg, l.paid_htg, l.live_gross_htg, l.live_htg
    from public.finance_month_rows() l
    where l.month = (select v from m)
      and not exists (select 1 from public.closed_months c where c.month = (select v from m))
  ),
  rows_ as (select * from frozen union all select * from live)
  select x.artist_id, p.display_name, x.is_closed, x.donations_count, x.gross_htg, x.platform_htg, x.own_htg,
         x.featuring_in_htg, x.featuring_out_htg, x.collaborators_htg, x.fee_htg, x.net_htg, x.paid_htg, x.live_gross_htg, x.live_htg
  from rows_ x
  join public.profiles p on p.id = x.artist_id
  where public.is_admin()
  order by x.gross_htg + x.live_gross_htg desc, p.display_name;
$$;

revoke execute on function public.admin_month_detail(date) from public, anon;
grant execute on function public.admin_month_detail(date) to authenticated;

-- ---------------------------------------------------------------------
-- 2. RAPÒ REVNI: vèsyon ak lè egzak (pou reset yo)
-- ---------------------------------------------------------------------
create or replace function public.admin_revenue_ledger_at(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  kind          text,          -- don | enskripsyon | pro | boost | kredi
  id            uuid,
  at            timestamptz,   -- dat peman an valide
  payer_name    text,
  payer_id      uuid,
  target_name   text,          -- atis ki benefisye a (oswa "UpMizik")
  target_id     uuid,
  detail        text,
  method        text,
  reference     text,
  total_htg     numeric,
  total_usd     numeric,
  site_htg      numeric,       -- null = kredi (separasyon an fèt lè moun nan voye kado)
  shared_htg    numeric,
  shared_with   text           -- ak kiyès lajan an pataje
)
language sql
stable
security definer set search_path = ''
as $$
  with
  rate as (select coalesce((select htg_per_usd from public.settings where id), 145)::numeric as v),
  rng as (select p_t0 as t0, p_t1 as t1),
  -- Atis manm yo fè enskri: lòd yo nan mwa a pou chak manm (pou konnen 1 $ oswa 2,50 $)
  referred as (
    select p.id as artist_id, m.id as member_id,
           coalesce(nullif(trim(m.nickname), ''), m.pseudo_referral, m.full_name) as member_name,
           case when row_number() over (
                  partition by m.id, date_trunc('month', p.referral_counted_at at time zone 'America/Port-au-Prince')
                  order by p.referral_counted_at, p.id
                ) <= m.objective_total then 1.00 else 2.50 end as member_usd
    from public.profiles p
    join public.members m on m.id = p.referred_by_member_id
    where p.referral_counted_at is not null
  ),
  -- Yon sèl enskripsyon valide pa atis konte pou manm nan (dènye a)
  reg as (
    select r.*, row_number() over (partition by r.artist_id order by coalesce(r.reviewed_at, r.created_at) desc) as rn
    from public.artist_registrations r
    where r.status = 'verified'
  )
  select * from (

  -- 1. DON (15 % sit la, rès la pou atis la + featuring/kolaboratè)
  select 'don', d.id, coalesce(d.reviewed_at, d.created_at),
         coalesce(nullif(trim(d.donor_name), ''), dp.display_name, 'Anonim'), d.donor_id,
         ap.display_name, d.artist_id,
         case when s.title is not null then 'Don sou « ' || s.title || ' »' else 'Don sou pwofil la' end,
         d.method::text, null::text,
         d.amount_htg, d.amount_usd,
         d.amount_htg - coalesce(d.artist_share_htg, 0), coalesce(d.artist_share_htg, 0),
         ap.display_name
  from public.donations d
  join public.profiles ap on ap.id = d.artist_id
  left join public.profiles dp on dp.id = d.donor_id
  left join public.songs s on s.id = d.song_id
  where d.status = 'verified'
    and coalesce(d.reviewed_at, d.created_at) >= (select t0 from rng) and coalesce(d.reviewed_at, d.created_at) < (select t1 from rng)

  union all
  -- 2. ENSKRIPSYON ATIS (pa manm nan separe si se yon manm ki fè l enskri)
  select 'enskripsyon', r.id, coalesce(r.reviewed_at, r.created_at),
         ap.display_name, r.artist_id,
         'UpMizik', null::uuid,
         case when rf.member_id is not null and r.rn = 1 then 'Enskripsyon atis · kòd manm ' || rf.member_name else 'Enskripsyon atis' end,
         r.method::text, r.transaction_ref,
         r.amount_htg, r.amount_usd,
         r.amount_htg - coalesce(case when r.rn = 1 then round(rf.member_usd * r.amount_htg / nullif(r.amount_usd, 0), 2) end, 0),
         coalesce(case when r.rn = 1 then round(rf.member_usd * r.amount_htg / nullif(r.amount_usd, 0), 2) end, 0),
         case when rf.member_id is not null and r.rn = 1 then 'Manm ' || rf.member_name || ' (' || to_char(rf.member_usd, 'FM0.00') || ' $)' end
  from reg r
  join public.profiles ap on ap.id = r.artist_id
  left join referred rf on rf.artist_id = r.artist_id
  where coalesce(r.reviewed_at, r.created_at) >= (select t0 from rng) and coalesce(r.reviewed_at, r.created_at) < (select t1 from rng)

  union all
  -- 3. PWOFIL PRO (100 % sit la)
  select 'pro', q.id, coalesce(q.reviewed_at, q.created_at),
         ap.display_name, q.artist_id, 'UpMizik', null::uuid,
         'Pwofil Pro · ' || q.months || ' mwa',
         q.method::text, q.transaction_ref,
         q.amount_htg, q.amount_usd, q.amount_htg, 0, null::text
  from public.pro_requests q
  join public.profiles ap on ap.id = q.artist_id
  where q.status = 'active'
    and coalesce(q.reviewed_at, q.created_at) >= (select t0 from rng) and coalesce(q.reviewed_at, q.created_at) < (select t1 from rng)

  union all
  -- 4. BOOST (100 % sit la)
  select 'boost', b.id, coalesce(b.reviewed_at, b.created_at),
         ap.display_name, b.artist_id, 'UpMizik', null::uuid,
         case when b.boost_type = 'mizik' then 'Boost mizik' || coalesce(' « ' || s.title || ' »', '') else 'Boost pwofil' end
           || ' · ' || b.duration_days || ' jou',
         b.method::text, b.transaction_ref,
         b.amount::numeric, round(b.amount / (select v from rate), 2), b.amount::numeric, 0, null::text
  from public.boost_purchases b
  join public.profiles ap on ap.id = b.artist_id
  left join public.songs s on s.id = b.target_id and b.boost_type = 'mizik'
  where b.status = 'active'
    and coalesce(b.reviewed_at, b.created_at) >= (select t0 from rng) and coalesce(b.reviewed_at, b.created_at) < (select t1 from rng)

  union all
  -- 5. KREDI LIVE (lajan an antre; li separe lè moun nan voye kado nan yon live)
  select 'kredi', c.id, coalesce(c.reviewed_at, c.created_at),
         up.display_name, c.user_id, 'Kredi live', null::uuid,
         c.credits || ' kredi',
         c.method::text, c.transaction_ref,
         c.amount_htg, round(c.amount_htg / (select v from rate), 2), null::numeric, null::numeric, null::text
  from public.credit_purchases c
  join public.profiles up on up.id = c.user_id
  where c.status = 'verified'
    and coalesce(c.reviewed_at, c.created_at) >= (select t0 from rng) and coalesce(c.reviewed_at, c.created_at) < (select t1 from rng)
  ) x
  where public.is_admin()
  order by 3 desc
$$;

create or replace function public.admin_revenue_extras_at(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  live_gifts_htg      numeric,  -- valè kado live yo
  live_artist_htg     numeric,  -- pa atis yo
  live_platform_htg   numeric,  -- pa sit la
  fee_htg             numeric,  -- frè lojistik 0,99 $ (retire sou pa atis yo, mwa ki fini)
  artist_paid_htg     numeric,  -- retrè atis ki PEYE
  member_paid_htg     numeric,  -- peman manm yo
  member_paid_usd     numeric,
  credits_unspent_htg numeric   -- kredi achte (tout tan) ki poko depanse an kado
)
language sql
stable
security definer set search_path = ''
as $$
  with rng as (select p_t0 as t0, p_t1 as t1)
  select
    coalesce((select sum(s.gift_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    coalesce((select sum(s.artist_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    coalesce((select sum(s.platform_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    -- Frè yon mwa konte nan peryòd kote mwa a FINI (frè a pran sèlman pou mwa ki fini)
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
      - coalesce((select sum(s.gift_htg) from public.live_earnings_summary s), 0), 0)
  where public.is_admin()
$$;

revoke execute on function public.admin_revenue_ledger_at(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_revenue_ledger_at(timestamptz, timestamptz) to authenticated;
revoke execute on function public.admin_revenue_extras_at(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_revenue_extras_at(timestamptz, timestamptz) to authenticated;

-- Vèsyon ak dat yo (paj rapò a) itilize vèsyon ak lè yo
create or replace function public.admin_revenue_ledger(p_from date, p_to date)
returns table (
  kind text, id uuid, at timestamptz, payer_name text, payer_id uuid, target_name text, target_id uuid, detail text,
  method text, reference text, total_htg numeric, total_usd numeric, site_htg numeric, shared_htg numeric, shared_with text
)
language sql
stable
security definer set search_path = ''
as $$
  select * from public.admin_revenue_ledger_at(
    p_from::timestamp at time zone 'America/Port-au-Prince',
    (p_to + 1)::timestamp at time zone 'America/Port-au-Prince');
$$;

create or replace function public.admin_revenue_extras(p_from date, p_to date)
returns table (
  live_gifts_htg numeric, live_artist_htg numeric, live_platform_htg numeric, fee_htg numeric,
  artist_paid_htg numeric, member_paid_htg numeric, member_paid_usd numeric, credits_unspent_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  select * from public.admin_revenue_extras_at(
    p_from::timestamp at time zone 'America/Port-au-Prince',
    (p_to + 1)::timestamp at time zone 'America/Port-au-Prince');
$$;

-- ---------------------------------------------------------------------
-- 3. ACHIV RAPÒ YO (pa ka modifye ni efase)
-- ---------------------------------------------------------------------
create table if not exists public.revenue_reports (
  id          uuid primary key default gen_random_uuid(),
  number      integer generated always as identity,
  title       text not null check (char_length(title) between 2 and 120),
  period_from timestamptz not null,
  period_to   timestamptz not null,
  data        jsonb not null,          -- tout peman yo + lòt chif yo, jan yo te ye nan moman reset la
  created_at  timestamptz not null default now(),
  created_by  uuid,                    -- admin ki fè reset la (pa gen lyen: rapò a pa janm chanje)
  check (period_to > period_from)
);

alter table public.revenue_reports enable row level security;
drop policy if exists "Admin wè rapò achive yo" on public.revenue_reports;
create policy "Admin wè rapò achive yo" on public.revenue_reports for select to authenticated using ((select public.is_admin()));
-- Pa gen règ pou ekri: SÈLMAN admin_reset_revenue_report ka kreye yon rapò.

-- Menm baz done a pa kite pèsonn chanje oswa efase yon rapò achive
create or replace function public.revenue_reports_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Yon rapò achive pa ka modifye ni efase.';
end;
$$;

drop trigger if exists revenue_reports_frozen on public.revenue_reports;
create trigger revenue_reports_frozen
  before update or delete on public.revenue_reports
  for each row execute function public.revenue_reports_frozen();

-- Mo sekrè reset la: sere an hash nan app_secrets (pa janm nan kòd la).
-- Pou mete l oswa chanje l, kouri SÈLMAN nan SQL Editor Supabase:  select public.set_report_reset_word('...');
create or replace function public.set_report_reset_word(p_word text)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.app_secrets (key, value)
  values ('report_reset_word', extensions.crypt(upper(trim(p_word)), extensions.gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
$$;
revoke execute on function public.set_report_reset_word(text) from public, anon, authenticated;

-- RESET: anrejistre rapò a nan achiv, epi kontè a rekòmanse a zewo
create or replace function public.admin_reset_revenue_report(p_confirm text, p_word text, p_title text default null)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_hash  text;
  v_t0    timestamptz;
  v_t1    timestamptz := now();
  v_data  jsonb;
  v_id    uuid;
  v_title text;
  v_n     integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fè reset.';
  end if;
  if upper(trim(coalesce(p_confirm, ''))) <> 'RESET' then
    raise exception 'Ekri RESET pou konfime.';
  end if;
  select value into v_hash from public.app_secrets where key = 'report_reset_word';
  if v_hash is null then
    raise exception 'Mo sekrè reset la poko konfigire.';
  end if;
  if extensions.crypt(upper(trim(coalesce(p_word, ''))), v_hash) <> v_hash then
    raise exception 'Mo sekrè a pa bon.';
  end if;

  select coalesce(max(period_to), '2024-01-01 00:00:00-05'::timestamptz) into v_t0 from public.revenue_reports;
  if v_t1 - v_t0 < interval '1 minute' then
    raise exception 'Ou fèk fè yon reset. Tann yon ti moman.';
  end if;

  v_data := jsonb_build_object(
    'rows',   coalesce((select jsonb_agg(to_jsonb(x)) from public.admin_revenue_ledger_at(v_t0, v_t1) x), '[]'::jsonb),
    'extras', (select to_jsonb(e) from public.admin_revenue_extras_at(v_t0, v_t1) e)
  );

  select count(*) + 1 into v_n from public.revenue_reports;
  v_title := coalesce(nullif(left(trim(coalesce(p_title, '')), 120), ''),
                      'Rapò #' || v_n || ' · ' || to_char(v_t1 at time zone 'America/Port-au-Prince', 'DD/MM/YYYY'));
  if char_length(v_title) < 2 then
    v_title := 'Rapò #' || v_n;
  end if;

  insert into public.revenue_reports (title, period_from, period_to, data, created_by)
  values (v_title, v_t0, v_t1, v_data, auth.uid())
  returning id into v_id;

  perform public.audit('report.reset', 'revenue_reports', v_id, jsonb_build_object('from', v_t0, 'to', v_t1));
  return v_id;
end;
$$;

revoke execute on function public.admin_reset_revenue_report(text, text, text) from public, anon;
grant execute on function public.admin_reset_revenue_report(text, text, text) to authenticated;
