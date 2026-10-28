-- =====================================================================
-- KACHE "is_admin": pèsonn pa ka chache ki kont ki admin
--  Avan: nenpòt moun (menm san kont) te ka mande Supabase
--        "profiles?is_admin=eq.true" epi jwenn non kont admin yo.
--  Kounya: kolòn is_admin lan pa li pou anon/authenticated ankò.
--   - Sit la itilize fonksyon is_admin() (li di sèlman si OU MENM se admin).
--   - Lis admin yo: fonksyon admin_ids() (admin sèlman).
--   - Tout fonksyon SQL ki "security definer" yo (notify_admins, elatriye) kontinye mache.
--  NB POU PI DEVAN: si yon migration ajoute yon nouvo kolòn nan profiles,
--  li dwe fè:  grant select (nouvo_kolòn) on public.profiles to anon, authenticated;
-- =====================================================================

do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name <> 'is_admin';

  execute 'revoke select on public.profiles from anon, authenticated';
  execute format('grant select (%s) on public.profiles to anon, authenticated', v_cols);
end;
$$;

-- Lis id admin yo (pou paj Sekirite admin nan)
create or replace function public.admin_ids()
returns setof uuid
language sql
stable
security definer set search_path = ''
as $$
  select p.id from public.profiles p where p.is_admin and public.is_admin();
$$;

revoke execute on function public.admin_ids() from public, anon;
grant execute on function public.admin_ids() to authenticated;
