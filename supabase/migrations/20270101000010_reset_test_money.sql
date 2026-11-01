-- =====================================================================
-- 🧹 REMÈT REVNI SIT LA A ZEWO (tout lajan anvan jodi a te tès)
--  Dat limit: 1ye novanm 2026, minwi lè Ayiti. Sa ki fèt ANVAN li efase; sa ki fèt APRE li rete.
--  EFASE:
--    💝 don + revni atis (earnings) + retrè (payouts)
--    🎤 peman enskripsyon, demann Pro, achte Boost
--    🪙 achte kredi, tranzaksyon kredi, kado live (balans kredi yo kalkile ankò)
--  RETE JAN YO YE:
--    kont atis yo, badj Pro yo ak Boost aktif yo (ou te bay yo gratis)
--    relve mwa ki fèmen yo, rapò achive yo, peman manm afilye yo
--    ekout, chante, pòs, abone... (pa gen anyen ki pa lajan ki touche)
--  KOPI SEKIRITE: tout sa ki efase kopye anvan nan schema « backup_20261101 »
--  (pa vizib sou sit la; ou ka gade l nan Supabase → Table Editor → schema backup_20261101).
--  Kouri l YON SÈL FWA.
-- =====================================================================

begin;

-- ---------- 1. Kopi sekirite ----------
create schema if not exists backup_20261101;
revoke all on schema backup_20261101 from public, anon, authenticated;

create table if not exists backup_20261101.donations          as select * from public.donations          where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.earnings           as select * from public.earnings;
create table if not exists backup_20261101.payouts            as select * from public.payouts            where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.artist_registrations as select * from public.artist_registrations where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.pro_requests       as select * from public.pro_requests       where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.boost_purchases    as select * from public.boost_purchases    where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.credit_purchases   as select * from public.credit_purchases   where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.credit_transactions as select * from public.credit_transactions where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.credit_wallets     as select * from public.credit_wallets;
create table if not exists backup_20261101.live_gifts         as select * from public.live_gifts         where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
create table if not exists backup_20261101.live_earnings_summary as select * from public.live_earnings_summary;

-- ---------- 2. Don, revni, retrè ----------
delete from public.payouts   where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
-- Efase don yo efase revni ki soti nan yo tou (earnings → on delete cascade)
delete from public.donations where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';

-- ---------- 3. Peman sit la ----------
delete from public.artist_registrations where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
delete from public.pro_requests         where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
delete from public.boost_purchases      where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';

-- ---------- 4. Kredi live + kado live ----------
-- Efase kado yo efase revni live atis yo tou (earnings → on delete cascade)
delete from public.live_gifts          where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
delete from public.credit_transactions where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';
delete from public.credit_purchases    where created_at < '2026-11-01 00:00:00 America/Port-au-Prince';

-- Lajan live ki te anvan jodi a: a zewo (live yo li menm rete, ak vizitè yo ak like yo)
update public.live_earnings_summary s
set gift_credits = 0, gift_htg = 0, artist_htg = 0, platform_htg = 0
from public.lives l
where l.id = s.live_id and l.started_at < '2026-11-01 00:00:00 America/Port-au-Prince';
update public.lives set gifts_count = 0 where started_at < '2026-11-01 00:00:00 America/Port-au-Prince';

-- Balans kredi chak moun: sèlman sa ki rete apre jodi a (pi piti 0)
update public.credit_wallets w
set balance = greatest(coalesce((select sum(t.delta) from public.credit_transactions t where t.user_id = w.user_id), 0), 0),
    updated_at = now();

-- ---------- 5. Nivo don atis yo (🔥 Zetwal k ap monte, ⭐ Zetwal...) ki te soti nan don tès yo ----------
create table if not exists backup_20261101.artist_level_events as select * from public.artist_level_events where kind = 'donations';
delete from public.artist_level_events e
where e.kind = 'donations' and e.threshold > 0
  and e.threshold > (select t.donations_usd from public.artist_totals(e.artist_id) t);

-- ---------- 6. Jounal sekirite ----------
select public.audit('money.reset_tests', 'donations', null, jsonb_build_object('before', '2026-11-01 America/Port-au-Prince', 'backup_schema', 'backup_20261101'));

commit;

-- Rezilta: kantite ki rete (dwe 0 oswa sèlman sa ki fèt jodi a)
select
  (select count(*) from public.donations)            as don,
  (select count(*) from public.earnings)             as revni_atis,
  (select count(*) from public.payouts)              as retre,
  (select count(*) from public.artist_registrations) as enskripsyon,
  (select count(*) from public.pro_requests)         as pro,
  (select count(*) from public.boost_purchases)      as boost,
  (select count(*) from public.credit_purchases)     as kredi,
  (select count(*) from public.live_gifts)           as kado_live;
