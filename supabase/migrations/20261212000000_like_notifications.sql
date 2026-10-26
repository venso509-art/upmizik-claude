-- =====================================================================
-- NOTIFIKASYON "LIKE": atis la resevwa yon ti kat ❤️ lè yon moun like chante l, stati l oswa pòs li.
--  - Pa gen notifikasyon pou pwòp like ou
--  - Anti-spam: yon sèl notifikasyon pa moun, pa kontni, chak 24 è (menm si l retire like la epi l remete l)
-- =====================================================================

alter type public.notification_type add value if not exists 'like';

create table public.like_notify_log (
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  liker_id   uuid not null references public.profiles (id) on delete cascade,
  item_key   text not null,                     -- "song:<id>", "status:<id>", "post:<id>"
  sent_at    timestamptz not null default now(),
  primary key (owner_id, liker_id, item_key)
);
alter table public.like_notify_log enable row level security;   -- pèsonn pa li l dirèkteman

create function public.notify_like(p_owner uuid, p_liker uuid, p_item text, p_what text, p_link text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
begin
  if p_owner is null or p_owner = p_liker then return; end if;
  -- Deja voye nan dènye 24 è yo pou menm moun nan ak menm kontni an: pa voye ankò
  if exists (select 1 from public.like_notify_log
             where owner_id = p_owner and liker_id = p_liker and item_key = p_item and sent_at > now() - interval '24 hours') then
    return;
  end if;
  insert into public.like_notify_log (owner_id, liker_id, item_key) values (p_owner, p_liker, p_item)
  on conflict (owner_id, liker_id, item_key) do update set sent_at = now();
  select display_name into v_name from public.profiles where id = p_liker;
  perform public.notify(p_owner, 'like', coalesce(v_name, 'Yon fanatik') || ' renmen ' || p_what || '!', 'Yon nouvo ❤️', p_link);
end;
$$;

revoke execute on function public.notify_like(uuid, uuid, text, text, text) from public, anon, authenticated;

-- Chante
create function public.song_likes_notify()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_title text;
begin
  select artist_id, title into v_owner, v_title from public.songs where id = new.song_id;
  perform public.notify_like(v_owner, new.user_id, 'song:' || new.song_id::text, '« ' || left(coalesce(v_title, 'chante w'), 60) || ' »', '/chante/' || new.song_id::text);
  return null;
end;
$$;
create trigger song_likes_notify after insert on public.song_likes for each row execute function public.song_likes_notify();

-- Stati
create function public.status_likes_notify()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select artist_id into v_owner from public.artist_statuses where id = new.status_id;
  perform public.notify_like(v_owner, new.user_id, 'status:' || new.status_id::text, 'stati ou', '/dashboard#stati');
  return null;
end;
$$;
create trigger status_likes_notify after insert on public.status_likes for each row execute function public.status_likes_notify();

-- Pòs (Sosyal)
create function public.post_likes_notify()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select artist_id into v_owner from public.posts where id = new.post_id;
  perform public.notify_like(v_owner, new.user_id, 'post:' || new.post_id::text, 'pòs ou', '/sosyal');
  return null;
end;
$$;
create trigger post_likes_notify after insert on public.post_likes for each row execute function public.post_likes_notify();
