-- =====================================================================
-- 🎁 KADO SOU PWOFIL ATIS LA (san chante)
--  Toupatou kote gen bouton "Sipòte": Lajan (MonCash/NatCash) OSWA Kado (kredi).
--  Kado sou pwofil la: 85 % pou atis la nèt (pa gen featuring/kolaboratè), 15 % pou UpMizik.
-- =====================================================================

alter table public.song_gifts alter column song_title drop not null;

create function public.send_artist_gift(p_artist uuid, p_gift text, p_quantity integer, p_message text default null)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_gift    public.live_gift_types;
  v_qty     integer := least(greatest(coalesce(p_quantity, 1), 1), 99);
  v_cost    integer;
  v_htg     numeric;
  v_share   numeric;
  v_name    text;
  v_id      uuid;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Konekte pou w voye kado';
  end if;
  if not exists (select 1 from public.profiles where id = p_artist and role = 'artist' and status = 'approved' and archived_at is null) then
    raise exception 'Atis sa a pa disponib';
  end if;
  if p_artist = v_uid then
    raise exception 'Ou pa ka voye kado bay tèt ou';
  end if;
  select * into v_gift from public.live_gift_types where id = p_gift and active;
  if not found then
    raise exception 'Kado sa a pa egziste';
  end if;

  v_cost := v_gift.credits * v_qty;
  select round(v_cost * credit_htg, 2) into v_htg from public.settings where id;
  select coalesce(nullif(trim(display_name), ''), 'Fanatik') into v_name from public.profiles where id = v_uid;

  insert into public.song_gifts (song_id, artist_id, sender_id, sender_name, song_title, gift_id, quantity, credits, amount_htg, message)
  values (null, p_artist, v_uid, v_name, null, p_gift, v_qty, v_cost, v_htg, nullif(trim(p_message), ''))
  returning id, artist_share_htg into v_id, v_share;

  v_balance := public.add_credits(v_uid, -v_cost, 'gift', v_id, v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text || ' · pwofil');

  insert into public.earnings (song_gift_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (v_id, p_artist, 'artist', 100, v_share, now());

  perform public.notify(p_artist, 'donation', '🎁 Ou resevwa yon kado!',
    v_name || ' voye ' || v_gift.emoji || ' ' || v_gift.name || ' x' || v_qty::text || ' sou pwofil ou'
      || coalesce(': « ' || left(nullif(trim(p_message), ''), 120) || ' »', '.'), '/dashboard/finans');

  return v_balance;
end;
$$;

revoke execute on function public.send_artist_gift(uuid, text, integer, text) from public, anon;
grant execute on function public.send_artist_gift(uuid, text, integer, text) to authenticated;
