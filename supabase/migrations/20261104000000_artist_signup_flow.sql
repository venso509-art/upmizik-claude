-- =====================================================================
-- UpMizik: enskripsyon atis an yon sèl etap (enfòmasyon + règ + peman + prèv)
-- Mache menm lè "Confirm email" aktive (atis la poko konekte lè l ap enskri).
-- =====================================================================

-- Frè enskripsyon an (dwe matche ak src/lib/registration.ts)
create function public.registration_fee_usd() returns numeric language sql immutable as $$ select 4.99::numeric $$;
create function public.registration_fee_htg() returns numeric language sql immutable as $$ select ceil(4.99 * 145)::numeric $$;  -- 724

-- Foto prèv la: menm moun ki poko konekte ka voye l nan folder registration/<id kont lan>/
-- (fonksyon anba a verifye se yon kont ki fèk kreye anvan li aksepte l)
drop policy "Atis voye prèv enskripsyon" on storage.objects;

create policy "Voye prèv enskripsyon atis"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'donation-proofs'
    and (storage.foldername(name))[1] = 'registration'
    and (storage.foldername(name))[2] is not null
  );

-- Fini enskripsyon yon atis: PIN chifre + demann peman ak prèv la.
-- Kondisyon: kont atis "pending", kreye gen mwens pase 1 è, poko janm voye prèv,
-- e foto a nan pwòp folder kont lan.
create function public.complete_artist_signup(
  p_user_id         uuid,
  p_pin             text,
  p_method          public.donation_method,
  p_transaction_ref text,
  p_proof_path      text
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'artist' and status = 'pending' and created_at > now() - interval '1 hour'
  ) then
    raise exception 'Kont sa a pa kapab fini enskripsyon sa a';
  end if;
  if exists (select 1 from public.artist_registrations where artist_id = p_user_id) then
    raise exception 'Kont sa a deja voye yon prèv peman';
  end if;
  if p_proof_path not like 'registration/' || p_user_id::text || '/%' then
    raise exception 'Foto prèv la pa nan bon folder la';
  end if;
  if p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN nan dwe gen 4 a 6 chif';
  end if;

  insert into public.artist_private (user_id, pin_hash)
  values (p_user_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();

  insert into public.artist_registrations (artist_id, method, amount_usd, amount_htg, transaction_ref, proof_path)
  values (p_user_id, p_method, public.registration_fee_usd(), public.registration_fee_htg(),
          nullif(trim(p_transaction_ref), ''), p_proof_path);
end;
$$;

grant execute on function public.complete_artist_signup(uuid, text, public.donation_method, text, text) to anon, authenticated;
