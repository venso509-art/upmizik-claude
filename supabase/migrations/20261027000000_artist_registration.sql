-- =====================================================================
-- UpMizik: frè enskripsyon atis ($4.99) ak verifikasyon admin
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLO PEMAN ENSKRIPSYON YO
--    Estati yo: pending (ap tann) / verified (apwouve) / rejected (rejte)
-- ---------------------------------------------------------------------
create table public.artist_registrations (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete cascade,
  method          public.donation_method not null,
  amount_usd      numeric(10, 2) not null check (amount_usd > 0),
  amount_htg      numeric(12, 2) not null check (amount_htg > 0),
  transaction_ref text check (char_length(transaction_ref) <= 100),  -- nimewo tranzaksyon MonCash/NatCash
  proof_path      text not null,
  status          public.donation_status not null default 'pending',
  admin_note      text check (char_length(admin_note) <= 500),       -- rezon si l rejte
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  -- Foto a dwe nan folder atis la: registration/<artist_id>/...
  check (proof_path like 'registration/' || artist_id::text || '/%'),
  check (status <> 'rejected' or admin_note is not null)
);

-- Yon atis ka gen YON SÈL demann an atant alafwa
create unique index artist_registrations_one_pending
  on public.artist_registrations (artist_id)
  where status = 'pending';

create index artist_registrations_status_idx on public.artist_registrations (status, created_at);

alter table public.artist_registrations enable row level security;

-- Atis la wè pwòp demann li yo; admin wè tout
create policy "Atis wè pwòp enskripsyon li"
  on public.artist_registrations for select
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

-- Sèlman yon atis ki AP TANN validasyon ka voye yon prèv, pou tèt li, an estati "pending"
create policy "Atis an atant voye prèv peman"
  on public.artist_registrations for insert
  to authenticated
  with check (
    artist_id = (select auth.uid())
    and status = 'pending'
    and admin_note is null and reviewed_by is null and reviewed_at is null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist' and status = 'pending'
    )
  );

-- PA GEN règ "update": admin yo dwe pase pa fonksyon review_artist_registration() anba a

-- ---------------------------------------------------------------------
-- 2. FOTO PREV YO: nan bucket prive "donation-proofs", folder registration/<id atis>/
--    (règ "Admin wè prèv don yo" ki deja egziste a kouvri tout bucket la pou admin)
-- ---------------------------------------------------------------------
create policy "Atis voye prèv enskripsyon"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-proofs'
    and (storage.foldername(name))[1] = 'registration'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------
-- 3. ADMIN APWOUVE OSWA REJTE
--    Apwouve = demann lan "verified" + kont atis la "approved", AN YON SÈL FWA
-- ---------------------------------------------------------------------
create function public.review_artist_registration(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_artist uuid;
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

    update public.profiles set status = 'approved' where id = v_artist;
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

revoke execute on function public.review_artist_registration(uuid, boolean, text) from public, anon;
grant execute on function public.review_artist_registration(uuid, boolean, text) to authenticated;
