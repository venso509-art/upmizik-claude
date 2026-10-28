-- =====================================================================
-- RAPÒ REVNI (admin): tout lajan ki antre sou sit la, nan yon sèl lis
--  - Chak peman: kiyès ki peye, pou kiyès, metòd, referans, total,
--    PA SIT LA ak PA POU PATAJE (atis, featuring, manm).
--  - Enskripsyon yon atis yon manm fè enskri: pa manm nan separe
--    (1 $ pa atis jiska objektif la, 2,50 $ apre sa, menm kalkil ak peman manm yo).
-- Admin sèlman (is_admin). Pa gen okenn chanjman nan tab yo.
-- =====================================================================

create or replace function public.admin_revenue_ledger(p_from date, p_to date)
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
  rng as (
    select (p_from::timestamp at time zone 'America/Port-au-Prince') as t0,
           ((p_to + 1)::timestamp at time zone 'America/Port-au-Prince') as t1
  ),
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

-- Lòt chif pou menm peryòd la: kado live, frè lojistik, sa ki deja peye
create or replace function public.admin_revenue_extras(p_from date, p_to date)
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
  with rng as (
    select (p_from::timestamp at time zone 'America/Port-au-Prince') as t0,
           ((p_to + 1)::timestamp at time zone 'America/Port-au-Prince') as t1
  )
  select
    coalesce((select sum(s.gift_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    coalesce((select sum(s.artist_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    coalesce((select sum(s.platform_htg) from public.live_earnings_summary s join public.lives l on l.id = s.live_id
              where l.started_at >= (select t0 from rng) and l.started_at < (select t1 from rng)), 0),
    coalesce((select sum(f.fee_htg) from public.finance_month_rows() f
              where f.month >= date_trunc('month', p_from)::date and f.month <= p_to), 0),
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

revoke execute on function public.admin_revenue_ledger(date, date) from public, anon;
grant execute on function public.admin_revenue_ledger(date, date) to authenticated;
revoke execute on function public.admin_revenue_extras(date, date) from public, anon;
grant execute on function public.admin_revenue_extras(date, date) to authenticated;
