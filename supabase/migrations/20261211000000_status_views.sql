-- =====================================================================
-- STATI: kiyès ki wè yon stati (tankou WhatsApp). Sèlman atis la (ak admin) wè lis la.
--  - Chak moun konte yon sèl fwa pa stati (moun ki gen kont + vizitè san kont)
--  - status_audience: lis moun ki wè / ki like yon stati (pou panèl ki glise monte a)
--  - status_stats: kantite wè + like pou plizyè stati alafwa
-- =====================================================================

create table public.status_views (
  status_id  uuid not null references public.artist_statuses (id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) <= 80),   -- id moun nan, oswa "anon:<sesyon>"
  user_id    uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (status_id, viewer_key)
);

create index status_views_status_idx on public.status_views (status_id, created_at desc);
alter table public.status_views enable row level security;

create policy "Atis la ak admin wè kiyès ki gade stati yo" on public.status_views
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.artist_statuses s where s.id = status_id and s.artist_id = (select auth.uid())));

-- Anrejistre yon "wè" (atis la li menm pa konte; stati a dwe poko ekspire)
create function public.record_status_view(p_status uuid, p_session text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null and coalesce(trim(p_session), '') = '' then return; end if;
  if not exists (select 1 from public.artist_statuses s
                 where s.id = p_status and s.expires_at > now() and s.artist_id is distinct from v_uid) then
    return;
  end if;
  insert into public.status_views (status_id, viewer_key, user_id)
  values (p_status, coalesce(v_uid::text, 'anon:' || left(trim(p_session), 60)), v_uid)
  on conflict do nothing;
end;
$$;

grant execute on function public.record_status_view(uuid, text) to anon, authenticated;

-- Moun ki wè ak moun ki like yon stati (atis la oswa admin sèlman)
create function public.status_audience(p_status uuid)
returns table (user_id uuid, name text, avatar_url text, verified boolean, viewed_at timestamptz, liked_at timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  with allowed as (
    select 1 from public.artist_statuses s
    where s.id = p_status and (s.artist_id = auth.uid() or public.is_admin())
  ),
  people as (
    select v.user_id, v.created_at as viewed_at, null::timestamptz as liked_at
    from public.status_views v where v.status_id = p_status and v.user_id is not null
    union all
    select l.user_id, null, l.created_at from public.status_likes l where l.status_id = p_status
  )
  select p.id, p.display_name, p.avatar_url, p.is_verified,
         max(x.viewed_at), max(x.liked_at)
  from people x
  join public.profiles p on p.id = x.user_id
  where exists (select 1 from allowed)
  group by p.id, p.display_name, p.avatar_url, p.is_verified
  order by coalesce(max(x.liked_at), max(x.viewed_at)) desc
  limit 1000;
$$;

revoke execute on function public.status_audience(uuid) from public, anon;
grant execute on function public.status_audience(uuid) to authenticated;

-- Kantite wè (tout moun, menm san kont) + like pou stati atis la
create function public.status_stats(p_ids uuid[])
returns table (status_id uuid, views bigint, likes bigint)
language sql
stable
security definer set search_path = ''
as $$
  select s.id,
         (select count(*) from public.status_views v where v.status_id = s.id),
         (select count(*) from public.status_likes l where l.status_id = s.id)
  from public.artist_statuses s
  where s.id = any (p_ids) and (s.artist_id = auth.uid() or public.is_admin());
$$;

revoke execute on function public.status_stats(uuid[]) from public, anon;
grant execute on function public.status_stats(uuid[]) to authenticated;
