-- 📣 Sosyal: chak pòs dwe gen yon IMAJ kare (1:1) OSWA yon LYEN, plis tèks la.
-- Atis la pa ka pibliye tèks sèlman ankò.

alter table public.posts
  add column image_path text check (char_length(image_path) <= 300),
  add column link_url   text check (link_url ~ '^https?://' and char_length(link_url) <= 500);

-- NOT VALID: pòs tèks-sèlman ki te deja egziste yo rete, men tout NOUVO pòs dwe respekte règ la
alter table public.posts
  add constraint posts_media_required check (image_path is not null or link_url is not null) not valid;

-- Imaj pòs yo: post-images/<artist_id>/<tan>.jpg (sit la koupe l kare 800×800 anvan l voye l)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Atis apwouve voye imaj pòs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'artist' and status = 'approved' and archived_at is null
    )
  );

create policy "Atis oswa admin efase imaj pòs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- Garde a: atis la pa ka chanje imaj la oswa lyen an apre li pibliye
create or replace function public.posts_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_admin boolean := public.is_admin();
  v_recent integer;
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.expires_at := now() + interval '30 days';
    if not v_admin then
      new.status := 'active';
      select count(*) into v_recent from public.posts
      where artist_id = new.artist_id and created_at > now() - interval '24 hours';
      if v_recent >= 5 then
        raise exception 'Ou rive nan limit lan: 5 pòs chak 24 è. Eseye ankò demen.';
      end if;
      -- Imaj la dwe nan pwòp dosye atis la
      if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.artist_id::text then
        raise exception 'Imaj la pa valid';
      end if;
    end if;
    new.content := trim(new.content);
    return new;
  end if;

  if new.artist_id <> old.artist_id or new.created_at <> old.created_at then
    raise exception 'Ou pa ka chanje otè oswa dat pòs la';
  end if;
  if not v_admin then
    if new.content <> old.content or new.expires_at <> old.expires_at
       or new.image_path is distinct from old.image_path or new.link_url is distinct from old.link_url
       or not (old.status = 'active' and new.status = 'deleted') then
      raise exception 'Ou ka sèlman retire pòs ou';
    end if;
  end if;
  return new;
end;
$$;

-- Feed la retounen imaj la ak lyen an tou (tip retou a chanje: fòk nou efase l anvan)
drop function public.social_feed(text, integer, timestamptz);

create function public.social_feed(p_q text default null, p_limit integer default 30, p_before timestamptz default null)
returns table (
  id uuid,
  content text,
  image_path text,
  link_url text,
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
  select p.id, p.content, p.image_path, p.link_url, p.created_at, p.expires_at,
         a.id, a.display_name, a.avatar_url, a.is_verified
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
      or position(public.search_normalize(trim(p_q)) in public.search_normalize(p.link_url)) > 0
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.social_feed(text, integer, timestamptz) to anon, authenticated;
