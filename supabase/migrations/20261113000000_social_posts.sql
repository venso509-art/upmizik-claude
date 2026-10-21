-- 📣 UpMizik Sosyal: atis yo pibliye nouvèl, evènman, nouvo pwojè.
-- Chak pòs dire 30 jou. Admin ka bloke (kache) oswa efase nèt.

create type public.post_status as enum ('active', 'blocked', 'deleted');

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  content    text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  status     public.post_status not null default 'active'
);

create index posts_feed_idx on public.posts (created_at desc) where status = 'active';
create index posts_artist_idx on public.posts (artist_id, created_at desc);

alter table public.posts enable row level security;

-- ---------------------------------------------------------------------
-- WÈ: tout moun wè pòs aktif ki poko ekspire (de atis apwouve).
-- Atis la wè tout pòs pa l; admin wè tout bagay (menm sa ki ekspire/bloke).
-- ---------------------------------------------------------------------
create policy "Pòs aktif vizib pou tout moun"
  on public.posts for select
  using (
    (
      status = 'active'
      and expires_at > now()
      and exists (
        select 1 from public.profiles a
        where a.id = posts.artist_id and a.status = 'approved' and a.archived_at is null
      )
    )
    or artist_id = (select auth.uid())
    or (select public.is_admin())
  );

-- PIBLIYE: sèlman yon atis apwouve, pou tèt li
create policy "Atis apwouve pibliye pòs"
  on public.posts for insert
  to authenticated
  with check (
    artist_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist' and status = 'approved' and archived_at is null
    )
  );

-- CHANJE: atis la (pou retire pòs li) oswa admin (pou bloke/debloke)
create policy "Atis oswa admin chanje pòs"
  on public.posts for update
  to authenticated
  using (artist_id = (select auth.uid()) or (select public.is_admin()))
  with check (artist_id = (select auth.uid()) or (select public.is_admin()));

-- EFASE NÈT: admin sèlman
create policy "Admin efase pòs"
  on public.posts for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- SEKIRITE: pèsonn pa ka triche ak dat yo, ak estati a, oswa voye twòp pòs
-- ---------------------------------------------------------------------
create function public.posts_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean := public.is_admin();
  v_recent integer;
begin
  if tg_op = 'INSERT' then
    -- Dat yo toujou kalkile pa baz done a: 30 jou egzak
    new.created_at := now();
    new.expires_at := now() + interval '30 days';
    if not v_admin then
      new.status := 'active';
      -- Anti-spam: maksimòm 5 pòs chak 24 è
      select count(*) into v_recent from public.posts
      where artist_id = new.artist_id and created_at > now() - interval '24 hours';
      if v_recent >= 5 then
        raise exception 'Ou rive nan limit lan: 5 pòs chak 24 è. Eseye ankò demen.';
      end if;
    end if;
    new.content := trim(new.content);
    return new;
  end if;

  -- UPDATE
  if new.artist_id <> old.artist_id or new.created_at <> old.created_at then
    raise exception 'Ou pa ka chanje otè oswa dat pòs la';
  end if;
  if not v_admin then
    -- Atis la ka sèlman retire pwòp pòs li (active → deleted); li pa ka debloke yon pòs
    if new.content <> old.content or new.expires_at <> old.expires_at
       or not (old.status = 'active' and new.status = 'deleted') then
      raise exception 'Ou ka sèlman retire pòs ou';
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_guard
  before insert or update on public.posts
  for each row execute function public.posts_guard();

-- ---------------------------------------------------------------------
-- JOUNAL ADMIN: chak fwa admin bloke, debloke oswa efase yon pòs
-- ---------------------------------------------------------------------
create function public.audit_posts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_row public.posts := coalesce(new, old);
  v_name text;
begin
  if not public.is_admin() then
    return null;
  end if;
  select display_name into v_name from public.profiles where id = v_row.artist_id;
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'post.deleted', 'posts', old.id,
            jsonb_build_object('name', v_name, 'excerpt', left(old.content, 80)));
  elsif new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'post.' || new.status::text, 'posts', new.id,
            jsonb_build_object('name', v_name, 'from', old.status, 'to', new.status, 'excerpt', left(new.content, 80)));
  end if;
  return null;
end;
$$;

create trigger posts_audit
  after update or delete on public.posts
  for each row execute function public.audit_posts();

-- ---------------------------------------------------------------------
-- FEED: pòs aktif yo ak non/foto atis la, ak rechèch san aksan
-- (security invoker: règ RLS yo aplike)
-- ---------------------------------------------------------------------
create function public.social_feed(p_q text default null, p_limit integer default 30, p_before timestamptz default null)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  expires_at timestamptz,
  artist_id uuid,
  artist_name text,
  artist_avatar text,
  artist_verified boolean
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.content, p.created_at, p.expires_at, a.id, a.display_name, a.avatar_url, a.is_verified
  from public.posts p
  join public.profiles a on a.id = p.artist_id
  where p.status = 'active'
    and p.expires_at > now()
    and a.status = 'approved' and a.archived_at is null
    and (p_before is null or p.created_at < p_before)
    and (
      coalesce(trim(p_q), '') = ''
      or position(public.search_normalize(trim(p_q)) in public.search_normalize(p.content)) > 0
      or position(public.search_normalize(trim(p_q)) in public.search_normalize(a.display_name)) > 0
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.social_feed(text, integer, timestamptz) to anon, authenticated;
