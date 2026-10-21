-- 💳 Non ki sou kont MonCash/NatCash platfòm nan, pou moun yo verifye yo voye bay bon moun nan

alter table public.settings
  add column account_name text not null default 'Clauvens EXAUS'
  check (char_length(trim(account_name)) between 2 and 80);

-- Jounal la anrejistre chanjman non an tou
create or replace function public.audit_settings()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.audit('settings.updated', 'settings', null, jsonb_build_object(
    'htg_per_usd', jsonb_build_array(old.htg_per_usd, new.htg_per_usd),
    'moncash_number', jsonb_build_array(old.moncash_number, new.moncash_number),
    'natcash_number', jsonb_build_array(old.natcash_number, new.natcash_number),
    'account_name', jsonb_build_array(old.account_name, new.account_name),
    'registration_fee_usd', jsonb_build_array(old.registration_fee_usd, new.registration_fee_usd),
    'min_donation_usd', jsonb_build_array(old.min_donation_usd, new.min_donation_usd),
    'monthly_fee_usd', jsonb_build_array(old.monthly_fee_usd, new.monthly_fee_usd)
  ));
  return new;
end;
$$;
