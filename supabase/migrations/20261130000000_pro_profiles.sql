-- =====================================================================
-- PWOFIL PRO: atis la peye (MonCash/NatCash), voye prèv la, epi li vin Pro TOUSWIT.
-- Admin tcheke prèv yo apre, e li ka retire Pro a ak 1 klik si peman an pa vre.
-- Avantaj: badj PRO + an premye nan lis yo, 15 pòs/jou ki dire 60 jou,
-- yon chante an vedèt sou CV a, fichye odyo jiska 100 MB, jiska 10 kolaboratè.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PARAMÈT: pri a ak dire a (admin ka chanje yo)
-- ---------------------------------------------------------------------
alter table public.settings
  add column pro_price_usd numeric(10, 2) not null default 5.50 check (pro_price_usd > 0),
  add column pro_months    integer        not null default 24   check (pro_months between 1 and 120);

-- ---------------------------------------------------------------------
-- 2. PWOFIL: jiska ki lè atis la Pro, ak chante an vedèt li
-- ---------------------------------------------------------------------
alter table public.profiles
  add column pro_until        timestamptz,
  add column featured_song_id uuid references public.songs (id) on delete set null;

create function public.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select pro_until > now() from public.profiles where id = p_user), false);
$$;

grant execute on function public.is_pro(uuid) to anon, authenticated;

-- Gad pwofil la: pro_until chanje SÈLMAN pa fonksyon peman yo (oswa admin);
-- chante an vedèt la dwe pou atis la, e se pou atis Pro yo sèlman.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Ou pa ka chanje wòl ou';
    end if;
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Ou pa ka chanje dwa admin';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Ou pa ka chanje estati kont ou';
    end if;
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Se sèlman admin ki ka verifye yon kont';
    end if;
    if new.pro_until is distinct from old.pro_until then
      raise exception 'Se sèlman peman Pro a ki ka chanje sa';
    end if;
    if new.featured_song_id is distinct from old.featured_song_id and new.featured_song_id is not null then
      if not coalesce(old.pro_until > now(), false) then
        raise exception 'Chante an vedèt la se pou atis Pro yo';
      end if;
      if not exists (select 1 from public.songs
                     where id = new.featured_song_id and artist_id = new.id and archived_at is null) then
        raise exception 'Chante sa a pa pou ou';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. DEMANN PRO YO (prèv peman yo)
-- ---------------------------------------------------------------------
create table public.pro_requests (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete cascade,
  method          public.donation_method not null,
  transaction_ref text check (char_length(transaction_ref) <= 60),
  proof_path      text not null,
  amount_usd      numeric(10, 2) not null,
  amount_htg      numeric(12, 2) not null,
  months          integer not null,
  status          text not null default 'active' check (status in ('active', 'revoked')),
  admin_note      text check (char_length(admin_note) <= 500),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles (id) on delete set null
);

create index pro_requests_artist_idx on public.pro_requests (artist_id, created_at desc);

alter table public.pro_requests enable row level security;

-- Atis la wè pa l yo, admin wè tout. Pa gen insert/update dirèk: se fonksyon yo sèlman.
create policy "Atis wè demann Pro li, admin wè tout"
  on public.pro_requests for select
  to authenticated
  using (artist_id = (select auth.uid()) or public.is_admin());

-- Foto prèv la: bucket prive "donation-proofs", folder pro/<id atis>/
create policy "Atis voye prèv peman Pro"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'donation-proofs'
    and (storage.foldername(name))[1] = 'pro'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------
-- 4. VIN PRO: anrejistre peman an epi aktive Pro a touswit
-- ---------------------------------------------------------------------
create function public.request_pro(p_method public.donation_method, p_transaction_ref text, p_proof_path text)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_set   public.settings;
  v_until timestamptz;
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
  if exists (select 1 from public.pro_requests where artist_id = v_uid and created_at > now() - interval '10 minutes') then
    raise exception 'Ou fèk voye yon peman. Tann kèk minit anvan w voye yon lòt.';
  end if;

  select * into v_set from public.settings where id;

  insert into public.pro_requests (artist_id, method, transaction_ref, proof_path, amount_usd, amount_htg, months)
  values (v_uid, p_method, nullif(trim(coalesce(p_transaction_ref, '')), ''), p_proof_path,
          v_set.pro_price_usd, round(v_set.pro_price_usd * v_set.htg_per_usd, 2), v_set.pro_months);

  -- Si l te deja Pro, nou ajoute tan an sou sa l te genyen an
  update public.profiles
  set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(months => v_set.pro_months)
  where id = v_uid
  returning pro_until into v_until;

  perform public.notify(v_uid, 'account', '⭐ Ou se atis Pro kounye a!',
    'Mèsi! Pwofil Pro ou aktive jiska ' || to_char(v_until, 'DD/MM/YYYY') || '. Ekip la ap tcheke prèv peman an.', '/pwofil');
  perform public.notify(p.id, 'account', '⭐ Nouvo atis Pro',
    'Yon atis fèk peye pou Pro. Tcheke prèv peman an.', '/admin/pro')
  from public.profiles p where p.is_admin;

  return v_until;
