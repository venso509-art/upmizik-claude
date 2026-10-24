-- =====================================================================
-- CHANJE MODPAS AK YON KÒD (san imèl otomatik)
-- 1. Moun nan mande yon kòd (request_password_reset): sit la kreye yon kòd 6 chif pou kont li
--    epi li voye yon notifikasyon bay admin yo.
-- 2. Admin nan voye kòd la bay moun nan sou WhatsApp oswa pa imèl (/admin/modpas).
-- 3. Moun nan mete kòd la sou paj Konekte a epi li chwazi yon nouvo modpas (reset_password_with_code).
-- Sekirite: 5 move kòd → demann lan bloke; 3 demann maksimòm pa 24 è; kòd la valab 48 è.
-- =====================================================================

create table public.password_resets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  email        text not null,
  contact_kind text not null check (contact_kind in ('whatsapp', 'email')),
  contact      text not null check (char_length(contact) between 5 and 120),
  code         text not null check (code ~ '^\d{6}$'),
  status       text not null default 'pending' check (status in ('pending', 'sent', 'used', 'locked', 'cancelled')),
  attempts     integer not null default 0,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '48 hours',
  sent_at      timestamptz,
  used_at      timestamptz
);

create index password_resets_user_idx on public.password_resets (user_id, created_at desc);
create index password_resets_status_idx on public.password_resets (status, created_at desc);

alter table public.password_resets enable row level security;

-- Se admin yo SÈLMAN ki ka wè demann yo (ak kòd yo). Moun nan pase pa fonksyon anba yo.
create policy "Admin wè demann modpas yo" on public.password_resets
  for select to authenticated using (public.is_admin());

-- Demann ki aktif pou yon imèl (pa itilize, pa bloke, pa ekspire)
create function public.active_password_reset(p_email text)
returns public.password_resets
language sql
stable
security definer set search_path = ''
as $$
  select r.* from public.password_resets r
  where r.email = lower(trim(p_email)) and r.status in ('pending', 'sent') and r.expires_at > now()
  order by r.created_at desc
  limit 1;
$$;

revoke execute on function public.active_password_reset(text) from public, anon, authenticated;

-- 1. Mande yon kòd. Pa di anyen si imèl la pa gen kont, pou pèsonn pa ka devine ki imèl ki enskri.
create function public.request_password_reset(p_email text, p_contact_kind text, p_contact text)
returns void
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_contact text := trim(p_contact);
  v_user uuid;
  v_name text;
  v_code text;
begin
  if p_contact_kind not in ('whatsapp', 'email') then raise exception 'Chwazi WhatsApp oswa imèl.'; end if;
  if char_length(v_contact) < 5 or char_length(v_contact) > 120 then raise exception 'Mete yon kontak valid.'; end if;

  select u.id into v_user from auth.users u where lower(u.email) = v_email;
  if v_user is null then return; end if;

  -- Pa plis pase 3 demann pa 24 è pou menm kont lan
  if (select count(*) from public.password_resets where user_id = v_user and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Ou deja voye 3 demann jodi a. Tann kòd ekip UpMizik la, oswa eseye ankò demen.';
  end if;

  -- Ansyen demann ki te aktif yo pa valab ankò: se dènye kòd la sèlman ki mache
  update public.password_resets set status = 'cancelled'
  where user_id = v_user and status in ('pending', 'sent');

  v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');

  insert into public.password_resets (user_id, email, contact_kind, contact, code)
  values (v_user, v_email, p_contact_kind, v_contact, v_code);

  select display_name into v_name from public.profiles where id = v_user;
  perform public.notify_admins('account', '🔑 Demann chanje modpas',
    coalesce(v_name, 'Yon moun') || ' (' || v_email || ') bliye modpas li. Voye kòd la ba li sou ' ||
    case when p_contact_kind = 'whatsapp' then 'WhatsApp: ' else 'imèl: ' end || v_contact || '.',
    '/admin/modpas');
end;
$$;

revoke execute on function public.request_password_reset(text, text, text) from public;
grant execute on function public.request_password_reset(text, text, text) to anon, authenticated;

-- Èske imèl sa a gen yon demann aktif? (pou paj Konekte a montre espas kòd la)
create function public.has_password_reset(p_email text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select (public.active_password_reset(p_email)).id is not null;
$$;

revoke execute on function public.has_password_reset(text) from public;
grant execute on function public.has_password_reset(text) to anon, authenticated;

-- Verifye kòd la (konte chak move tantativ; 5 → demann lan bloke).
-- Retounen yon mesaj erè olye "raise exception", pou kontè tantativ yo pa anile.
create function public.check_reset_code(p_email text, p_code text, out r_id uuid, out r_error text)
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  r public.password_resets;
begin
  r := public.active_password_reset(p_email);
  if r.id is null then
    r_error := 'Pa gen demann aktif pou imèl sa a (oswa kòd la ekspire). Mande yon nouvo kòd.';
    return;
  end if;
  if r.code <> trim(coalesce(p_code, '')) then
    update public.password_resets
    set attempts = attempts + 1, status = case when attempts + 1 >= 5 then 'locked' else status end
    where id = r.id;
    r_error := case when r.attempts + 1 >= 5
      then 'Twòp move kòd. Demann sa a bloke: mande yon nouvo kòd.'
      else 'Kòd la pa bon. Ou rete ' || (5 - (r.attempts + 1))::text || ' tantativ.' end;
    return;
  end if;
  r_id := r.id;
end;
$$;

revoke execute on function public.check_reset_code(text, text) from public, anon, authenticated;

-- 2a. Etap "Verifye kòd la" (san chanje anyen toujou). null = kòd la bon, sinon mesaj erè a.
create function public.verify_reset_code(p_email text, p_code text)
returns text
language sql
volatile
security definer set search_path = ''
as $$
  select (public.check_reset_code(p_email, p_code)).r_error;
$$;

revoke execute on function public.verify_reset_code(text, text) from public;
grant execute on function public.verify_reset_code(text, text) to anon, authenticated;

-- 2b. Chanje modpas la (kòd la verifye ankò). Modpas la chifre ak bcrypt menm jan Supabase fè l.
-- null = modpas la chanje, sinon mesaj erè a.
create function public.reset_password_with_code(p_email text, p_code text, p_new_password text)
returns text
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  c record;
  v_user uuid;
begin
  if char_length(coalesce(p_new_password, '')) < 8 or char_length(p_new_password) > 72 then
    return 'Modpas la dwe gen 8 a 72 karaktè.';
  end if;
  select * into c from public.check_reset_code(p_email, p_code);
  if c.r_error is not null then return c.r_error; end if;
  select user_id into v_user from public.password_resets where id = c.r_id;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = v_user;

  update public.password_resets set status = 'used', used_at = now() where id = c.r_id;
  return null;
end;
$$;

revoke execute on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

-- 3. Admin: make demann lan "voye" (kòd la bay moun nan) oswa anile l
create function public.admin_set_password_reset(p_id uuid, p_status text)
returns void
language plpgsql
volatile
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Se admin sèlman.'; end if;
  if p_status not in ('sent', 'cancelled') then raise exception 'Estati a pa valid.'; end if;
  update public.password_resets
  set status = p_status, sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = p_id and status in ('pending', 'sent');
end;
$$;

revoke execute on function public.admin_set_password_reset(uuid, text) from public, anon;
grant execute on function public.admin_set_password_reset(uuid, text) to authenticated;
