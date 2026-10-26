-- =====================================================================
-- NOTIFIKASYON KÒMANTÈ: atis la resevwa yon ti kat 💬 lè yon moun kòmante CHANTE l tou
-- (anvan: sèlman pòs yo ak repons yo). Tit yo pa gen emoji ankò: kat la gen pwòp ikòn li.
-- =====================================================================

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name    text;
  v_parent  uuid;
  v_owner   uuid;
  v_title   text;
  v_link    text;
  v_excerpt text := left(new.body, 140) || case when char_length(new.body) > 140 then '…' else '' end;
begin
  select coalesce(display_name, 'Yon fanatik') into v_name from public.profiles where id = new.user_id;
  v_name := left(coalesce(v_name, 'Yon fanatik'), 60);
  v_link := case when new.song_id is not null then '/chante/' || new.song_id || '#komante'
                 else '/sosyal/' || new.post_id end;

  -- 1. Repons: moun ki te ekri kòmantè prensipal la
  if new.parent_id is not null then
    select user_id into v_parent from public.comments where id = new.parent_id;
    if v_parent is not null and v_parent <> new.user_id then
      perform public.notify(v_parent, 'comment', v_name || ' reponn kòmantè w', v_excerpt, v_link);
    end if;
  end if;

  -- 2. Atis ki pibliye chante a oswa pòs la (si se pa li menm, e si li pa deja resevwa repons lan)
  if new.song_id is not null then
    select artist_id, title into v_owner, v_title from public.songs where id = new.song_id;
    if v_owner is not null and v_owner <> new.user_id and v_owner is distinct from v_parent then
      perform public.notify(v_owner, 'comment', v_name || ' kòmante « ' || left(coalesce(v_title, 'chante w'), 50) || ' »', v_excerpt, v_link);
    end if;
  elsif new.post_id is not null then
    select artist_id into v_owner from public.posts where id = new.post_id;
    if v_owner is not null and v_owner <> new.user_id and v_owner is distinct from v_parent then
      perform public.notify(v_owner, 'comment', v_name || ' kòmante pòs ou', v_excerpt, v_link);
    end if;
  end if;
  return new;
end;
$$;
