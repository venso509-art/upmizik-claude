-- =====================================================================
-- KÒD MANM SOU PAJ /vin-atis (fanatik ki vin atis)
--  - Fanatik la ka mete pseudo manm ki envite l la nan demann atis li.
--  - Lè admin nan apwouve demann nan (kont lan vin atis), atis la konte pou manm nan
--    (+1 nan objektif li, 2 jou promo pou atis la), menm jan ak yon atis ki enskri dirèkteman.
--  - Korije: avan, yon fanatik ki vin atis pa t janm konte pou manm nan
--    (trigger a te tann "status" chanje, men se "role" ki chanje lè yon fanatik vin atis).
--  - Pwoteksyon: yon manm pa ka konte pwòp tèt li; si kont lan deja gen yon manm, li pa chanje.
-- =====================================================================

-- 1. Gad la: kite request_artist_upgrade mete manm nan (drapo sesyon an), men pèsonn lòt pa ka chanje l
create or replace function public.guard_referral_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() and coalesce(current_setting('upmizik.referral_set', true), '') <> '1' then
    new.referred_by_member_id := old.referred_by_member_id;
    new.referral_counted_at := old.referral_counted_at;
  end if;
  return new;
end;
$$;

-- 2. Konte atis la lè kont lan vin atis apwouve (swa status la chanje, swa role la chanje)
create or replace function public.count_referral_on_approval()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  m public.members;
begin
  if new.status <> 'approved' or new.role <> 'artist'
     or (old.status = 'approved' and old.role = 'artist')
     or new.referred_by_member_id is null or new.referral_counted_at is not null then
    return new;
  end if;
  select * into m from public.members where id = new.referred_by_member_id;
  if not found or m.status <> 'approved' or m.user_id = new.id then
    return new;
  end if;

  new.referral_counted_at := now();
  -- 2 jou promo: atis la parèt an premye sou paj akèy la (menm sistèm ak boost la).
  -- Trigger sa a pase APRE gad boost la ("zz..."), kidonk li ka mete kolòn yo dirèkteman.
  new.is_boosted := true;
  new.boost_type := 'profil';
  new.boost_days := 2;
  new.boost_expires_at := greatest(coalesce(old.boost_expires_at, now()), now()) + interval '2 days';

  update public.members set current_progress = current_progress + 1 where id = m.id;

  perform public.notify(m.user_id, 'account', '🎉 Yon nouvo atis konte pou ou!',
    coalesce(new.display_name, 'Yon atis') || ' fèk apwouve sou UpMizik. +1 nan objektif ou!', '/manm/dashboard');
  perform public.notify(new.id, 'account', 'Ou gen 2 jou promo!',
    'Paske ou enskri ak pseudo ' || m.pseudo_referral || ', pwofil ou parèt an premye sou UpMizik pandan 2 jou.', '/atis/' || new.id::text);
  return new;
end;
$$;

drop trigger if exists zz_profiles_count_referral on public.profiles;
create trigger zz_profiles_count_referral before update of status, role on public.profiles
  for each row execute function public.count_referral_on_approval();

-- 3. Demann atis (fanatik ki konekte): + pseudo manm (opsyonèl)
drop function if exists public.request_artist_upgrade(text, text, text, text, public.donation_method, text, text);

create function public.request_artist_upgrade(
  p_display_name    text,
  p_phone           text,
  p_location        text,
  p_pin             text,
  p_method          public.donation_method,
  p_transaction_ref text,
  p_proof_path      text,
  p_referral        text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_name   text := nullif(trim(coalesce(p_display_name, '')), '');
  v_member uuid;
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

  -- Pseudo manm nan (si l bay youn): li dwe egziste, epi li pa ka pwòp pseudo pa l
  if nullif(trim(coalesce(p_referral, '')), '') is not null then
    v_member := public.member_by_code(p_referral);
    if v_member is null then
      raise exception 'Nou pa jwenn pseudo manm sa a. Tcheke l, oswa kite bwat la vid.';
    end if;
    if exists (select 1 from public.members where id = v_member and user_id = v_uid) then
      raise exception 'Ou pa ka itilize pwòp pseudo ou.';
    end if;
  end if;

  -- Non atis la ak zòn nan parèt sou pwofil la (+ manm ki envite l la, si kont lan poko gen youn)
  perform set_config('upmizik.referral_set', '1', true);
  update public.profiles
  set display_name = coalesce(v_name, display_name),
      location = coalesce(left(nullif(trim(coalesce(p_location, '')), ''), 100), location),
      referred_by_member_id = coalesce(referred_by_member_id, v_member)
  where id = v_uid;
  perform set_config('upmizik.referral_set', '', true);

  insert into public.artist_private (user_id, phone, pin_hash)
  values (v_uid, trim(p_phone), extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update set phone = excluded.phone, pin_hash = excluded.pin_hash, updated_at = now();

  -- Admin yo resevwa notifikasyon an otomatikman (trigger artist_registrations_alert_admins)
  insert into public.artist_registrations (artist_id, method, amount_usd, amount_htg, transaction_ref, proof_path)
  values (v_uid, p_method, public.registration_fee_usd(), public.registration_fee_htg(),
          nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path);
end;
$$;

revoke execute on function public.request_artist_upgrade(text, text, text, text, public.donation_method, text, text, text) from public, anon;
grant execute on function public.request_artist_upgrade(text, text, text, text, public.donation_method, text, text, text) to authenticated;
