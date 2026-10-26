-- =====================================================================
-- BOOST: nouvo plan yo → 24 è, 48 è (2 jou), 7 jou, 1 mwa
-- Pri yo se yon baz: admin ka chanje yo nan Admin → Demann Boost → « Plan ak pri ».
-- Plan "2 semèn" lan dezaktive (pa efase: demann ki te itilize l yo kenbe istwa yo).
-- =====================================================================

insert into public.boost_plans (id, label, days, price_htg, active, sort) values
  ('24-e',    '24 è',        1,  200,  true, 1),
  ('48-e',    '48 è (2 jou)', 2,  350,  true, 2),
  ('1-semen', '7 jou',        7,  1000, true, 3),
  ('1-mwa',   '1 mwa',        30, 3500, true, 4)
on conflict (id) do update
  set label = excluded.label, days = excluded.days, active = true, sort = excluded.sort;

update public.boost_plans set active = false, sort = 9 where id = '2-semen';
