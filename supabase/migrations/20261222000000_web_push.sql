-- =====================================================================
-- NOTIFIKASYON PUSH (sou telefòn, menm lè sit la fèmen)
--  1. push_subscriptions: chak telefòn/navigatè moun nan aktive notifikasyon yo
--  2. app_secrets: sekrè pataje ant baz done a ak sèvè sit la (pèsonn pa ka li l)
--  3. Lè yon notifikasyon kreye, baz done a voye yon siyal (pg_net) bay https://upmizik.com/api/push
--     sèvè a mande ki telefòn pou l voye l (push_targets, pwoteje pa sekrè a) epi l voye notifikasyon an
-- =====================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- 1. ABÒNMAN PUSH YO
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

create policy "Moun nan wè abònman push li" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Moun nan aktive push sou aparèy li" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Moun nan dezaktive push" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Maksimòm 10 aparèy pa moun (pi ansyen an efase)
create function public.push_subscriptions_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.push_subscriptions
  where user_id = new.user_id and id in (
    select id from public.push_subscriptions where user_id = new.user_id order by created_at desc offset 9
  );
  return new;
end;
$$;

create trigger push_subscriptions_limit before insert on public.push_subscriptions
  for each row execute function public.push_subscriptions_limit();

-- ---------------------------------------------------------------------
-- 2. SEKRÈ A (RLS san okenn règ: sèlman fonksyon "security definer" yo ka li l)
-- ---------------------------------------------------------------------
create table public.app_secrets (
  key   text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

-- Admin mete sekrè a (menm valè ak PUSH_SECRET nan Coolify)
create function public.set_push_secret(p_secret text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  if char_length(coalesce(p_secret, '')) < 32 then
    raise exception 'Sekrè a twò kout';
  end if;
  insert into public.app_secrets (key, value) values ('push', p_secret)
  on conflict (key) do update set value = excluded.value;
end;
$$;

revoke execute on function public.set_push_secret(text) from public, anon;
grant execute on function public.set_push_secret(text) to authenticated;

create function public.push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.app_secrets where key = 'push' and value = p_secret and char_length(p_secret) >= 32);
$$;

revoke execute on function public.push_secret_ok(text) from public, anon, authenticated;

-- Sèvè a mande: ki telefòn pou notifikasyon sa a (sèlman ak bon sekrè a)
create function public.push_targets(p_notification uuid, p_secret text)
returns table (endpoint text)
language sql
stable
security definer set search_path = ''
as $$
  select s.endpoint
  from public.notifications n
  join public.push_subscriptions s on s.user_id = n.user_id
  where n.id = p_notification and public.push_secret_ok(p_secret);
$$;

-- Sèvè a retire yon telefòn ki pa aksepte push ankò (moun nan dezenstale / bloke notifikasyon yo)
create function public.push_remove(p_endpoint text, p_secret text)
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and public.push_secret_ok(p_secret);
$$;

grant execute on function public.push_targets(uuid, text) to anon, authenticated;
grant execute on function public.push_remove(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. NOUVO NOTIFIKASYON → SIYAL BAY SÈVÈ A (sèlman si moun nan gen yon telefòn ki aktive)
-- ---------------------------------------------------------------------
create function public.notifications_push()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    return null;
  end if;
  select value into v_secret from public.app_secrets where key = 'push';
  if v_secret is null then
    return null;
  end if;
  perform net.http_post(
    url := 'https://upmizik.com/api/push',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  return null; -- yon pwoblèm push pa janm anpeche notifikasyon an kreye
end;
$$;

create trigger notifications_push after insert on public.notifications
  for each row execute function public.notifications_push();
