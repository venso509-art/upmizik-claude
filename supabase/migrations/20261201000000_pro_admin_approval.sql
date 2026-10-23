-- =====================================================================
-- PWOFIL PRO: ADMIN DWE VALIDE PEMAN AN ANVAN ATIS LA VIN PRO
-- (anvan: atis la te vin Pro touswit). Kounye a:
--   atis la voye prèv → demann "pending" (pa gen badj)
--   admin Apwouve → "active" + pro_until  |  admin Rejte → "rejected"
--   admin ka toujou Retire yon Pro ("revoked"), oswa apwouve l pita
-- Demann ki deja "active" yo (egz: Venso_Music_96) rete jan yo ye.
-- =====================================================================

alter table public.pro_requests drop constraint pro_requests_status_check;
alter table public.pro_requests
  add constraint pro_requests_status_check check (status in ('pending', 'active', 'rejected', 'revoked')),
  alter column status set default 'pending';

-- ---------------------------------------------------------------------
-- 1. ATIS LA VOYE DEMANN NAN: pa gen Pro toutotan admin pa valide l
-- ---------------------------------------------------------------------
create or replace function public.request_pro(p_method public.donation_method, p_transaction_ref text, p_proof_path text)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.settings;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  if not exists (select 1 from public.profiles
                 where id = v_uid and role = 'artist' and status = 'approved' and archived_at is null) then
    raise exception 'Se atis ki apwouve yo sèlman ki ka vin Pro';
  end if;
  if p_proof_path is null or p_proof_path not like 'pro/' || v_uid::text || '/%' then
    raise exception 'Foto prèv la pa valid';
  end if;
  if exists (select 1 from public.pro_requests where artist_id = v_uid and status = 'pending') then
    raise exception 'Ou gen yon demann Pro k ap tann deja. Ekip la ap verifye l byento.';
  end if;

  select * into v_set from public.settings where id;

  insert into public.pro_requests (artist_id, method, transaction_ref, proof_path, amount_usd, amount_htg, months, status)
  values (v_uid, p_method, nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path,
          v_set.pro_price_usd, round(v_set.pro_price_usd * v_set.htg_per_usd, 2), v_set.pro_months, 'pending');

  perform public.notify(v_uid, 'account', '⏳ Demann Pro ou an resevwa',
    'Mèsi! Ekip UpMizik la ap verifye peman an. Badj PRO a ap parèt sou pwofil ou depi yo valide l.', '/pwofil');
  perform public.notify(p.id, 'account', '⭐ Nouvo demann Pro',
    'Yon atis voye prèv peman pou vin Pro. Verifye l epi apwouve l.', '/admin/pro')
  from public.profiles p where p.is_admin;

  return null; -- pa gen dat Pro toutotan admin pa apwouve
end;
$$;

-- ---------------------------------------------------------------------
-- 2. ADMIN DESIDE: approve | reject | revoke
-- ---------------------------------------------------------------------
drop function public.review_pro(uuid, boolean, text);

create function public.decide_pro(p_request_id uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  r      public.pro_requests;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into r from public.pro_requests where id = p_request_id for update;
  if not found then
    raise exception 'Demann sa a pa egziste';
  end if;

  if p_action = 'approve' then
    if r.status = 'active' then
      return;
    end if;
    update public.pro_requests
    set status = 'active', admin_note = v_note, reviewed_at = now(), reviewed_by = auth.uid()
    where id = r.id;
    -- Si l te deja Pro, nou ajoute tan an sou sa l te genyen an
    update public.profiles
    set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(months => r.months)
    where id = r.artist_id
    returning pro_until into v_until;
    perform public.notify(r.artist_id, 'account', '⭐ Ou se atis Pro kounye a!',
      'Ekip UpMizik la valide peman ou. Pwofil Pro ou aktif jiska ' || to_char(v_until, 'DD/MM/YYYY') || '.', '/pwofil');

  elsif p_action = 'reject' then
    if r.status <> 'pending' then
      raise exception 'Se sèlman yon demann k ap tann ki ka rejte';
    end if;
    update public.pro_requests
    set status = 'rejected', admin_note = v_note, reviewed_at = now(), reviewed_by = auth.uid()
    where id = r.id;
    perform public.notify(r.artist_id, 'account', 'Demann Pro ou pa aksepte',
      coalesce(v_note, 'Nou pa jwenn peman Pro ou a. Verifye l epi voye yon nouvo demann, oswa kontakte ekip UpMizik la.'), '/pwofil');

  elsif p_action = 'revoke' then
    if r.status <> 'active' then
      raise exception 'Se sèlman yon Pro aktif ki ka retire';
    end if;
    update public.pro_requests
    set status = 'revoked', admin_note = v_note, reviewed_at = now(), reviewed_by = auth.uid()
    where id = r.id;
    update public.profiles
    set pro_until = case when pro_until - make_interval(months => r.months) > now()
                         then pro_until - make_interval(months => r.months) end,
        featured_song_id = case when pro_until - make_interval(months => r.months) > now()
                                then featured_song_id end
    where id = r.artist_id;
    perform public.notify(r.artist_id, 'account', 'Pwofil Pro ou retire',
      coalesce(v_note, 'Nou pa jwenn peman Pro ou a. Kontakte ekip UpMizik la si se yon erè.'), '/pwofil');

  else
    raise exception 'Aksyon an pa valid';
  end if;
end;
$$;

grant execute on function public.decide_pro(uuid, text, text) to authenticated;
