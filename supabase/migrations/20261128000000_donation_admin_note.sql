-- ❌ Rezon admin nan refize yon don (pou istwa a, ak pou mesaj li voye bay moun ki te fè don an)
alter table public.donations add column admin_note text check (char_length(admin_note) <= 500);
