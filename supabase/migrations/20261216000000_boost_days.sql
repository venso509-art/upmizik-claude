-- =====================================================================
-- BOOST: konbyen jou boost aktif la dire (boost_days), vizib sou songs ak profiles.
-- Sit la itilize l pou notifikasyon "kado" espesyal plan 24 è a (1 jou) pou mizik yo.
-- Menm pwoteksyon ak lòt kolòn boost yo: se review_boost sèlman ki ka chanje l.
-- =====================================================================

alter table public.songs    add column boost_days integer check (boost_days > 0);
alter table public.profiles add column boost_days integer check (boost_days > 0);

create or replace function public.guard_boost_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('upmizik.boost_admin', true), '') <> '1' then
    new.is_boosted := old.is_boosted;
    new.boost_expires_at := old.boost_expires_at;
    new.boost_type := old.boost_type;
    new.boost_days := old.boost_days;
  end if;
  return new;
end;
$$;

-- review_boost mete boost_days = kantite jou plan ki aktive a
create or replace function public.review_boost(p_id uuid, p_approve boolean, p_note text default null)
returns timestamptz
language plpgsql
security definer set search_path = ''
as $$
declare
  r        public.boost_purchases;
  v_until  timestamptz;
  v_label  text;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into r from public.boost_purchases where id = p_id for update;
  if not found then
    raise exception 'Demann sa a pa egziste';
  end if;
  if r.status <> 'pending' then
    raise exception 'Demann sa a deja trete';
  end if;

  if r.boost_type = 'mizik' then
    select '« ' || title || ' »' into v_label from public.songs where id = r.target_id;
  else
    v_label := 'pwofil ou';
  end if;

  if not p_approve then
    update public.boost_purchases
    set status = 'rejected', admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_id;
    perform public.notify(r.artist_id, 'account', 'Boost la pa aktive',
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Nou pa jwenn peman boost ' || coalesce(v_label, '') || ' la. Kontakte ekip UpMizik la si se yon erè.'),
      '/dashboard#boost');
    return null;
  end if;

  -- Aktive: jodi a + jou yo (si l te deja boosted, nou ajoute jou yo sou sa ki rete a)
  perform set_config('upmizik.boost_admin', '1', true);
  if r.boost_type = 'mizik' then
    update public.songs
    set is_boosted = true, boost_type = 'mizik', boost_days = r.duration_days,
        boost_expires_at = greatest(coalesce(boost_expires_at, now()), now()) + make_interval(days => r.duration_days)
    where id = r.target_id
    returning boost_expires_at into v_until;
  else
    update public.profiles
    set is_boosted = true, boost_type = 'profil', boost_days = r.duration_days,
        boost_expires_at = greatest(coalesce(boost_expires_at, now()), now()) + make_interval(days => r.duration_days)
    where id = r.target_id
    returning boost_expires_at into v_until;
  end if;
  perform set_config('upmizik.boost_admin', '', true);

  if v_until is null then
    raise exception 'Mizik oswa pwofil sa a pa egziste ankò';
  end if;

  update public.boost_purchases
  set status = 'active', starts_at = now(), expires_at = v_until,
      admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id;

  perform public.notify(r.artist_id, 'account', '🔥 Boost ou an aktive!',
    'Boost ' || coalesce(v_label, '') || ' aktif jiska ' || to_char(v_until at time zone 'America/Port-au-Prince', 'DD/MM/YYYY') || '. Fanatik yo ap wè l an premye!',
    case when r.boost_type = 'mizik' then '/chante/' || r.target_id::text else '/atis/' || r.artist_id::text end);

  return v_until;
end;
$$;
