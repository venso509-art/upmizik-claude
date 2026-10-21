-- =====================================================================
-- UpMizik: paramèt peman admin nan ka chanje san touche kòd
--   to echanj, nimewo MonCash/NatCash, frè enskripsyon, don minimòm, frè mansyèl
-- =====================================================================

create table public.settings (
  id                   boolean primary key default true check (id),   -- yon sèl liy
  htg_per_usd          numeric(10, 2) not null default 145 check (htg_per_usd > 0),
  moncash_number       text not null default '38 91 2317' check (char_length(moncash_number) between 8 and 20),
  natcash_number       text not null default '35 37 1184' check (char_length(natcash_number) between 8 and 20),
  registration_fee_usd numeric(10, 2) not null default 4.99 check (registration_fee_usd >= 0),
  min_donation_usd     numeric(10, 2) not null default 5 check (min_donation_usd > 0),
  monthly_fee_usd      numeric(10, 2) not null default 0.99 check (monthly_fee_usd >= 0),
  updated_by           uuid references public.profiles (id) on delete set null,
  updated_at           timestamptz not null default now()
);

insert into public.settings (id) values (true);

alter table public.settings enable row level security;

create policy "Tout moun li paramèt yo"
  on public.settings for select
  using (true);

create policy "Admin chanje paramèt yo"
  on public.settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Jounal aktivite: kiyès ki chanje ki paramèt
create function public.audit_settings()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.audit('settings.updated', 'settings', null, jsonb_build_object(
    'htg_per_usd', jsonb_build_array(old.htg_per_usd, new.htg_per_usd),
    'moncash_number', jsonb_build_array(old.moncash_number, new.moncash_number),
    'natcash_number', jsonb_build_array(old.natcash_number, new.natcash_number),
    'registration_fee_usd', jsonb_build_array(old.registration_fee_usd, new.registration_fee_usd),
    'min_donation_usd', jsonb_build_array(old.min_donation_usd, new.min_donation_usd),
    'monthly_fee_usd', jsonb_build_array(old.monthly_fee_usd, new.monthly_fee_usd)
  ));
  return new;
end;
$$;

create trigger settings_audit after update on public.settings
  for each row execute function public.audit_settings();

-- ---------------------------------------------------------------------
-- Fonksyon ki te gen valè fiks yo li nan tablo a kounye a
-- ---------------------------------------------------------------------
create or replace function public.registration_fee_usd()
returns numeric language sql stable set search_path = ''
as $$ select registration_fee_usd from public.settings where id $$;

create or replace function public.registration_fee_htg()
returns numeric language sql stable set search_path = ''
as $$ select ceil(registration_fee_usd * htg_per_usd) from public.settings where id $$;

create or replace function public.monthly_fee_htg()
returns numeric language sql stable set search_path = ''
as $$ select round(monthly_fee_usd * htg_per_usd, 2) from public.settings where id $$;

-- ---------------------------------------------------------------------
-- Don yo: baz done a mete to ofisyèl la ak montan an goud li menm,
-- konsa pèsonn pa ka voye yon fo to depi navigatè a.
-- ---------------------------------------------------------------------
create or replace function public.enforce_platform_fee()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  s public.settings%rowtype;
begin
  if not public.is_admin() then
    select * into s from public.settings where id;
    if new.amount_usd < s.min_donation_usd then
      raise exception 'Montan minimòm pou yon don se $%', s.min_donation_usd;
    end if;
    new.platform_fee_percent := 15;
    new.exchange_rate := s.htg_per_usd;
    new.amount_htg := round(new.amount_usd * s.htg_per_usd, 2);
  end if;
  return new;
end;
$$;

-- Ansyen limit fiks $5 la ranplase pa paramèt la (min_donation_usd); nou kenbe yon plas > 0
alter table public.donations drop constraint if exists donations_amount_usd_check;
alter table public.donations add constraint donations_amount_usd_check check (amount_usd > 0 and amount_usd <= 10000);
