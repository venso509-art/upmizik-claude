-- =====================================================================
-- LIVE: detay pou admin, remèsiman pou moun ki voye kado, pwochen live atis la
--  1. Tout moun ki pase gade yon live konte (menm san kont): live_views + lives.total_views
--  2. Atis la wè kiyès ki voye kado epi li voye yon ti mesaj mèsi bay chak moun
--  3. Atis la ka anonse dat ak lè pwochen live li (sou pwofil li ak nan mesaj mèsi yo)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ESPEKTATÈ: chak moun (konekte oswa non) konte yon fwa pa live
-- ---------------------------------------------------------------------
alter table public.lives add column total_views integer not null default 0;

create table public.live_views (
  live_id    uuid not null references public.lives (id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) <= 80),   -- id moun nan, oswa "anon:<sesyon>"
  user_id    uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (live_id, viewer_key)
);

create index live_views_live_idx on public.live_views (live_id, created_at);
alter table public.live_views enable row level security;

create policy "Atis la ak admin wè espektatè yo" on public.live_views
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.lives l where l.id = live_id and l.artist_id = (select auth.uid())));

create function public.record_live_view(p_live uuid, p_session text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
begin
  if v_uid is null and coalesce(trim(p_session), '') = '' then return; end if;
  v_key := coalesce(v_uid::text, 'anon:' || left(trim(p_session), 60));
  -- Atis la li menm pa konte
  if exists (select 1 from public.lives where id = p_live and artist_id = v_uid) then return; end if;
  insert into public.live_views (live_id, viewer_key, user_id) values (p_live, v_key, v_uid) on conflict do nothing;
  if found then
    update public.lives set total_views = total_views + 1 where id = p_live;
  end if;
end;
$$;

grant execute on function public.record_live_view(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. MOUN KI VOYE KADO + MESAJ MÈSI
-- ---------------------------------------------------------------------
create table public.live_thanks (
  live_id uuid not null references public.lives (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (live_id, user_id)
);

alter table public.live_thanks enable row level security;
create policy "Atis la ak admin wè remèsiman yo" on public.live_thanks
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.lives l where l.id = live_id and l.artist_id = (select auth.uid())));

-- Kiyès ki voye kado nan yon live (atis la oswa admin)
create function public.live_gifters(p_live uuid)
returns table (user_id uuid, name text, gifts bigint, credits bigint, emojis text, thanked boolean)
language sql
stable
security definer set search_path = ''
as $$
  select g.sender_id, max(g.sender_name), sum(g.quantity), sum(g.credits),
         string_agg(distinct t.emoji, ''), exists (select 1 from public.live_thanks th where th.live_id = p_live and th.user_id = g.sender_id)
  from public.live_gifts g
  join public.live_gift_types t on t.id = g.gift_id
  join public.lives l on l.id = g.live_id
  where g.live_id = p_live and (l.artist_id = auth.uid() or public.is_admin())
  group by g.sender_id
  order by sum(g.credits) desc;
$$;

revoke execute on function public.live_gifters(uuid) from public, anon;
grant execute on function public.live_gifters(uuid) to authenticated;

-- Voye mesaj mèsi a (yon moun, oswa tout moun ki poko resevwa l si p_user = null)
create function public.thank_live_gifters(p_live uuid, p_user uuid, p_message text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_host uuid;
  v_name text;
  v_msg  text := left(trim(coalesce(p_message, '')), 400);
  v_n    integer := 0;
  r      record;
begin
  select l.artist_id, p.display_name into v_host, v_name
  from public.lives l join public.profiles p on p.id = l.artist_id
  where l.id = p_live and l.artist_id = auth.uid();
  if v_host is null then
    raise exception 'Se atis live la sèlman ki ka voye mesaj sa a';
  end if;
  if v_msg = '' then
    raise exception 'Ekri yon ti mesaj';
  end if;
  for r in
    select distinct g.sender_id from public.live_gifts g
    where g.live_id = p_live and (p_user is null or g.sender_id = p_user)
      and not exists (select 1 from public.live_thanks th where th.live_id = p_live and th.user_id = g.sender_id)
  loop
    perform public.notify(r.sender_id, 'live', '💖 ' || coalesce(v_name, 'Atis la') || ' di w mèsi!', v_msg, '/atis/' || v_host::text);
    insert into public.live_thanks (live_id, user_id) values (p_live, r.sender_id) on conflict do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.thank_live_gifters(uuid, uuid, text) from public, anon;
grant execute on function public.thank_live_gifters(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. PWOCHEN LIVE ATIS LA (parèt sou pwofil li)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column next_live_at    timestamptz,
  add column next_live_title text check (char_length(next_live_title) <= 100);
