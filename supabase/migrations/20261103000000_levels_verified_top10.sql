-- =====================================================================
-- UpMizik: badj ✓ Verifye (admin), nivo atis yo (don + ekout), plak, ak Top 10 otomatik
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BADJ ✓ VERIFYE: se sèlman admin ki ka aktive/dezaktive l
-- ---------------------------------------------------------------------
alter table public.profiles add column is_verified boolean not null default false;

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Ou pa ka chanje wòl ou';
    end if;
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Ou pa ka chanje dwa admin';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Ou pa ka chanje estati kont ou';
    end if;
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Se sèlman admin ki ka verifye yon kont';
    end if;
  end if;
  return new;
end;
$$;

create function public.notify_verified()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.is_verified and not old.is_verified then
    perform public.notify(new.id, 'account', '✓ Kont ou verifye!',
      'Ekip UpMizik la verifye kont ou. Yon ti ✓ ap parèt bò kote non ou sou tout sit la.', '/atis/' || new.id);
  end if;
  return new;
end;
$$;

create trigger profiles_notify_verified
  after update of is_verified on public.profiles
  for each row execute function public.notify_verified();

-- ---------------------------------------------------------------------
-- 2. NIVO YO
--    Pa liy: chak fwa yon atis travèse yon papye (seuil), nou anrejistre yon "evènman".
--    Non nivo yo isit la dwe matche ak src/lib/levels.ts.
-- ---------------------------------------------------------------------
create type public.level_kind as enum ('donations', 'plays');

create table public.artist_level_events (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references public.profiles (id) on delete cascade,
  kind              public.level_kind not null,
  threshold         numeric not null,           -- egz: 150 ($) oswa 10000 (ekout)
  reached_at        timestamptz not null default now(),
  plaque_shipped_at timestamptz,                -- pou nivo ekout ki gen plak (3K, 10K, 100K)
  plaque_note       text check (char_length(plaque_note) <= 300),
  unique (artist_id, kind, threshold)
);

create index artist_level_events_reached_idx on public.artist_level_events (reached_at desc);

alter table public.artist_level_events enable row level security;

-- Atis la wè pwòp nivo li; admin wè tout
create policy "Atis wè pwòp nivo li"
  on public.artist_level_events for select
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()));

create function public.donation_thresholds() returns numeric[] language sql immutable as $$ select array[50, 150, 300, 1000]::numeric[] $$;
create function public.play_thresholds() returns numeric[] language sql immutable as $$ select array[500, 1000, 3000, 10000, 100000]::numeric[] $$;
create function public.plaque_min_donations_usd() returns numeric language sql immutable as $$ select 100::numeric $$;

create function public.level_name(p_kind public.level_kind, p_threshold numeric)
returns text
language sql
immutable
as $$
  select case
    when p_kind = 'donations' then case p_threshold
      when 50 then '🔥 Zetwal k ap monte' when 150 then '⭐ Zetwal' when 300 then '💎 Diaman' when 1000 then '👑 Lejand' end
    else case p_threshold
      when 500 then '🎯 Kalifye pou ✓' when 1000 then '🥉 Bwonz' when 3000 then '🥈 Ajan'
      when 10000 then '🥇 Lò' when 100000 then '💿 Platin' end
  end;
$$;

