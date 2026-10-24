-- =====================================================================
-- YON KOUTÈ KI VLE VIN ATIS
-- Koutè a ranpli rès kondisyon yo (telefòn, zòn, PIN, frè enskripsyon + prèv peman).
-- Kont lan RETE "koutè" pandan demann nan ap tann (li ka kontinye koute mizik);
-- lè admin apwouve l, li vin "atis" (menm paj Admin → Enskripsyon an).
-- =====================================================================

-- 1. Koutè a voye demann nan
create function public.request_artist_upgrade(
  p_display_name    text,
  p_phone           text,
  p_location        text,
  p_pin             text,
  p_method          public.donation_method,
  p_transaction_ref text,
  p_proof_path      text
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  if not exists (select 1 from public.profiles
                 where id = v_uid and role = 'listener' and status = 'approved' and archived_at is null) then
    raise exception 'Se kont koutè yo sèlman ki ka fè demann sa a';
  end if;
  if exists (select 1 from public.artist_registrations where artist_id = v_uid and status = 'pending') then
    raise exception 'Ou gen yon demann atis k ap tann deja. Ekip UpMizik la ap verifye l byento.';
  end if;
  if v_name is not null and char_length(v_name) not between 2 and 80 then
    raise exception 'Non atis la dwe gen 2 a 80 karaktè';
  end if;
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 8 or char_length(trim(p_phone)) > 20 then
    raise exception 'Mete yon nimewo telefòn/WhatsApp valid';
  end if;
  if p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN nan dwe gen 4 a 6 chif';
  end if;
  if p_proof_path is null or p_proof_path not like 'registration/' || v_uid::text || '/%' then
    raise exception 'Foto prèv la pa nan bon folder la';
  end if;

  -- Non atis la ak zòn nan parèt sou pwofil la
  update public.profiles
  set display_name = coalesce(v_name, display_name),
      location = coalesce(left(nullif(trim(coalesce(p_location, '')), ''), 100), location)
  where id = v_uid;

  insert into public.artist_private (user_id, phone, pin_hash)
  values (v_uid, trim(p_phone), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update set phone = excluded.phone, pin_hash = excluded.pin_hash, updated_at = now();

  -- Admin yo resevwa notifikasyon an otomatikman (trigger artist_registrations_alert_admins)
  insert into public.artist_registrations (artist_id, method, amount_usd, amount_htg, transaction_ref, proof_path)
  values (v_uid, p_method, public.registration_fee_usd(), public.registration_fee_htg(),
          nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path);
end;
$$;

revoke execute on function public.request_artist_upgrade(text, text, text, text, public.donation_method, text, text) from public, anon;
grant execute on function public.request_artist_upgrade(text, text, text, text, public.donation_method, text, text) to authenticated;

-- 2. Admin apwouve: si se te yon koutè, kont lan vin atis (epi karyè atis li kòmanse jodi a)
create or replace function public.review_artist_registration(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_artist uuid;
  v_was_listener boolean;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fè sa';
  end if;

  select artist_id into v_artist
  from public.artist_registrations
  where id = p_id and status = 'pending'
  for update;

  if v_artist is null then
    raise exception 'Demann sa a pa egziste oswa li deja trete';
  end if;

  if p_approve then
    update public.artist_registrations
    set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;

    select role = 'listener' into v_was_listener from public.profiles where id = v_artist;

    update public.profiles
    set status = 'approved',
        role = 'artist',
        approved_at = case when v_was_listener then now() else approved_at end
    where id = v_artist;

    if v_was_listener then
      perform public.notify(v_artist, 'account', '🎤 Ou se atis UpMizik kounye a!',
        'Ekip la valide demann ou. Ou ka pibliye premye chante w depi kounye a nan espas atis ou.', '/dashboard');
    end if;
  else
    if coalesce(trim(p_note), '') = '' then
      raise exception 'Ou dwe bay yon rezon pou rejte l';
    end if;

    update public.artist_registrations
    set status = 'rejected', admin_note = trim(p_note), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  end if;
end;
$$;

-- 3. Prèv rejte: yon koutè voye yon nouvo demann sou /vin-atis (atis yo, sou dashboard yo)
create or replace function public.notify_registration_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_listener boolean;
begin
  if new.status = 'rejected' and old.status = 'pending' then
    select role = 'listener' into v_listener from public.profiles where id = new.artist_id;
    perform public.notify(new.artist_id, 'registration', '❌ Prèv enskripsyon ou rejte',
      'Rezon: ' || coalesce(new.admin_note, '—') || E'\n\nOu ka voye yon nouvo prèv '
        || case when v_listener then 'sou paj « Vin atis » la.' else 'sou dashboard ou.' end,
      case when v_listener then '/vin-atis' else '/dashboard' end);
  end if;
  return new;
end;
$$;
