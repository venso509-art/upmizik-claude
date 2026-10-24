-- =====================================================================
-- STATI v2: like + repons rapid (tankou WhatsApp), stickers/lejand sou foto/videyo, videyo koupe
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EDITÈ A: stickers ak lejand (pozisyon an %), santraj ak koupe videyo a
--    overlay = {"items":[{"t":"sticker","v":"🎸","x":50,"y":40,"s":18}, {"t":"text","v":"Nouvo tit!","x":50,"y":80,"s":7,"c":"#FFFFFF"}]}
--    focus_x/focus_y = ki pati videyo a ki rete nan kad la (0 → 100)
--    trim_start/trim_end = moso videyo a ki jwe (segonn)
-- ---------------------------------------------------------------------
alter table public.artist_statuses
  add column overlay    jsonb check (overlay is null or pg_column_size(overlay) < 8000),
  add column focus_x    numeric(5, 2) not null default 50 check (focus_x between 0 and 100),
  add column focus_y    numeric(5, 2) not null default 50 check (focus_y between 0 and 100),
  add column trim_start numeric(8, 2) check (trim_start >= 0),
  add column trim_end   numeric(8, 2) check (trim_end > 0),
  add constraint artist_statuses_trim_check check (trim_start is null or trim_end is null or trim_end > trim_start);

-- ---------------------------------------------------------------------
-- 2. LIKE STATI YO: sèlman atis la (ak moun ki like la) wè yo, tankou WhatsApp
-- ---------------------------------------------------------------------
create table public.status_likes (
  status_id  uuid not null references public.artist_statuses (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (status_id, user_id)
);

alter table public.status_likes enable row level security;

create policy "Moun nan ak atis la wè like stati yo"
  on public.status_likes for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.artist_statuses s where s.id = status_id and s.artist_id = (select auth.uid()))
  );

create policy "Like yon stati vivan"
  on public.status_likes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.artist_statuses s where s.id = status_id and s.expires_at > now())
  );

create policy "Retire like ou"
  on public.status_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 3. REPONS STATI YO: yon emoji oswa yon ti mesaj ki ale bay atis la sèlman
-- ---------------------------------------------------------------------
create table public.status_replies (
  id         uuid primary key default gen_random_uuid(),
  status_id  uuid not null references public.artist_statuses (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index status_replies_status_idx on public.status_replies (status_id, created_at);

alter table public.status_replies enable row level security;

create policy "Moun ki voye l ak atis la wè repons yo"
  on public.status_replies for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.artist_statuses s where s.id = status_id and s.artist_id = (select auth.uid()))
    or public.is_admin()
  );

create policy "Reponn yon stati vivan"
  on public.status_replies for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.artist_statuses s where s.id = status_id and s.expires_at > now())
  );

create policy "Efase repons: moun ki voye l oswa atis la"
  on public.status_replies for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.artist_statuses s where s.id = status_id and s.artist_id = (select auth.uid()))
  );

-- Anti-spam (20 repons pa èdtan pa moun) + notifikasyon pou atis la
create function public.status_replies_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_artist uuid;
  v_name   text;
begin
  if (select count(*) from public.status_replies
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Twòp repons. Tann yon ti moman.';
  end if;
  new.body := trim(new.body);
  new.created_at := now();

  select s.artist_id into v_artist from public.artist_statuses s where s.id = new.status_id;
  if v_artist is not null and v_artist <> new.user_id then
    select display_name into v_name from public.profiles where id = new.user_id;
    perform public.notify(v_artist, 'comment', '💬 ' || coalesce(v_name, 'Yon fanatik') || ' reponn stati ou',
      left(new.body, 120), '/dashboard#stati');
  end if;
  return new;
end;
$$;

create trigger status_replies_guard
  before insert on public.status_replies
  for each row execute function public.status_replies_guard();
