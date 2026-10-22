-- 💬 Kòmantè: repons (1 nivo), like sou kòmantè, ak kòmantè sou PÒS Sosyal yo tou.
-- Yon sèl tablo "comments" pou chante AK pòs: chak kòmantè gen swa song_id, swa post_id.

alter type public.notification_type add value if not exists 'comment';

alter table public.comments
  add column post_id   uuid references public.posts (id) on delete cascade,
  add column parent_id uuid references public.comments (id) on delete cascade,
  alter column song_id drop not null;

alter table public.comments
  add constraint comments_one_target check ((song_id is not null) <> (post_id is not null));

create index comments_post_idx on public.comments (post_id, created_at desc) where post_id is not null;
create index comments_parent_idx on public.comments (parent_id) where parent_id is not null;

-- Yon repons dwe sou MENM chante/pòs ak kòmantè li reponn nan, e yon sèl nivo:
-- si yon moun reponn yon repons, nou mete l anba kòmantè prensipal la.
create or replace function public.comments_reply_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  p public.comments;
begin
  if new.parent_id is null then
    return new;
  end if;
  select * into p from public.comments where id = new.parent_id;
  if p.id is null then
    raise exception 'Kòmantè w ap reponn nan pa egziste ankò';
  end if;
  if p.parent_id is not null then
    new.parent_id := p.parent_id;
  end if;
  new.song_id := p.song_id;
  new.post_id := p.post_id;
  return new;
end;
$$;

create trigger comments_reply_guard
  before insert on public.comments
  for each row execute function public.comments_reply_guard();

-- Moun ka kòmante sou yon pòs sèlman si pòs la aktif
create or replace function public.comments_post_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.post_id is not null and not exists (
    select 1 from public.posts where id = new.post_id and status = 'active' and expires_at > now()
  ) then
    raise exception 'Pòs sa a pa aksepte kòmantè ankò';
  end if;
  return new;
end;
$$;

create trigger comments_post_guard
  before insert on public.comments
  for each row execute function public.comments_post_guard();

-- EFASE: pwòp kòmantè w, kòmantè sou pwòp chante/pòs ou, oswa admin
drop policy "Efase pwòp kòmantè oswa kòmantè sou pwòp chante" on public.comments;
create policy "Efase pwòp kòmantè, sou pwòp chante/pòs, oswa admin"
  on public.comments for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.songs s where s.id = comments.song_id and s.artist_id = (select auth.uid()))
    or exists (select 1 from public.posts p where p.id = comments.post_id and p.artist_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- ---------------------------------------------------------------------
-- LIKE sou kòmantè
-- ---------------------------------------------------------------------
create table public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

create policy "Like kòmantè vizib pou tout moun" on public.comment_likes for select using (true);
create policy "Itilizatè like pou tèt li" on public.comment_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Itilizatè retire pwòp like li" on public.comment_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- NOTIFIKASYON: repons sou kòmantè w, ak kòmantè sou pòs ou
-- ---------------------------------------------------------------------
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name   text;
  v_parent uuid;
  v_owner  uuid;
  v_link   text;
  v_excerpt text := left(new.body, 140) || case when char_length(new.body) > 140 then '…' else '' end;
begin
  select display_name into v_name from public.profiles where id = new.user_id;
  v_link := case when new.song_id is not null then '/chante/' || new.song_id || '#komante'
                 else '/sosyal/' || new.post_id end;

  -- 1. Repons: moun ki te ekri kòmantè prensipal la
  if new.parent_id is not null then
    select user_id into v_parent from public.comments where id = new.parent_id;
    if v_parent is not null and v_parent <> new.user_id then
      perform public.notify(v_parent, 'comment', '💬 ' || left(v_name, 60) || ' reponn kòmantè w', v_excerpt, v_link);
    end if;
  end if;

  -- 2. Kòmantè sou yon pòs: atis ki pibliye pòs la (si se pa li menm, e si li pa deja resevwa repons lan)
  if new.post_id is not null then
    select artist_id into v_owner from public.posts where id = new.post_id;
    if v_owner is not null and v_owner <> new.user_id and v_owner is distinct from v_parent then
      perform public.notify(v_owner, 'comment', '💬 ' || left(v_name, 60) || ' kòmante pòs ou', v_excerpt, v_link);
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- Notifikasyon nouvo pòs yo mennen sou paj pòs la kounye a (ak kòmantè yo)
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
         '/sosyal/' || new.id
  from public.artist_fans(new.artist_id) f;
  return new;
end;
$$;
