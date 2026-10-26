-- =====================================================================
-- SEKIRITE: anpeche moun voye anpil fo don pou bouche admin nan (spam)
-- Yon vizitè (menm san kont) ka toujou voye don, men:
--  - maksimòm 5 don "ap tann" pou menm atis la nan 10 minit (pa moun konekte, oswa san kont)
--  - maksimòm 40 don san kont "ap tann" sou tout sit la nan 10 minit
-- =====================================================================

create function public.donations_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if exists (select 1 where public.is_admin()) then
    return new;
  end if;
  if (select count(*) from public.donations
      where artist_id = new.artist_id and status = 'pending'
        and donor_id is not distinct from new.donor_id
        and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Twòp don an menm tan. Tann kèk minit epi eseye ankò.';
  end if;
  if new.donor_id is null and (select count(*) from public.donations
      where donor_id is null and status = 'pending' and created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Sistèm don an chaje kounye a. Eseye ankò nan kèk minit.';
  end if;
  return new;
end;
$$;

create trigger donations_rate_limit before insert on public.donations
  for each row execute function public.donations_rate_limit();
