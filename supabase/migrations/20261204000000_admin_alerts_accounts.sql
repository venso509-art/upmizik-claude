-- =====================================================================
-- ADMIN: notifikasyon (ak son) pou chak nouvo enskripsyon / don, ak detay kont yo nan Sekirite
-- Remak: modpas yo PA janm vizib. Supabase sere yo chifre (bcrypt), pèsonn pa ka li yo, menm admin.
-- =====================================================================

-- Voye yon notifikasyon bay tout admin yo
create function public.notify_admins(p_type public.notification_type, p_title text, p_body text, p_link text)
returns void
language sql
security definer set search_path = ''
as $$
  select public.notify(p.id, p_type, p_title, p_body, p_link) from public.profiles p where p.is_admin;
$$;

revoke execute on function public.notify_admins(public.notification_type, text, text, text) from public, anon, authenticated;

-- 1. Nouvo don (prèv voye, ap tann validasyon)
create function public.alert_admins_new_donation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_artist text;
begin
  select display_name into v_artist from public.profiles where id = new.artist_id;
  perform public.notify_admins('donation', '💝 Nouvo don: $' || new.amount_usd::text,
    coalesce(nullif(trim(new.donor_name), ''), 'Yon fanatik') || ' voye yon don pou ' || coalesce(v_artist, 'yon atis') || '. Verifye prèv la.',
    '/admin/don');
  return new;
end;
$$;

create trigger donations_alert_admins
  after insert on public.donations
  for each row execute function public.alert_admins_new_donation();

-- 2. Nouvo enskripsyon atis (prèv frè enskripsyon an voye)
create function public.alert_admins_new_registration()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  select display_name into v_name from public.profiles where id = new.artist_id;
  perform public.notify_admins('registration', '🎤 Nouvo enskripsyon atis',
    coalesce(v_name, 'Yon atis') || ' voye prèv frè enskripsyon an ($' || new.amount_usd::text || '). Verifye l.',
    '/admin/enskripsyon');
  return new;
end;
$$;

create trigger artist_registrations_alert_admins
  after insert on public.artist_registrations
  for each row execute function public.alert_admins_new_registration();

-- 3. Nouvo kont koutè (atis yo deja sonnen ak enskripsyon an pi wo a)
create function public.alert_admins_new_listener()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.role = 'listener' then
    perform public.notify_admins('account', '👤 Nouvo koutè enskri', coalesce(new.display_name, 'Yon moun') || ' fèk kreye yon kont.', '/admin/sekirite');
  end if;
  return new;
end;
$$;

create trigger profiles_alert_admins_new_listener
  after insert on public.profiles
  for each row execute function public.alert_admins_new_listener();

-- ---------------------------------------------------------------------
-- 4. DETAY KONT YO pou admin (Sekirite): non, wòl, imèl, telefòn, dat kreyasyon, dènye koneksyon
-- ---------------------------------------------------------------------
create function public.admin_accounts(p_limit integer default 100)
returns table (
  id uuid,
  display_name text,
  role text,
  status text,
  email text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean
)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.role::text, p.status::text, u.email::text, ap.phone,
         u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.artist_private ap on ap.user_id = p.id
  where public.is_admin()
  order by u.created_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.admin_accounts(integer) from public, anon;
grant execute on function public.admin_accounts(integer) to authenticated;
