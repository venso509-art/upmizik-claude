-- =====================================================================
-- UpMizik: newsletter (moun ki vle resevwa nouvèl pa imèl)
-- =====================================================================

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  user_id    uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Yon imèl yon sèl fwa (san konte majiskil/miniskil)
create unique index newsletter_email_unique on public.newsletter_subscribers (lower(email));

-- RLS aktive: sèlman admin ka li lis la; moun yo enskri atravè fonksyon anba a
alter table public.newsletter_subscribers enable row level security;

create policy "Admin wè abòne yo"
  on public.newsletter_subscribers for select
  to authenticated
  using ((select public.is_admin()));

-- Enskri yon imèl. Si l deja enskri, pa gen erè (pou pèsonn pa ka devine ki imèl ki deja la).
create function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if coalesce(trim(p_email), '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(trim(p_email)) > 200 then
    raise exception 'Imèl la pa valid';
  end if;
  insert into public.newsletter_subscribers (email, user_id)
  values (lower(trim(p_email)), auth.uid())
  on conflict do nothing;
end;
$$;

grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
