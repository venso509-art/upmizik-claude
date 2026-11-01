-- =====================================================================
-- 🎄 KONKOU NWÈL: switch "Montre konkou a sou sit la"
--  Etenn (pa defo): bouton Sosyal la rete nan ba anba a; lyen konkou yo ak seksyon paj akèy la kache.
--  Limen: bouton 🎄 Nwèl la ranplase Sosyal, lyen yo parèt nan meni yo, ekip yo parèt sou paj akèy la.
-- =====================================================================

alter table public.contests
  add column if not exists published boolean not null default false;
