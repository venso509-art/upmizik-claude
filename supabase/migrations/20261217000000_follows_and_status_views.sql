-- =====================================================================
-- 1. STATI: kantite "wè" a konte moun ki like yo tou (yon moun ki like te wè l, menm si
--    "wè" li a pa t anrejistre, pa egzanp anvan sistèm "wè" a te egziste).
-- 2. ABÒNMAN (swiv yon atis Pro): bouton "Abone", kantite abone, notifikasyon pou atis la,
--    epi abone yo resevwa tout sa atis la pibliye (chante, pòs, stati, live).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. KANTITE WÈ STATI YO
-- ---------------------------------------------------------------------
create or replace function public.status_stats(p_ids uuid[])
returns table (status_id uuid, views bigint, likes bigint)
language sql
stable
security definer set search_path = ''
as $$
  select s.id,
         (select count(*) from (
            select v.viewer_key as k from public.status_views v where v.status_id = s.id
            union
            select l.user_id::text from public.status_likes l where l.status_id = s.id
          ) x),
         (select count(*) from public.status_likes l where l.status_id = s.id)
  from public.artist_statuses s
  where s.id = any (p_ids) and (s.artist_id = auth.uid() or public.is_admin());
$$;

-- ---------------------------------------------------------------------
-- 2. ABÒNMAN
-- ---------------------------------------------------------------------
alter type public.notification_type add value if not exists 'follow';

create table public.artist_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, artist_id),
  check (follower_id <> artist_id)
);

create index artist_follows_artist_idx on public.artist_follows (artist_id, created_at desc);
alter table public.artist_follows enable row level security;

-- Ou wè pwòp abònman ou; atis la wè abone li yo; admin wè tout
create policy "Wè abònman yo" on public.artist_follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or artist_id = (select auth.uid()) or public.is_admin());

-- Abone: sèlman pou pwòp kont ou, e sèlman yon atis Pro apwouve
create policy "Abone nan yon atis Pro" on public.artist_follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and public.is_pro(artist_id)
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role = 'artist' and p.status = 'approved' and p.archived_at is null)
  );

create policy "Dezabone" on public.artist_follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

-- Kantite abone yon atis (tout moun ka wè l)
create function public.follower_count(p_artist uuid)
returns bigint
language sql
stable
security definer set search_path = ''
as $$
  select count(*) from public.artist_follows where artist_id = p_artist;
$$;

grant execute on function public.follower_count(uuid) to anon, authenticated;

-- Atis la resevwa yon notifikasyon (yon sèl fwa pa moun chak 24 è, menm si l dezabone/reabone)
create function public.artist_follows_notify()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  if exists (select 1 from public.like_notify_log
             where owner_id = new.artist_id and liker_id = new.follower_id and item_key = 'follow' and sent_at > now() - interval '24 hours') then
    return null;
  end if;
  insert into public.like_notify_log (owner_id, liker_id, item_key) values (new.artist_id, new.follower_id, 'follow')
  on conflict (owner_id, liker_id, item_key) do update set sent_at = now();
  select display_name into v_name from public.profiles where id = new.follower_id;
  perform public.notify(new.artist_id, 'follow', coalesce(v_name, 'Yon fanatik') || ' abone nan ou!',
    'Yon nouvo abone 🎉', '/atis/' || new.artist_id::text);
  return null;
end;
$$;

create trigger artist_follows_notify after insert on public.artist_follows
  for each row execute function public.artist_follows_notify();

-- ---------------------------------------------------------------------
-- 3. ABONE YO RESEVWA TOUT SA ATIS LA PIBLIYE
-- "Fanatik" yon atis = moun ki koute l anpil / like li (ansyen règ la) + TOUT abone li yo.
-- (Notifikasyon nouvo chante ak nouvo pòs yo itilize lis sa a deja.)
-- ---------------------------------------------------------------------
create or replace function public.artist_fans(p_artist uuid)
returns table (user_id uuid)
language sql
stable
security definer set search_path = ''
as $$
  with scores as (
    select x.user_id, x.artist_id, sum(x.pts) as pts, sum(x.plays) as plays, sum(x.likes) as likes
    from (
      select sp.user_id, sp.artist_id, 1 as pts, 1 as plays, 0 as likes
      from public.song_plays sp
      where sp.is_real and sp.user_id is not null
      union all
      select l.user_id, s.artist_id, 3, 0, 1
      from public.song_likes l join public.songs s on s.id = l.song_id
    ) x
    group by x.user_id, x.artist_id
  ), ranked as (
    select sc.*, row_number() over (partition by sc.user_id order by sc.pts desc) as rnk
    from scores sc
  )
  select r.user_id
  from ranked r
  join public.profiles p on p.id = r.user_id
  where r.artist_id = p_artist
    and r.rnk <= 10
    and (r.plays >= 2 or r.likes >= 1)
    and p.role = 'listener' and p.status = 'approved' and p.archived_at is null
    and r.user_id <> p_artist
  union
  select f.follower_id
  from public.artist_follows f
  join public.profiles p on p.id = f.follower_id
  where f.artist_id = p_artist and p.archived_at is null and f.follower_id <> p_artist;
$$;

-- Nouvo stati → abone yo (yon sèl notifikasyon chak 3 è pou pa anmède yo)
create function public.notify_followers_new_status()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  if exists (select 1 from public.artist_statuses
             where artist_id = new.artist_id and id <> new.id and created_at > now() - interval '3 hours') then
    return null;
  end if;
  select display_name into v_name from public.profiles where id = new.artist_id;
  insert into public.notifications (user_id, type, title, body, link)
  select f.follower_id, 'new_post', left(coalesce(v_name, 'Yon atis') || ' poste yon nouvo stati', 120),
         'Gade l anvan li disparèt nan 24 è ⏳', '/atis/' || new.artist_id::text
  from public.artist_follows f
  where f.artist_id = new.artist_id;
  return null;
end;
$$;

create trigger artist_statuses_notify_followers after insert on public.artist_statuses
  for each row execute function public.notify_followers_new_status();
