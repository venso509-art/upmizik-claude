-- =====================================================================
-- UpMizik: 📢 Piblisite · 🚀 RPA (Ribrik Pouse Atis) · 🔐 Jounal sekirite · 🗄️ Achiv
-- =====================================================================

-- =====================================================================
-- 🔐 1. JOUNAL AKTIVITE (audit_log): kiyès ki fè ki gwo chanjman, ak kilè
-- =====================================================================
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,  -- moun ki fè aksyon an
  action     text not null,                                            -- egz: "donation.verified"
  entity     text not null,                                            -- egz: "donations"
  entity_id  uuid,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "Admin wè jounal la"
  on public.audit_log for select
  to authenticated
  using ((select public.is_admin()));

create function public.audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

revoke execute on function public.audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- Pwofil: wòl, estati, dwa admin, ✓ verifye, achiv
create function public.audit_profiles()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public.audit('profile.status', 'profiles', new.id, jsonb_build_object('name', new.display_name, 'from', old.status, 'to', new.status));
  end if;
  if new.is_admin is distinct from old.is_admin then
    perform public.audit('profile.admin', 'profiles', new.id, jsonb_build_object('name', new.display_name, 'to', new.is_admin));
  end if;
  if new.is_verified is distinct from old.is_verified then
    perform public.audit('profile.verified', 'profiles', new.id, jsonb_build_object('name', new.display_name, 'to', new.is_verified));
  end if;
  if new.role is distinct from old.role then
    perform public.audit('profile.role', 'profiles', new.id, jsonb_build_object('name', new.display_name, 'from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

create trigger profiles_audit after update on public.profiles
  for each row execute function public.audit_profiles();

-- Estati don, retrè ak enskripsyon
create function public.audit_status_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public.audit(tg_table_name || '.' || new.status, tg_table_name, new.id,
      jsonb_build_object('from', old.status, 'to', new.status, 'amount_htg', to_jsonb(new) -> 'amount_htg'));
  end if;
  return new;
end;
$$;

create trigger donations_audit after update of status on public.donations
  for each row execute function public.audit_status_change();
create trigger payouts_audit after update of status on public.payouts
  for each row execute function public.audit_status_change();
create trigger artist_registrations_audit after update of status on public.artist_registrations
  for each row execute function public.audit_status_change();

-- Chante ki efase
create function public.audit_song_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.audit('song.deleted', 'songs', old.id, jsonb_build_object('title', old.title, 'artist_id', old.artist_id));
  return old;
end;
$$;

create trigger songs_audit_delete after delete on public.songs
  for each row execute function public.audit_song_delete();

-- Top 3 chanje
create function public.audit_top_songs()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.audit('top3.changed', 'top_songs', null, '{}'::jsonb);
  return null;
end;
$$;

create trigger top_songs_audit after insert or delete on public.top_songs
  for each statement execute function public.audit_top_songs();

-- =====================================================================
-- 🔐 2. KONEKSYON YO (login_events) ak tantativ sispèk
--    Sit la anrejistre chak tantativ koneksyon (reyisi oswa echwe).
-- =====================================================================
create table public.login_events (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (char_length(email) <= 200),
  user_id    uuid references public.profiles (id) on delete set null,
  success    boolean not null,
  ip         text check (char_length(ip) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index login_events_created_idx on public.login_events (created_at desc);
create index login_events_email_idx on public.login_events (lower(email), created_at desc);

alter table public.login_events enable row level security;

create policy "Admin wè koneksyon yo"
  on public.login_events for select
  to authenticated
  using ((select public.is_admin()));

create function public.log_login(p_email text, p_success boolean, p_ip text, p_user_agent text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if coalesce(trim(p_email), '') = '' then
    return;
  end if;
  -- Koneksyon reyisi: moun ki konekte a. Echwe: kont ki gen imèl sa a (si l egziste)
  v_user := case when p_success then auth.uid() else (select id from auth.users where lower(email) = lower(trim(p_email)) limit 1) end;
  insert into public.login_events (email, user_id, success, ip, user_agent)
  values (left(lower(trim(p_email)), 200), v_user, p_success, left(p_ip, 100), left(p_user_agent, 300));
end;
$$;

grant execute on function public.log_login(text, boolean, text, text) to anon, authenticated;

-- Tantativ sispèk: 5 echèk oswa plis pou yon imèl oswa yon IP nan dènye èdtan an
create function public.admin_suspicious_logins()
returns table (kind text, value text, failures bigint, last_attempt timestamptz)
language sql
stable
security definer set search_path = ''
as $$
  select 'email', email, count(*), max(created_at)
  from public.login_events
  where not success and created_at > now() - interval '1 hour' and public.is_admin()
  group by email having count(*) >= 5
  union all
  select 'ip', ip, count(*), max(created_at)
  from public.login_events
  where not success and ip is not null and created_at > now() - interval '1 hour' and public.is_admin()
  group by ip having count(*) >= 5
  order by 3 desc;
$$;

revoke execute on function public.admin_suspicious_logins() from public, anon;
grant execute on function public.admin_suspicious_logins() to authenticated;

-- =====================================================================
-- 📢 3. PIBLISITE (ads)
-- =====================================================================
create table public.ads (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  image_path  text not null,                         -- nan bucket "ads"
  link_url    text not null check (link_url ~ '^https://' and char_length(link_url) <= 500),
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,                           -- null = pa ekspire
  is_active   boolean not null default true,
  clicks      integer not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

alter table public.ads enable row level security;

-- Tout moun wè piblisite ki aktif e ki poko ekspire; admin wè tout
create policy "Piblisite aktif vizib"
  on public.ads for select
  using (
    (is_active and starts_at <= now() and (expires_at is null or expires_at > now()))
    or (select public.is_admin())
  );

create policy "Admin jere piblisite"
  on public.ads for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Konte yon klik epi retounen lyen an (pou /pub/<id>)
create function public.register_ad_click(p_ad_id uuid)
returns text
language sql
security definer set search_path = ''
as $$
  update public.ads set clicks = clicks + 1
  where id = p_ad_id and is_active and starts_at <= now() and (expires_at is null or expires_at > now())
  returning link_url;
$$;

grant execute on function public.register_ad_click(uuid) to anon, authenticated;

-- =====================================================================
-- 🚀 4. RPA: Ribrik Pouse Atis (videyo kout san son oswa YouTube)
-- =====================================================================
create type public.promo_kind as enum ('video', 'youtube');

create table public.artist_promos (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  kind        public.promo_kind not null,
  video_path  text,                                  -- nan bucket "promo-videos"
  youtube_url text check (youtube_url ~ '^https://' and char_length(youtube_url) <= 300),
  is_active   boolean not null default true,
  position    integer not null default 0,            -- lòd (pi piti a an premye)
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((kind = 'video' and video_path is not null) or (kind = 'youtube' and youtube_url is not null))
);

alter table public.artist_promos enable row level security;

create policy "RPA aktif vizib"
  on public.artist_promos for select
  using (is_active or (select public.is_admin()));

create policy "Admin jere RPA"
  on public.artist_promos for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- =====================================================================
-- Jounal pou piblisite ak RPA
-- =====================================================================
create function public.audit_content()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  perform public.audit(tg_table_name || '.' || lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid,
    jsonb_build_object('title', v_row ->> 'title', 'is_active', v_row -> 'is_active'));
  return coalesce(new, old);
end;
$$;

create trigger ads_audit after insert or delete or update of title, link_url, is_active, expires_at on public.ads
  for each row execute function public.audit_content();
create trigger artist_promos_audit after insert or update or delete on public.artist_promos
  for each row execute function public.audit_content();

-- =====================================================================
-- Fichye pou piblisite (imaj) ak RPA (videyo): piblik pou li, admin sèlman pou ekri
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ads', 'ads', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),        -- 3 MB
  ('promo-videos', 'promo-videos', true, 26214400, array['video/mp4', 'video/webm']);               -- 25 MB

create policy "Admin voye fichye piblisite ak RPA"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('ads', 'promo-videos') and (select public.is_admin()));

create policy "Admin efase fichye piblisite ak RPA"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('ads', 'promo-videos') and (select public.is_admin()));

-- =====================================================================
-- 🗄️ 5. ACHIV: kache san efase (chante, atis, don, retrè)
-- =====================================================================
alter table public.songs     add column archived_at timestamptz;
alter table public.profiles  add column archived_at timestamptz;
alter table public.donations add column archived_at timestamptz;
alter table public.payouts   add column archived_at timestamptz;

-- Chante: piblik la pa wè chante achive, ni chante yon atis achive. Atis la ak admin wè yo toujou.
drop policy "Chante vizib pou tout moun" on public.songs;

create policy "Chante vizib pou tout moun"
  on public.songs for select
  using (
    (archived_at is null and not exists (
      select 1 from public.profiles a where a.id = songs.artist_id and a.archived_at is not null
    ))
    or artist_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Achive oswa retabli (admin sèlman)
create function public.set_archived(p_entity text, p_id uuid, p_archived boolean)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_value timestamptz := case when p_archived then now() end;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka achive';
  end if;

  case p_entity
    when 'songs' then update public.songs set archived_at = v_value where id = p_id;
    when 'profiles' then update public.profiles set archived_at = v_value where id = p_id and role = 'artist';
    when 'donations' then update public.donations set archived_at = v_value where id = p_id and status <> 'pending';
    when 'payouts' then update public.payouts set archived_at = v_value where id = p_id and status <> 'pending';
    else raise exception 'Kalite eleman sa a pa ka achive';
  end case;

  if not found then
    raise exception 'Eleman an pa jwenn (oswa li toujou an atant)';
  end if;

  perform public.audit(case when p_archived then 'archive' else 'restore' end, p_entity, p_id, '{}'::jsonb);
end;
$$;

revoke execute on function public.set_archived(text, uuid, boolean) from public, anon;
grant execute on function public.set_archived(text, uuid, boolean) to authenticated;

-- Fonksyon piblik yo (security definer) pa dwe montre sa ki achive
create or replace function public.popular_artists(p_limit integer default 15)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, coalesce(sum(s.play_count), 0) as plays
  from public.profiles a
  join public.songs s on s.artist_id = a.id and s.archived_at is null
  where a.role = 'artist' and a.status = 'approved' and a.archived_at is null
  group by a.id, a.display_name, a.avatar_url
  order by plays desc
  limit least(greatest(p_limit, 1), 30);
$$;

create or replace function public.my_top_artists(p_limit integer default 15)
returns table (artist_id uuid, display_name text, avatar_url text, plays bigint)
language sql
stable
security definer set search_path = ''
as $$
  select a.id, a.display_name, a.avatar_url, count(*) as plays
  from public.song_plays p
  join public.profiles a on a.id = p.artist_id
  where p.user_id = auth.uid()
    and p.is_real
    and a.status = 'approved'
    and a.archived_at is null
  group by a.id, a.display_name, a.avatar_url
  order by plays desc, max(p.started_at) desc
  limit least(greatest(p_limit, 1), 30);
$$;

create or replace function public.top10_songs(p_exclude uuid[] default '{}')
returns table (song_id uuid, score numeric, plays_30d bigint, donations_usd_30d numeric)
language sql
stable
security definer set search_path = ''
as $$
  with recent_plays as (
    select song_id, count(*) as n
    from public.song_plays
    where counted and started_at > now() - interval '30 days'
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
  join public.profiles a on a.id = s.artist_id and a.status = 'approved' and a.archived_at is null
  left join recent_plays rp on rp.song_id = s.id
  left join recent_donations rd on rd.song_id = s.id
  where s.archived_at is null
    and not (s.id = any (coalesce(p_exclude, '{}')))
  order by score desc, s.play_count desc, s.created_at desc
  limit 10;
$$;
