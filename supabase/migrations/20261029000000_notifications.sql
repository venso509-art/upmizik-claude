-- =====================================================================
-- UpMizik: bwat mesaj (notifikasyon otomatik + mesaj admin)
-- =====================================================================

create type public.notification_type as enum (
  'account',        -- kont apwouve / bloke / debloke
  'registration',   -- prèv enskripsyon rejte
  'donation',       -- don resevwa
  'payout',         -- retrè peye / rejte
  'admin_message'   -- mesaj ekip UpMizik la voye
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 2000),
  link       text check (link like '/%'),          -- paj sou sit la (egz: /dashboard/finans)
  created_by uuid references public.profiles (id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Chak moun wè sèlman pwòp mesaj li; li ka efase yo
create policy "Itilizatè wè pwòp mesaj li"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Itilizatè efase pwòp mesaj li"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- PA GEN insert/update dirèk: mesaj yo soti nan trigger yo oswa nan fonksyon anba yo

-- ---------------------------------------------------------------------
-- 1. MAKE MESAJ YO KÒM LI
--    p_ids = null → tout mesaj itilizatè a
-- ---------------------------------------------------------------------
create function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_ids is null or id = any (p_ids));
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 2. ADMIN VOYE YON MESAJ
--    p_user_id = null → tout atis yo
-- ---------------------------------------------------------------------
create function public.send_admin_message(p_user_id uuid, p_title text, p_body text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka voye mesaj';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'Mesaj la bezwen yon tit ak yon kontni';
  end if;

  insert into public.notifications (user_id, type, title, body, created_by)
  select p.id, 'admin_message', trim(p_title), trim(p_body), auth.uid()
  from public.profiles p
  where (p_user_id is null and p.role = 'artist') or p.id = p_user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.send_admin_message(uuid, text, text) from public, anon;
grant execute on function public.send_admin_message(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. NOTIFIKASYON OTOMATIK (trigger)
-- ---------------------------------------------------------------------
create function public.notify(p_user uuid, p_type public.notification_type, p_title text, p_body text, p_link text)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
$$;

revoke execute on function public.notify(uuid, public.notification_type, text, text, text) from public, anon, authenticated;

-- Fòma yon montan: 1232.5 → "1232.50"
create function public.fmt_money(n numeric)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(n, 'FM999999990.00');
$$;

-- 3a. Kont atis la: apwouve / bloke / debloke
create function public.notify_account_status()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is not distinct from old.status or new.role <> 'artist' then
    return new;
  end if;

  if new.status = 'approved' and old.status = 'pending' then
    perform public.notify(new.id, 'account', '🎉 Kont atis ou apwouve!',
      'Byenvini sou UpMizik! Kont ou aktif kounye a: ou ka kòmanse pibliye mizik ou.', '/upload');
  elsif new.status = 'approved' and old.status = 'blocked' then
    perform public.notify(new.id, 'account', '✅ Kont ou debloke',
      'Ou ka pibliye mizik ankò sou UpMizik.', '/dashboard');
  elsif new.status = 'blocked' then
    perform public.notify(new.id, 'account', '🚫 Kont ou bloke',
      'Ou pa ka pibliye mizik pou kounye a. Si w panse se yon erè, kontakte ekip UpMizik la.', null);
  end if;
  return new;
end;
$$;

create trigger profiles_notify_status
  after update of status on public.profiles
  for each row execute function public.notify_account_status();

-- 3b. Prèv enskripsyon rejte (apwobasyon an deja kouvri pa 3a)
create function public.notify_registration_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'rejected' and old.status = 'pending' then
    perform public.notify(new.artist_id, 'registration', '❌ Prèv enskripsyon ou rejte',
      'Rezon: ' || coalesce(new.admin_note, '—') || E'\n\nOu ka voye yon nouvo prèv sou dashboard ou.', '/dashboard');
  end if;
  return new;
end;
$$;

create trigger artist_registrations_notify
  after update of status on public.artist_registrations
  for each row execute function public.notify_registration_review();

-- 3c. Don valide → atis la resevwa l
create function public.notify_donation_verified()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song text;
begin
  if new.status = 'verified' and old.status <> 'verified' then
    select title into v_song from public.songs where id = new.song_id;
    perform public.notify(new.artist_id, 'donation', '💝 Ou resevwa yon don!',
      coalesce(nullif(trim(new.donor_name), ''), 'Yon fanatik') || ' voye $' || public.fmt_money(new.amount_usd)
        || ' (' || public.fmt_money(new.amount_htg) || ' goud)'
        || coalesce(' pou chante « ' || v_song || ' »', '') || '.'
        || E'\n' || public.fmt_money(new.artist_share_htg) || ' goud ajoute sou balans ou.'
        || coalesce(E'\n\nMesaj: « ' || nullif(trim(new.message), '') || ' »', ''),
      '/dashboard/finans');
  end if;
  return new;
end;
$$;

create trigger donations_notify
  after update of status on public.donations
  for each row execute function public.notify_donation_verified();

-- 3d. Retrè peye oswa rejte
create function public.notify_payout_processed()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'paid' then
    perform public.notify(new.artist_id, 'payout', '✅ Retrè ou a peye',
      public.fmt_money(new.amount_htg) || ' goud voye sou ' || case new.method when 'moncash' then 'MonCash' else 'NatCash' end || ' ' || new.phone || '.'
        || E'\nReferans: ' || coalesce(new.reference, '—'),
      '/dashboard/finans');
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.notify(new.artist_id, 'payout', '❌ Retrè ou a rejte',
      'Demann retrè ' || public.fmt_money(new.amount_htg) || ' goud la rejte. Lajan an tounen sou balans ou.'
        || E'\nRezon: ' || coalesce(new.admin_note, '—'),
      '/dashboard/finans');
  end if;
  return new;
end;
$$;

create trigger payouts_notify
  after update of status on public.payouts
  for each row execute function public.notify_payout_processed();