end;
$$;

grant execute on function public.request_pro(public.donation_method, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. ADMIN: retire Pro a si peman an pa vre (oswa remete l)
-- ---------------------------------------------------------------------
create function public.review_pro(p_request_id uuid, p_revoke boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  r public.pro_requests;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into r from public.pro_requests where id = p_request_id for update;
  if not found then
    raise exception 'Demann sa a pa egziste';
  end if;
  if (r.status = 'revoked') = p_revoke then
    return; -- deja nan estati sa a
  end if;

  update public.pro_requests
  set status = case when p_revoke then 'revoked' else 'active' end,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  if p_revoke then
    update public.profiles
    set pro_until = case when pro_until - make_interval(months => r.months) > now()
                         then pro_until - make_interval(months => r.months) end,
        featured_song_id = case when pro_until - make_interval(months => r.months) > now()
                                then featured_song_id end
    where id = r.artist_id;
    perform public.notify(r.artist_id, 'account', 'Pwofil Pro ou retire',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Nou pa jwenn peman Pro ou a. Kontakte ekip UpMizik la si se yon erè.'), '/pwofil');
  else
    update public.profiles
    set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(months => r.months)
    where id = r.artist_id;
    perform public.notify(r.artist_id, 'account', '⭐ Pwofil Pro ou aktive ankò',
      'Ekip UpMizik la konfime peman Pro ou a.', '/pwofil');
  end if;
end;
$$;

grant execute on function public.review_pro(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. AVANTAJ: pòs Sosyal (15 pa 24 è, 60 jou pou atis Pro yo)
-- ---------------------------------------------------------------------
create or replace function public.posts_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean := public.is_admin();
  v_pro   boolean;
  v_limit integer;
  v_recent integer;
begin
  if tg_op = 'INSERT' then
    v_pro := public.is_pro(new.artist_id);
    v_limit := 5;
    new.created_at := now();
    new.expires_at := now() + interval '30 days';
    if v_pro then
      v_limit := 15;
      new.expires_at := now() + interval '60 days';
    end if;
    new.share_count := 0;
    if not v_admin then
      new.status := 'active';
      select count(*) into v_recent from public.posts
      where artist_id = new.artist_id and created_at > now() - interval '24 hours';
      if v_recent >= v_limit then
        raise exception 'Ou rive nan limit lan: % pòs chak 24 è. Eseye ankò demen.', v_limit;
      end if;
      if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.artist_id::text then
        raise exception 'Imaj la pa valid';
      end if;
    end if;
    new.content := trim(new.content);
    return new;
  end if;

  -- Kontè pataj la sèlman (fonksyon record_share): pa okenn lòt chanjman
  if (new.content, new.image_path, new.link_url, new.status, new.expires_at, new.artist_id, new.created_at)
     is not distinct from (old.content, old.image_path, old.link_url, old.status, old.expires_at, old.artist_id, old.created_at)
     and new.share_count = old.share_count + 1 then
    return new;
  end if;

  if new.artist_id <> old.artist_id or new.created_at <> old.created_at then
    raise exception 'Ou pa ka chanje otè oswa dat pòs la';
  end if;
  if new.share_count <> old.share_count and not v_admin then
    raise exception 'Ou pa ka chanje kontè pataj la';
  end if;
  if not v_admin then
    if new.content <> old.content or new.expires_at <> old.expires_at
       or new.image_path is distinct from old.image_path or new.link_url is distinct from old.link_url
       or not (old.status = 'active' and new.status = 'deleted') then
      raise exception 'Ou ka sèlman retire pòs ou';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. AVANTAJ: atis Pro yo an premye nan "Atis popilè"
-- ---------------------------------------------------------------------
create or replace function public.popular_artists(p_limit integer default 15)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, coalesce(sum(s.play_count), 0) as plays
  from public.profiles a
  join public.songs s on s.artist_id = a.id and s.archived_at is null
  where a.role = 'artist' and a.status = 'approved' and a.archived_at is null
  group by a.id, a.display_name, a.avatar_url, a.pro_until
  order by coalesce(a.pro_until > now(), false) desc, plays desc
  limit least(greatest(p_limit, 1), 30);
$$;

-- ---------------------------------------------------------------------
-- 8. AVANTAJ: fichye odyo jiska 100 MB (sit la kenbe 50 MB pou atis ki pa Pro)
-- ---------------------------------------------------------------------
update storage.buckets set file_size_limit = 104857600 where id = 'audio';
