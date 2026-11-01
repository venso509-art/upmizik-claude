-- =====================================================================
-- RAPÒ: KONT PA MOUN (admin)
--  Pou chak atis ak chak manm afilye: tout lajan ki antre pou yo nan peryòd la,
--  sa ki pou yo, sa ki pou sit la, sa ki deja peye, ak sa ki RETE pou peye jodi a.
--  - admin_people_artists(t0, t1): don + kado live + retrè + balans (+ detay chak don/live)
--  - admin_people_members(t0, t1): atis yo fè enskri + pa manm nan / pa sit la + peman (+ detay)
--  Admin sèlman. Pa gen okenn chanjman nan tab yo.
-- =====================================================================

create or replace function public.admin_people_artists(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  artist_id     uuid,
  name          text,
  avatar_url    text,
  don_count     bigint,
  don_gross     numeric,   -- don ki antre pou chante/pwofil atis la
  don_site      numeric,   -- 15 % sit la sou don sa yo
  earn_don      numeric,   -- pa atis la sou don (pwòp chante l + featuring sou chante lòt atis)
  live_count    bigint,
  live_gross    numeric,   -- valè kado live yo
  live_artist   numeric,   -- pa atis la sou kado yo
  paid_htg      numeric,   -- retrè ki peye nan peryòd la
  available_htg numeric,   -- RETE POU PEYE jodi a (balans disponib)
  pending_htg   numeric,   -- retrè atis la mande, ki poko peye
  month_htg     numeric,   -- revni mwa sa a (ap vin disponib apre mwa a fini)
  detail        jsonb      -- chak don ak chak live, pi resan an premye
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
  ), ed as (
    select e.artist_id, sum(e.amount_htg) as amt
    from public.earnings e
    where e.donation_id is not null and e.kind = 'artist' and e.earned_at >= p_t0 and e.earned_at < p_t1
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

revoke execute on function public.admin_people_artists(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_people_artists(timestamptz, timestamptz) to authenticated;

create or replace function public.admin_people_members(p_t0 timestamptz, p_t1 timestamptz)
returns table (
  member_id   uuid,
  user_id     uuid,
  name        text,
  full_name   text,
  pseudo      text,
  phone       text,
  status      text,
  objective   integer,
  referred    bigint,    -- atis apwouve ki konte pou li nan peryòd la
  reg_htg     numeric,   -- frè enskripsyon atis sa yo te peye
  member_usd  numeric,   -- pa manm nan
  member_htg  numeric,
  site_htg    numeric,   -- rès frè enskripsyon an pou sit la
  paid_usd    numeric,   -- sa w te peye l nan peryòd la
  paid_htg    numeric,
  owed_usd    numeric,   -- RETE POU PEYE: mwa ki fini ki poko peye (tout tan)
  current_usd numeric,   -- mwa sa a (ap peye apre mwa a fini)
  detail      jsonb      -- chak atis li fè enskri nan peryòd la
)
language sql
stable
security definer set search_path = ''
as $$
  with rate as (
    select coalesce((select htg_per_usd from public.settings where id), 145)::numeric as v
  ), cur as (
    select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m
  ), ref as (
    select p.id as artist_id, p.display_name, p.referral_counted_at, m.id as member_id,
           date_trunc('month', p.referral_counted_at at time zone 'America/Port-au-Prince')::date as mon,
           case when row_number() over (
                  partition by m.id, date_trunc('month', p.referral_counted_at at time zone 'America/Port-au-Prince')
                  order by p.referral_counted_at, p.id
                ) <= m.objective_total then 1.00 else 2.50 end as usd
    from public.profiles p
    join public.members m on m.id = p.referred_by_member_id
    where p.referral_counted_at is not null
  ), reg as (
    select distinct on (r.artist_id) r.artist_id, r.amount_htg, r.amount_usd
    from public.artist_registrations r
    where r.status = 'verified'
    order by r.artist_id, coalesce(r.reviewed_at, r.created_at) desc
  ), inp as (
    select f.*, coalesce(rg.amount_htg, 0) as reg_htg,
           round(f.usd * coalesce(rg.amount_htg / nullif(rg.amount_usd, 0), (select v from rate)), 2) as usd_htg
    from ref f
    left join reg rg on rg.artist_id = f.artist_id
    where f.referral_counted_at >= p_t0 and f.referral_counted_at < p_t1
  ), monthly as (
    select f.member_id, f.mon, sum(f.usd) as usd from ref f group by 1, 2
  ), owed as (
    select mo.member_id,
           coalesce(sum(mo.usd) filter (
             where mo.mon < (select m from cur)
               and not exists (select 1 from public.member_payouts mp where mp.member_id = mo.member_id and mp.period = mo.mon)
           ), 0) as owed,
           coalesce(sum(mo.usd) filter (where mo.mon = (select m from cur)), 0) as cur_usd
    from monthly mo
    group by 1
  ), paid as (
    select mp.member_id, sum(mp.amount_usd) as usd, sum(mp.amount_htg) as htg
    from public.member_payouts mp
    where mp.paid_at >= p_t0 and mp.paid_at < p_t1
    group by 1
  ), rows_ as (
    select m.id, m.user_id, coalesce(nullif(trim(m.nickname), ''), m.full_name) as name, m.full_name, m.pseudo_referral, m.phone,
           m.status, m.objective_total,
           (select count(*) from inp where inp.member_id = m.id) as referred,
           coalesce((select sum(reg_htg) from inp where inp.member_id = m.id), 0) as reg_htg,
           coalesce((select sum(usd) from inp where inp.member_id = m.id), 0) as member_usd,
           coalesce((select sum(usd_htg) from inp where inp.member_id = m.id), 0) as member_htg,
           coalesce(paid.usd, 0) as paid_usd,
           coalesce(paid.htg, 0) as paid_htg,
           coalesce(owed.owed, 0) as owed_usd,
           coalesce(owed.cur_usd, 0) as current_usd,
           coalesce((
             select jsonb_agg(jsonb_build_object('name', inp.display_name, 'at', inp.referral_counted_at, 'usd', inp.usd,
                                                 'reg_htg', inp.reg_htg, 'usd_htg', inp.usd_htg)
                              order by inp.referral_counted_at desc)
             from inp where inp.member_id = m.id
           ), '[]'::jsonb) as detail
    from public.members m
    left join paid on paid.member_id = m.id
    left join owed on owed.member_id = m.id
  )
  select r.id, r.user_id, r.name, r.full_name, r.pseudo_referral, r.phone, r.status, r.objective_total, r.referred, r.reg_htg,
         r.member_usd, r.member_htg, greatest(r.reg_htg - r.member_htg, 0), r.paid_usd, r.paid_htg, r.owed_usd, r.current_usd, r.detail
  from rows_ r
  where public.is_admin()
    and (r.status = 'approved' or r.referred > 0 or r.paid_usd > 0 or r.owed_usd > 0)
  order by r.owed_usd desc, r.member_usd desc, r.name;
$$;

revoke execute on function public.admin_people_members(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_people_members(timestamptz, timestamptz) to authenticated;
