-- =====================================================================
-- ADMIN: SIPRIME YON KONT NÈT (pa sèlman bloke l)
--  - Admin nan ekri SIPRIME + mo sekrè a (menm mo ak reset rapò a, sere an hash).
--  - Kont lan efase nan auth.users: pwofil la, chante yo, pòs yo, stati yo... ale avè l (on delete cascade).
--  - Pwoteksyon:
--      * Pa ka siprime pwòp kont ou, ni kont yon lòt admin.
--      * Pa ka siprime yon kont ki gen lajan anrejistre (don, enskripsyon peye, Pro, boost,
--        kredi, retrè, revni): sa ta efase istwa lajan sit la. Pou kont sa yo: bloke yo.
--  - Chak siprime anrejistre nan jounal sekirite a (audit), ak non ak imèl kont lan.
-- =====================================================================

create or replace function public.admin_delete_account(p_user uuid, p_confirm text, p_word text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_hash  text;
  v_name  text;
  v_email text;
  v_admin boolean;
  v_money text[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka siprime yon kont.';
  end if;
  if upper(trim(coalesce(p_confirm, ''))) <> 'SIPRIME' then
    raise exception 'Ekri SIPRIME pou konfime.';
  end if;
  select value into v_hash from public.app_secrets where key = 'report_reset_word';
  if v_hash is null then
    raise exception 'Mo sekrè a poko konfigire.';
  end if;
  if extensions.crypt(upper(trim(coalesce(p_word, ''))), v_hash) <> v_hash then
    raise exception 'Mo sekrè a pa bon.';
  end if;
  if p_user = auth.uid() then
    raise exception 'Ou pa ka siprime pwòp kont ou.';
  end if;

  select p.display_name, p.is_admin, u.email into v_name, v_admin, v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user;
  if v_name is null then
    raise exception 'Kont sa a pa egziste.';
  end if;
  if v_admin then
    raise exception 'Ou pa ka siprime kont yon admin.';
  end if;

  -- Lajan ki anrejistre sou kont lan: nou pa efase istwa lajan sit la
  if exists (select 1 from public.donations where artist_id = p_user and status = 'verified') then v_money := v_money || 'don'::text; end if;
  if exists (select 1 from public.artist_registrations where artist_id = p_user and status = 'verified') then v_money := v_money || 'enskripsyon peye'::text; end if;
  if exists (select 1 from public.pro_requests where artist_id = p_user and status = 'active') then v_money := v_money || 'Pro'::text; end if;
  if exists (select 1 from public.boost_purchases where artist_id = p_user and status = 'active') then v_money := v_money || 'boost'::text; end if;
  if exists (select 1 from public.credit_purchases where user_id = p_user and status = 'verified') then v_money := v_money || 'kredi'::text; end if;
  if exists (select 1 from public.payouts where artist_id = p_user and status in ('paid', 'pending')) then v_money := v_money || 'retrè'::text; end if;
  if exists (select 1 from public.earnings where artist_id = p_user) then v_money := v_money || 'revni'::text; end if;
  if array_length(v_money, 1) > 0 then
    raise exception 'Kont sa a gen lajan anrejistre (%): siprime l ta efase istwa lajan sit la. Bloke l pito.', array_to_string(v_money, ', ');
  end if;

  perform public.audit('account.deleted', 'profiles', p_user, jsonb_build_object('name', v_name, 'email', v_email));
  delete from auth.users where id = p_user;
  return v_name;
end;
$$;

revoke execute on function public.admin_delete_account(uuid, text, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text, text) to authenticated;