-- Total yon atis: don valide (an dola) ak ekout (tout chante l yo)
create function public.artist_totals(p_artist_id uuid)
returns table (donations_usd numeric, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select
    coalesce((select sum(amount_usd) from public.donations where artist_id = p_artist_id and status = 'verified'), 0),
    coalesce((select sum(play_count) from public.songs where artist_id = p_artist_id), 0)::bigint;
$$;

-- Anrejistre nouvo nivo yo atis la rive (epi voye l yon mesaj pou chak)
create function public.refresh_artist_levels(p_artist_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_tot record;
  t     numeric;
  v_new integer;  -- kantite liy ki ajoute (0 = nivo a te deja anrejistre)
begin
  select * into v_tot from public.artist_totals(p_artist_id);

  foreach t in array public.donation_thresholds() loop
    if v_tot.donations_usd >= t then
      insert into public.artist_level_events (artist_id, kind, threshold)
      values (p_artist_id, 'donations', t)
      on conflict (artist_id, kind, threshold) do nothing;
      get diagnostics v_new = row_count;
      if v_new > 0 then
        perform public.notify(p_artist_id, 'account', '🎉 Nouvo nivo: ' || public.level_name('donations', t),
          'Fanatik ou yo voye plis pase $' || t || ' don ba ou sou UpMizik. Bravo! 👏', '/dashboard');
      end if;
    end if;
  end loop;

  foreach t in array public.play_thresholds() loop
    if v_tot.plays >= t then
      insert into public.artist_level_events (artist_id, kind, threshold)
      values (p_artist_id, 'plays', t)
      on conflict (artist_id, kind, threshold) do nothing;
      get diagnostics v_new = row_count;
      if v_new > 0 then
        perform public.notify(p_artist_id, 'account', '🎉 Nouvo nivo: ' || public.level_name('plays', t),
          'Mizik ou depase ' || t || ' ekout sou UpMizik!'
            || case when t >= 3000 then E'\n🏆 Nivo sa a gen yon plak fizik (si w gen omwen $100 don).' else '' end,
          '/dashboard');
      end if;
    end if;
  end loop;
end;
$$;

revoke execute on function public.refresh_artist_levels(uuid) from public, anon, authenticated;

-- Deklanche: chak fwa ekout yon chante monte, oswa yon don valide
create function public.levels_on_play()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.play_count > old.play_count then
    perform public.refresh_artist_levels(new.artist_id);
  end if;
  return new;
end;
$$;

create trigger songs_levels
  after update of play_count on public.songs
  for each row execute function public.levels_on_play();

create function public.levels_on_donation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    perform public.refresh_artist_levels(new.artist_id);
  end if;
  return new;
end;
$$;

create trigger donations_levels
  after update of status on public.donations
  for each row execute function public.levels_on_donation();

-- Nivo atis ki deja la yo (san voye mesaj pou ansyen nivo yo)
insert into public.artist_level_events (artist_id, kind, threshold, reached_at)
select a.id, 'donations', t, now()
from public.profiles a
cross join lateral public.artist_totals(a.id) tot
cross join unnest(public.donation_thresholds()) as t
where a.role = 'artist' and tot.donations_usd >= t
on conflict do nothing;

insert into public.artist_level_events (artist_id, kind, threshold, reached_at)
select a.id, 'plays', t, now()
from public.profiles a
cross join lateral public.artist_totals(a.id) tot
cross join unnest(public.play_thresholds()) as t
where a.role = 'artist' and tot.plays >= t
on conflict do nothing;

-- Total pou dashboard atis la (atis la li menm oswa admin)
create function public.my_level_totals(p_artist_id uuid)
returns table (donations_usd numeric, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select * from public.artist_totals(p_artist_id) where public.can_see_stats(p_artist_id);
$$;

-- ---------------------------------------------------------------------
-- 3. ADMIN: tout atis yo ak nivo yo, epi make plak yo voye
-- ---------------------------------------------------------------------
create function public.admin_artist_levels()
returns table (
  artist_id     uuid,
  display_name  text,
  avatar_url    text,
  is_verified   boolean,
  status        public.account_status,
  donations_usd numeric,
  plays         bigint,
  last_level_at timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, a.is_verified, a.status, tot.donations_usd, tot.plays,
         (select max(reached_at) from public.artist_level_events e where e.artist_id = a.id)
  from public.profiles a
  cross join lateral public.artist_totals(a.id) tot
  where a.role = 'artist' and public.is_admin()
  order by tot.plays desc;
$$;

create function public.set_artist_verified(p_artist_id uuid, p_verified boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka verifye yon kont';
  end if;
  update public.profiles set is_verified = p_verified where id = p_artist_id and role = 'artist';
end;
$$;

create function public.mark_plaque_shipped(p_event_id uuid, p_note text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fè sa';
  end if;
  update public.artist_level_events
  set plaque_shipped_at = now(), plaque_note = nullif(trim(p_note), '')
  where id = p_event_id and kind = 'plays' and threshold >= 3000 and plaque_shipped_at is null;

  insert into public.notifications (user_id, type, title, body, link)
  select e.artist_id, 'account', '🏆 Plak ou an sou wout!',
         'Ekip UpMizik la voye plak ' || public.level_name('plays', e.threshold) || ' ou a.'
           || coalesce(E'\n' || nullif(trim(p_note), ''), ''),
         '/dashboard'
  from public.artist_level_events e where e.id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. TOP 10 OTOMATIK (pozisyon #4 a #13, anba Top 3 admin nan)
--    pwen = ekout reyèl 30 dènye jou + 20 × don ($) 30 dènye jou + 5% total ekout
-- ---------------------------------------------------------------------
create function public.top10_songs(p_exclude uuid[] default '{}')
returns table (song_id uuid, score numeric, plays_30d bigint, donations_usd_30d numeric)
language sql
stable
security definer set search_path = ''
as $$
  with recent_plays as (
    select song_id, count(*) as n
    from public.song_plays
    where is_real and started_at > now() - interval '30 days'
    group by song_id
  ), recent_donations as (
    select song_id, sum(amount_usd) as usd
    from public.donations
    where status = 'verified' and song_id is not null and coalesce(reviewed_at, created_at) > now() - interval '30 days'
    group by song_id
  )
  select s.id,
         coalesce(rp.n, 0) + 20 * coalesce(rd.usd, 0) + 0.05 * s.play_count as score,
         coalesce(rp.n, 0),
         coalesce(rd.usd, 0)
  from public.songs s
  join public.profiles a on a.id = s.artist_id and a.status = 'approved'
  left join recent_plays rp on rp.song_id = s.id
  left join recent_donations rd on rd.song_id = s.id
  where not (s.id = any (coalesce(p_exclude, '{}')))
  order by score desc, s.play_count desc, s.created_at desc
  limit 10;
$$;

revoke execute on function public.artist_totals(uuid) from public, anon, authenticated;
revoke execute on function public.my_level_totals(uuid) from public, anon;
revoke execute on function public.admin_artist_levels() from public, anon;
revoke execute on function public.set_artist_verified(uuid, boolean) from public, anon;
revoke execute on function public.mark_plaque_shipped(uuid, text) from public, anon;
grant execute on function public.my_level_totals(uuid) to authenticated;
grant execute on function public.admin_artist_levels() to authenticated;
grant execute on function public.set_artist_verified(uuid, boolean) to authenticated;
grant execute on function public.mark_plaque_shipped(uuid, text) to authenticated;
grant execute on function public.top10_songs(uuid[]) to anon, authenticated;
