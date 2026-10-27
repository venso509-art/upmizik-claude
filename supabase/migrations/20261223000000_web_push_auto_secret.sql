-- =====================================================================
-- PUSH: baz done a kreye PWÒP sekrè li (pa gen etap manyèl ankò).
-- Sit la pa bezwen konnen l: li pase sekrè siyal la bay push_targets, e se baz done a ki verifye l.
-- (Ranplase nenpòt sekrè ki te mete alamen, pa egzanp yon valè egzanp ki te rete.)
-- =====================================================================

insert into public.app_secrets (key, value)
values ('push', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do update set value = excluded.value;
