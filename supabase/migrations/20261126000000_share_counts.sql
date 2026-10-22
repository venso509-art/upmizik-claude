-- 🔗 Kontè pataj: chak fwa yon moun pataje yon chante oswa yon pòs (WhatsApp, kopye lyen...)

alter table public.songs add column share_count integer not null default 0 check (share_count >= 0);
alter table public.posts add column share_count integer not null default 0 check (share_count >= 0);

-- Ogmante kontè a pa 1. Tout moun ka rele l (menm vizitè ki pa konekte),
-- men li ka sèlman AJOUTE 1: pèsonn pa ka chanje chif la jan l vle.
create or replace function public.record_share(p_kind text, p_id uuid)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_kind = 'song' then
    update public.songs set share_count = share_count + 1
    where id = p_id and archived_at is null
    returning share_count into v_count;
  elsif p_kind = 'post' then
    update public.posts set share_count = share_count + 1
    where id = p_id and status = 'active'
    returning share_count into v_count;
  else
    raise exception 'Kalite sa a pa valid';
  end if;
  return coalesce(v_count, 0);
end;
$$;

revoke execute on function public.record_share(text, uuid) from public;
grant execute on function public.record_share(text, uuid) to anon, authenticated;

-- Gad pòs yo: kite kontè pataj la chanje (se sèlman kolòn sa a ki chanje), rès règ yo pa chanje
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
    new.share_count := 0;
    if not v_admin then
      new.status := 'active';
      select count(*) into v_recent from public.posts
      where artist_id = new.artist_id and created_at > now() - interval '24 hours';
      if v_recent >= 5 then
        raise exception 'Ou rive nan limit lan: 5 pòs chak 24 è. Eseye ankò demen.';
      end if;
      if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.artist_id::text then
        raise exception 'Imaj la pa valid';
      end if;
    end if;
    new.content := trim(new.content);
    return new;
  end if;

  -- Kontè pataj la sèlman (fonksyon record_share): pa okenn lòt chanjman
  if (new.content, new.image_path, new.link_url, new.status, new.expires_at, new.artist_id, new.created_at)
     is not distinct from (old.content, old.image_path, old.link_url, old.status, old.expires_at, old.artist_id, old.created_at)
     and new.share_count = old.share_count + 1 then
    return new;
  end if;

  if new.artist_id <> old.artist_id or new.created_at <> old.created_at then
    raise exception 'Ou pa ka chanje otè oswa dat pòs la';
  end if;
  if new.share_count <> old.share_count and not v_admin then
    raise exception 'Ou pa ka chanje kontè pataj la';
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

-- Chante yo: pèsonn (menm atis la) pa ka chanje kontè pataj la jan l vle, sèlman +1 (record_share)
create or replace function public.songs_share_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.share_count := 0;
  elsif new.share_count <> old.share_count and new.share_count <> old.share_count + 1 and not public.is_admin() then
    raise exception 'Ou pa ka chanje kontè pataj la';
  end if;
  return new;
end;
$$;

create trigger songs_share_guard
  before insert or update on public.songs
  for each row execute function public.songs_share_guard();
