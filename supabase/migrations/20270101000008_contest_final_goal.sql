-- =====================================================================
-- 🎄 KONKOU NWÈL: objektif FINAL la (faz 3) = 1 000 vòt
--  Yon chanpyon dwe rive omwen 1 000 vòt pou l konsidere kòm yon chanpyon solid.
--  Paj la montre ba pwogrè a jiska 1 000 pou 5 finalis yo.
-- =====================================================================

alter table public.contests
  add column if not exists phase3_goal integer not null default 1000 check (phase3_goal >= 1);
