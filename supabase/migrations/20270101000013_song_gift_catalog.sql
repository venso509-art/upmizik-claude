-- =====================================================================
-- 🎁 KATALÒG KADO MIZIK YO: 5 nivo, 20 kado (250 → 5 000 kredi; 1 kredi = 1 goud)
--  Nivo 0: ti kado live yo (🌹 ☕ … 💎) rete disponib toupatou.
--  Nivo 1-5: kado espesyal pou CHANTE yo sèlman (pa nan live la, kote ekran an twò piti).
-- =====================================================================

alter table public.live_gift_types
  add column if not exists tier  smallint not null default 0 check (tier between 0 and 5),
  add column if not exists scope text not null default 'all' check (scope in ('all', 'live', 'song'));

insert into public.live_gift_types (id, name, emoji, credits, sort, tier, scope) values
  -- Nivo 1 · Ti Bourad
  ('m_mikwo_lakou',   'Mikwo Lakou',     '🎤', 250,  101, 1, 'song'),
  ('m_radyo_lakay',   'Radyo Lakay',     '📻', 500,  102, 1, 'song'),
  ('m_kask_dj',       'Kask DJ',         '🎧', 750,  103, 1, 'song'),
  ('m_bal_lakou',     'Bal Lakou',       '💃', 1000, 104, 1, 'song'),
  -- Nivo 2 · Bèl Jès
  ('m_gita_twoubadou','Gita Twoubadou',  '🎸', 1250, 201, 2, 'song'),
  ('m_klavye_konpa',  'Klavye Konpa',    '🎹', 1500, 202, 2, 'song'),
  ('m_saks_kadans',   'Saks Kadans',     '🎷', 1750, 203, 2, 'song'),
  ('m_twonpet_rara',  'Twonpèt Rara',    '🎺', 2000, 204, 2, 'song'),
  -- Nivo 3 · Gwo Lanmou
  ('m_vyolon_lakay',  'Vyolon Lakay',    '🎻', 2250, 301, 3, 'song'),
  ('m_tanbou_asoto',  'Tanbou Asotò',    '🪘', 2500, 302, 3, 'song'),
  ('m_kon_lanbi',     'Kòn Lanbi',       '🐚', 2750, 303, 3, 'song'),
  ('m_akodeyon',      'Akòdeyon Mereng', '🪗', 3000, 304, 3, 'song'),
  -- Nivo 4 · Prestij
  ('m_pyano_wa',      'Pyano Wa',        '🎼', 3250, 401, 4, 'song'),
  ('m_tab_miksaj',    'Tab Miksaj',      '🎚️', 3500, 402, 4, 'song'),
  ('m_mikwo_estidyo', 'Mikwo Estidyo',   '🎙️', 3750, 403, 4, 'song'),
  ('m_gita_elektrik', 'Gita Elektrik',   '⚡', 4000, 404, 4, 'song'),
  -- Nivo 5 · Lejann
  ('m_sono_bal',      'Sono Bal',        '🔊', 4250, 501, 5, 'song'),
  ('m_cha_kanaval',   'Cha Kanaval',     '🎪', 4500, 502, 5, 'song'),
  ('m_disk_lo',       'Disk Lò',         '💿', 4750, 503, 5, 'song'),
  ('m_kouwon_lejann', 'Kouwòn Lejann',   '🏆', 5000, 504, 5, 'song')
on conflict (id) do nothing;

-- Kado mizik yo pa ka voye nan live; kado "live" yo pa ka voye sou chante
create or replace function public.gift_allowed_check()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_scope text;
begin
  select scope into v_scope from public.live_gift_types where id = new.gift_id;
  if v_scope = 'song' and tg_table_name = 'live_gifts' then
    raise exception 'Kado sa a se pou chante yo sèlman';
  end if;
  if v_scope = 'live' and tg_table_name = 'song_gifts' then
    raise exception 'Kado sa a se pou live yo sèlman';
  end if;
  return new;
end;
$$;

drop trigger if exists live_gifts_scope on public.live_gifts;
create trigger live_gifts_scope before insert on public.live_gifts
  for each row execute function public.gift_allowed_check();
drop trigger if exists song_gifts_scope on public.song_gifts;
create trigger song_gifts_scope before insert on public.song_gifts
  for each row execute function public.gift_allowed_check();
