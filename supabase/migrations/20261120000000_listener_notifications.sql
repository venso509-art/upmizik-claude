-- 🎧 Espas koutè yo: nouvo chante + pòs atis yo tande plis yo, ak mesaj admin pou koutè yo.
-- Notifikasyon yo rive AN DIRÈK (Supabase Realtime) pou sit la ka sonnen.

alter type public.notification_type add value if not exists 'new_song';
alter type public.notification_type add value if not exists 'new_post';

-- ---------------------------------------------------------------------
-- FANATIK yon atis: koutè ki tande l omwen 2 fwa (ekout reyèl) oswa ki like yon chante li,
-- epi atis la nan 10 atis koutè a pi renmen yo.
-- ---------------------------------------------------------------------
create or replace function public.artist_fans(p_artist uuid)
returns table (user_id uuid)
language sql
stable
security definer set search_path = ''
as $$
  with scores as (
    -- Pwen chak koutè bay chak atis: 1 pa ekout reyèl, 3 pa like
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
    and r.user_id <> p_artist;
$$;

revoke execute on function public.artist_fans(uuid) from public, anon, authenticated;

-- Nouvo chante → mesaj pou fanatik atis la
create or replace function public.notify_fans_new_song()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  if new.archived_at is not null then
    return new;
  end if;
  select display_name into v_name from public.profiles where id = new.artist_id;
  insert into public.notifications (user_id, type, title, body, link)
  select f.user_id, 'new_song',
         left('🎵 Nouvo chante: « ' || new.title || ' »', 120),
         v_name || ' fenk pibliye « ' || new.title || ' ». Klike pou w se youn nan premye moun ki tande l! 🎧',
         '/chante/' || new.id
  from public.artist_fans(new.artist_id) f;
  return new;
end;
$$;

create trigger songs_notify_fans
  after insert on public.songs
  for each row execute function public.notify_fans_new_song();

-- Si chante a efase (egz: upload la echwe), retire mesaj ki t ap mennen sou li
create or replace function public.cleanup_song_notifications()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.notifications where type = 'new_song' and link = '/chante/' || old.id;
  return old;
end;
$$;

create trigger songs_cleanup_notifications
  after delete on public.songs
  for each row execute function public.cleanup_song_notifications();

-- Nouvo pòs Sosyal → mesaj pou fanatik atis la
create or replace function public.notify_fans_new_post()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  if new.status <> 'active' then
    return new;
  end if;
  select display_name into v_name from public.profiles where id = new.artist_id;
  insert into public.notifications (user_id, type, title, body, link)
  select f.user_id, 'new_post',
         left('📣 ' || v_name || ' gen yon nouvèl pou ou', 120),
         left(new.content, 300) || case when char_length(new.content) > 300 then '…' else '' end,
         '/sosyal#' || new.id
  from public.artist_fans(new.artist_id) f;
  return new;
end;
$$;

create trigger posts_notify_fans
  after insert on public.posts
  for each row execute function public.notify_fans_new_post();

-- ---------------------------------------------------------------------
-- ADMIN: voye yon mesaj bay yon gwoup
-- p_audience: 'artists' (tout atis), 'listeners' (tout koutè), 'everyone' (tout moun)
-- ---------------------------------------------------------------------
create or replace function public.send_admin_broadcast(p_audience text, p_title text, p_body text)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka voye mesaj';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'Mesaj la bezwen yon tit ak yon kontni';
  end if;
  if p_audience not in ('artists', 'listeners', 'everyone') then
    raise exception 'Gwoup sa a pa valid';
  end if;

  insert into public.notifications (user_id, type, title, body, created_by)
  select p.id, 'admin_message', trim(p_title), trim(p_body), auth.uid()
  from public.profiles p
  where p.archived_at is null
    and p.status <> 'blocked'
    and (p_audience = 'everyone'
         or (p_audience = 'artists' and p.role = 'artist')
         or (p_audience = 'listeners' and p.role = 'listener'));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.send_admin_broadcast(text, text, text) from public, anon;
grant execute on function public.send_admin_broadcast(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- REALTIME: sit la resevwa nouvo mesaj yo an dirèk (règ RLS yo toujou aplike:
-- chak moun resevwa SÈLMAN pwòp mesaj pa l)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
