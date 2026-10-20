-- =====================================================================
-- UpMizik: don pa MonCash / NatCash, ak verifikasyon admin
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ADMIN: yon chan pou make kiyès ki admin
--    Pou fè yon moun admin, kouri nan SQL Editor:
--    update public.profiles set is_admin = true where id = '<id itilizatè a>';
-- ---------------------------------------------------------------------
alter table public.profiles add column is_admin boolean not null default false;

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Pèsonn pa ka chanje pwòp wòl li NI bay tèt li dwa admin depi sit la
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.role is distinct from old.role then
      raise exception 'Ou pa ka chanje wòl ou';
    end if;
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Ou pa ka chanje dwa admin';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. DON YO
-- ---------------------------------------------------------------------
create type public.donation_method  as enum ('moncash', 'natcash');
create type public.donation_status  as enum ('pending', 'verified', 'rejected');
create type public.contact_type     as enum ('email', 'whatsapp');

create table public.donations (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.profiles (id) on delete cascade,
  song_id       uuid references public.songs (id) on delete set null,
  amount_usd    numeric(10, 2) not null check (amount_usd >= 5 and amount_usd <= 10000),
  exchange_rate numeric(10, 2) not null check (exchange_rate > 0),
  amount_htg    numeric(12, 2) not null,
  method        public.donation_method not null,
  donor_name    text check (char_length(donor_name) <= 80),
  contact_type  public.contact_type not null,
  contact_value text not null check (char_length(contact_value) between 5 and 200),
  message       text check (char_length(message) <= 500),
  proof_path    text not null check (proof_path like 'pending/%'),
  status        public.donation_status not null default 'pending',
  donor_id      uuid references public.profiles (id) on delete set null,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  thanked_at    timestamptz,
  created_at    timestamptz not null default now(),
  -- Montan an goud dwe koresponn ak montan an dola × to a
  check (amount_htg = round(amount_usd * exchange_rate, 2))
);

create index donations_status_idx on public.donations (status, created_at desc);
create index donations_artist_id_idx on public.donations (artist_id);

alter table public.donations enable row level security;

-- Nenpòt moun (menm san kont) ka voye yon don, men SÈLMAN an estati "pending"
create policy "Tout moun ka voye yon don"
  on public.donations for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_by is null and reviewed_at is null and thanked_at is null
    and (donor_id is null or donor_id = (select auth.uid()))
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role = 'artist')
    and (song_id is null or exists (select 1 from public.songs s where s.id = song_id and s.artist_id = donations.artist_id))
  );

-- Sèlman admin yo ka wè, valide oswa efase don yo (yo gen enfòmasyon kontak moun yo)
create policy "Admin wè don yo"
  on public.donations for select
  using ((select public.is_admin()));

create policy "Admin valide don yo"
  on public.donations for update
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admin efase don yo"
  on public.donations for delete
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 3. FOTO PREV YO: bucket PRIVE (sèlman admin ka wè yo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('donation-proofs', 'donation-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Tout moun ka voye prèv don"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'donation-proofs' and (storage.foldername(name))[1] = 'pending');

create policy "Admin wè prèv don yo"
  on storage.objects for select
  using (bucket_id = 'donation-proofs' and (select public.is_admin()));

create policy "Admin efase prèv don yo"
  on storage.objects for delete
  using (bucket_id = 'donation-proofs' and (select public.is_admin()));
