-- 📍 Zòn atis la (vil, depatman oswa peyi dyaspora) chwazi lè l enskri: li ale sou pwofil piblik la.
-- Menm fonksyon ak 20261101000000_artist_finance_v2.sql, ak "location" an plis.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  is_artist  boolean := new.raw_user_meta_data ->> 'role' = 'artist';
  v_phone    text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_location text := left(nullif(trim(new.raw_user_meta_data ->> 'location'), ''), 100);
begin
  insert into public.profiles (id, display_name, role, status, location)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when is_artist then 'artist'::public.user_role else 'listener'::public.user_role end,
    case when is_artist then 'pending'::public.account_status else 'approved'::public.account_status end,
    v_location
  );
  if is_artist then
    insert into public.artist_private (user_id, phone)
    values (new.id, case when char_length(v_phone) between 8 and 20 then v_phone end);
  end if;
  return new;
end;
$$;
