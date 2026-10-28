-- =====================================================================
-- SIPRIME KONT: opsyon « prèv yo te fo »
--  Yon kont ka gen yon enskripsyon (oswa Pro, boost, kredi) ki te make "peye"
--  ak yon FO prèv: lajan an pa t janm rive. Admin nan ka siprime l kanmenm si l
--  tcheke « Prèv peman yo te fo ».
--  - Sa debloke sèlman peman ki te fèt AK PRÈV (enskripsyon, Pro, boost, kredi).
--  - Don, revni atis ak retrè toujou bloke siprime a (se lajan lòt moun).
--  - Tout peman ki efase yo anrejistre nan jounal sekirite a (kantite + montan).
-- =====================================================================

drop function if exists public.admin_delete_account(uuid, text, text);

create or replace function public.admin_delete_account(p_user uuid, p_confirm text, p_word text, p_fake_proofs boolean default false)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_hash    text;
  v_name    text;
  v_email   text;
  v_admin   boolean;
  v_money   text[] := '{}';
  v_proofs  text[] := '{}';
  v_removed jsonb;
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

  -- Lajan lòt moun (don, revni, retrè): toujou bloke
  if exists (select 1 from public.donations where artist_id = p_user and status = 'verified') then v_money := v_money || 'don'::text; end if;
  if exists (select 1 from public.earnings where artist_id = p_user) then v_money := v_money || 'revni'::text; end if;
  if exists (select 1 from public.payouts where artist_id = p_user and status in ('paid', 'pending')) then v_money := v_money || 'retrè'::text; end if;
  if array_length(v_money, 1) > 0 then
    raise exception 'Kont sa a gen lajan atis anrejistre (%): siprime l ta efase lajan lòt moun. Bloke l pito.', array_to_string(v_money, ', ');
  end if;

  -- Peman ak prèv (enskripsyon, Pro, boost, kredi): debloke sèlman si admin nan di prèv yo te fo
  if exists (select 1 from public.artist_registrations where artist_id = p_user and status = 'verified') then v_proofs := v_proofs || 'enskripsyon peye'::text; end if;
  if exists (select 1 from public.pro_requests where artist_id = p_user and status = 'active') then v_proofs := v_proofs || 'Pro'::text; end if;
  if exists (select 1 from public.boost_purchases where artist_id = p_user and status = 'active') then v_proofs := v_proofs || 'boost'::text; end if;
  if exists (select 1 from public.credit_purchases where user_id = p_user and status = 'verified') then v_proofs := v_proofs || 'kredi'::text; end if;
  if array_length(v_proofs, 1) > 0 and not coalesce(p_fake_proofs, false) then
    raise exception 'Kont sa a gen peman anrejistre (%). Si prèv yo te fo (lajan an pa t janm rive), tcheke « Prèv peman yo te fo » epi eseye ankò.', array_to_string(v_proofs, ', ');
  end if;

  -- Jounal sekirite: kisa ki efase ak kont lan
  v_removed := jsonb_build_object(
    'registrations', (select coalesce(jsonb_agg(jsonb_build_object('htg', amount_htg, 'usd', amount_usd, 'ref', transaction_ref)), '[]'::jsonb)
                      from public.artist_registrations where artist_id = p_user and status = 'verified'),
    'pro',           (select coalesce(jsonb_agg(jsonb_build_object('htg', amount_htg, 'months', months)), '[]'::jsonb)
                      from public.pro_requests where artist_id = p_user and status = 'active'),
    'boosts',        (select coalesce(jsonb_agg(jsonb_build_object('htg', amount, 'days', duration_days)), '[]'::jsonb)
                      from public.boost_purchases where artist_id = p_user and status = 'active'),
    'credits',       (select coalesce(jsonb_agg(jsonb_build_object('htg', amount_htg, 'credits', credits)), '[]'::jsonb)
                      from public.credit_purchases where user_id = p_user and status = 'verified')
  );

  perform public.audit('account.deleted', 'profiles', p_user,
    jsonb_build_object('name', v_name, 'email', v_email, 'fake_proofs', coalesce(p_fake_proofs, false), 'removed_payments', v_removed));
  delete from auth.users where id = p_user;
  return v_name;
end;
$$;

revoke execute on function public.admin_delete_account(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_delete_account(uuid, text, text, boolean) to authenticated;
