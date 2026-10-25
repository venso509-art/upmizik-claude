-- =====================================================================
-- LIVE: Lyon an koute 250 kredi (250 goud). Lòd kado yo swiv pri yo.
-- =====================================================================
update public.live_gift_types set credits = 250 where id = 'lyon';

update public.live_gift_types set sort = v.sort
from (values ('rose', 1), ('kafe', 2), ('konpa', 3), ('tanbou', 4), ('kouwon', 5),
             ('avyon', 6), ('fize', 7), ('lyon', 8), ('chato', 9), ('diaman', 10)) as v(id, sort)
where live_gift_types.id = v.id;
