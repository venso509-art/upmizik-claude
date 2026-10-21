-- 🎤 FEATURING + SPLITS ant atis UpMizik yo
--
-- songs.artist_id  = PWOPRIYETÈ chante a (moun ki poste l; "owner" la). Li sèl ki ka modifye/efase l.
-- song_artists     = atis UpMizik ki nan featuring sou chante a, ak pousantaj pa yo.
-- Pousantaj yo se sou 85% "pa atis" la (menm jan ak song_splits pou kolaboratè deyò yo).
-- Pwopriyetè a resevwa: 100% − featuring yo − kolaboratè deyò yo.
--
-- Lè yon don sou chante a valide, chak atis featuring resevwa pa li DIRÈKTEMAN
-- nan balans li (tablo earnings), epi l ka retire l nan pwòp dashboard li.

create table public.song_artists (
  song_id          uuid not null references public.songs (id) on delete cascade,
  artist_id        uuid not null references public.profiles (id) on delete cascade,
  split_percentage numeric(5, 2) not null default 0 check (split_percentage >= 0 and split_percentage <= 100),
  created_at       timestamptz not null default now(),
  primary key (song_id, artist_id)
);

create index song_artists_artist_idx on public.song_artists (artist_id);

alter table public.song_artists enable row level security;

-- LI: pwopriyetè chante a, atis featuring yo (pa yo sèlman), ak admin.
-- Piblik la PA wè pousantaj yo: li wè sèlman non yo, atravè fonksyon song_featuring() anba a.
create policy "Pwopriyetè, featuring ak admin wè splits yo"
  on public.song_artists for select
  to authenticated
  using (
    artist_id = (select auth.uid())
    or exists (select 1 from public.songs s where s.id = song_artists.song_id and s.artist_id = (select auth.uid()))
    or (select public.is_admin())
  );
-- EKRI: okenn règ dirèk. Se SÈLMAN fonksyon set_song_artists la (pwopriyetè a) ki ka chanje yo.

-- ---------------------------------------------------------------------
-- Pwopriyetè a chwazi featuring yo ak pousantaj yo
-- p_artists = [{ "artist_id": "...", "percentage": 20 }, ...]
-- ---------------------------------------------------------------------
create function public.set_song_artists(p_song_id uuid, p_artists jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_owner uuid;
  v_feat  numeric;
  v_collab numeric;
  v_count integer;
begin
  select artist_id into v_owner from public.songs where id = p_song_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Chante sa a pa pou ou';
  end if;

  select count(*), coalesce(sum((a ->> 'percentage')::numeric), 0)
  into v_count, v_feat
  from jsonb_array_elements(coalesce(p_artists, '[]'::jsonb)) as a;

  if v_count > 10 then
    raise exception 'Maksimòm 10 atis featuring';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_artists, '[]'::jsonb)) as a
    where (a ->> 'percentage')::numeric < 0 or (a ->> 'percentage')::numeric > 100
       or (a ->> 'artist_id')::uuid = v_owner
       or not exists (
         select 1 from public.profiles p
         where p.id = (a ->> 'artist_id')::uuid and p.role = 'artist' and p.status = 'approved' and p.archived_at is null
       )
  ) then
    raise exception 'Youn nan atis featuring yo pa valid';
  end if;

  select coalesce(sum(percentage), 0) into v_collab from public.song_splits where song_id = p_song_id;
  if v_feat + v_collab > 100 then
    raise exception 'Total pousantaj yo (featuring + kolaboratè) depase 100%%';
  end if;

  delete from public.song_artists where song_id = p_song_id;
  insert into public.song_artists (song_id, artist_id, split_percentage)
  select p_song_id, (a ->> 'artist_id')::uuid, round((a ->> 'percentage')::numeric, 2)
  from jsonb_array_elements(coalesce(p_artists, '[]'::jsonb)) as a
  on conflict (song_id, artist_id) do update set split_percentage = excluded.split_percentage;
end;
$$;

revoke execute on function public.set_song_artists(uuid, jsonb) from public, anon;
grant execute on function public.set_song_artists(uuid, jsonb) to authenticated;

-- Kolaboratè deyò yo (song_splits): total la dwe rete ≤ 100% AVÈK featuring yo
create or replace function public.set_song_splits(p_song_id uuid, p_splits jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total numeric;
begin
  if not exists (select 1 from public.songs where id = p_song_id and artist_id = auth.uid()) then
    raise exception 'Chante sa a pa pou ou';
  end if;

  delete from public.song_splits where song_id = p_song_id;

  insert into public.song_splits (song_id, collaborator_name, collaborator_role, collaborator_email,
                                  collaborator_phone, collaborator_method, percentage)
  select p_song_id,
         trim(s ->> 'name'),
         trim(s ->> 'role'),
         nullif(trim(s ->> 'email'), ''),
         nullif(trim(s ->> 'phone'), ''),
         nullif(s ->> 'method', '')::public.donation_method,
         (s ->> 'percentage')::numeric
  from jsonb_array_elements(coalesce(p_splits, '[]'::jsonb)) as s;

  select coalesce((select sum(percentage) from public.song_splits where song_id = p_song_id), 0)
       + coalesce((select sum(split_percentage) from public.song_artists where song_id = p_song_id), 0)
  into v_total;
  if v_total > 100 then
    raise exception 'Total pousantaj yo (kolaboratè + featuring) depase 100%%';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- PIBLIK: non atis featuring yo sèlman (SAN pousantaj)
-- ---------------------------------------------------------------------
create function public.song_featuring(p_song_ids uuid[])
returns table (song_id uuid, artist_id uuid, display_name text, is_verified boolean)
language sql
stable
security definer set search_path = ''
as $$
  select sa.song_id, p.id, p.display_name, p.is_verified
  from public.song_artists sa
  join public.profiles p on p.id = sa.artist_id
  where sa.song_id = any (p_song_ids)
    and p.status = 'approved' and p.archived_at is null
  order by sa.created_at;
$$;

grant execute on function public.song_featuring(uuid[]) to anon, authenticated;

-- Rechèch atis pou chwazi featuring yo (non sèlman, atis apwouve)
create function public.find_artists_for_featuring(p_q text)
returns table (id uuid, display_name text, avatar_url text, is_verified boolean)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url, p.is_verified
  from public.profiles p
  where char_length(trim(coalesce(p_q, ''))) >= 1
    and p.role = 'artist' and p.status = 'approved' and p.archived_at is null
    and p.id <> auth.uid()
    and position(public.search_normalize(trim(p_q)) in public.search_normalize(p.display_name)) > 0
  order by (public.search_normalize(p.display_name) like public.search_normalize(trim(p_q)) || '%') desc, p.display_name
  limit 8;
$$;

revoke execute on function public.find_artists_for_featuring(text) from public, anon;
grant execute on function public.find_artists_for_featuring(text) to authenticated;

-- ---------------------------------------------------------------------
-- LAJAN: pataje chak don valide ant pwopriyetè a, featuring yo ak kolaboratè yo
-- ---------------------------------------------------------------------
create or replace function public.create_donation_earnings(p_donation_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  d        record;
  v_used   numeric := 0;   -- lajan ki deja bay lòt moun
  v_pct    numeric := 0;   -- pousantaj ki deja bay lòt moun
  s        record;
  v_amount numeric;
begin
  select id, artist_id, song_id, artist_share_htg, coalesce(reviewed_at, created_at) as earned_at
  into d from public.donations where id = p_donation_id and status = 'verified';
  if d.id is null or exists (select 1 from public.earnings where donation_id = d.id) then
    return;
  end if;

  -- 1. Kolaboratè deyò yo (UpMizik peye yo; yo anrejistre sou kont pwopriyetè a)
  for s in select * from public.song_splits where song_id = d.song_id order by created_at loop
    v_amount := round(d.artist_share_htg * s.percentage / 100, 2);
    insert into public.earnings (donation_id, artist_id, kind, collaborator_name, collaborator_role,
                                 collaborator_phone, collaborator_method, collaborator_email,
                                 percentage, amount_htg, earned_at)
    values (d.id, d.artist_id, 'collaborator', s.collaborator_name, s.collaborator_role,
            s.collaborator_phone, s.collaborator_method, s.collaborator_email,
            s.percentage, v_amount, d.earned_at);
    v_used := v_used + v_amount;
    v_pct := v_pct + s.percentage;
  end loop;

  -- 2. Atis featuring yo: pa yo ale DIRÈKTEMAN nan balans yo (kind = 'artist')
  for s in
    select sa.artist_id, sa.split_percentage from public.song_artists sa
    where sa.song_id = d.song_id and sa.split_percentage > 0 and sa.artist_id <> d.artist_id
    order by sa.created_at
  loop
    v_amount := round(d.artist_share_htg * s.split_percentage / 100, 2);
    insert into public.earnings (donation_id, artist_id, kind, percentage, amount_htg, earned_at)
    values (d.id, s.artist_id, 'artist', s.split_percentage, v_amount, d.earned_at);
    v_used := v_used + v_amount;
    v_pct := v_pct + s.split_percentage;
  end loop;

  -- 3. Pwopriyetè a: tout rès la (konsa total la toujou egal 85% egzak la)
  insert into public.earnings (donation_id, artist_id, kind, percentage, amount_htg, earned_at)
  values (d.id, d.artist_id, 'artist', greatest(100 - v_pct, 0), greatest(d.artist_share_htg - v_used, 0), d.earned_at);
end;
$$;

revoke execute on function public.create_donation_earnings(uuid) from public, anon, authenticated;

-- Mesaj "Ou resevwa yon don": pa PWOPRIYETÈ a sèlman, epi yon mesaj pou chak atis featuring
create or replace function public.notify_donation_verified()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song  text;
  v_share numeric;
  f       record;
begin
  if new.status = 'verified' and old.status <> 'verified' then
    select title into v_song from public.songs where id = new.song_id;
    select coalesce(sum(amount_htg), 0) into v_share
    from public.earnings where donation_id = new.id and kind = 'artist' and artist_id = new.artist_id;

    perform public.notify(new.artist_id, 'donation', '💝 Ou resevwa yon don!',
      coalesce(nullif(trim(new.donor_name), ''), 'Yon fanatik') || ' voye $' || public.fmt_money(new.amount_usd)
        || ' (' || public.fmt_money(new.amount_htg) || ' goud)'
        || coalesce(' pou chante « ' || v_song || ' »', '') || '.'
        || E'\nPa w: ' || public.fmt_money(v_share) || ' goud. L ap disponib pou retrè depi mwa sa a fini.'
        || coalesce(E'\n\nMesaj: « ' || nullif(trim(new.message), '') || ' »', ''),
      '/dashboard/finans');

    for f in
      select e.artist_id, e.amount_htg, e.percentage from public.earnings e
      where e.donation_id = new.id and e.kind = 'artist' and e.artist_id <> new.artist_id
    loop
      perform public.notify(f.artist_id, 'donation', '🎤 Ou touche sou yon featuring!',
        'Yon don $' || public.fmt_money(new.amount_usd) || ' valide sou chante « ' || coalesce(v_song, '?') || ' ».'
          || E'\nPa w (' || public.fmt_money(f.percentage) || '%): ' || public.fmt_money(f.amount_htg) || ' goud.',
        '/dashboard/revni');
    end loop;
  end if;
  return new;
end;
$$;

-- Istwa don pwopriyetè a: "pa m" = sèlman sa ki pou li (pa sa featuring yo touche)
drop function public.my_donations();

create function public.my_donations()
returns table (
  id                  uuid,
  donor_name          text,
  message             text,
  song_title          text,
  method              public.donation_method,
  amount_usd          numeric,
  amount_htg          numeric,
  my_share_htg        numeric,
  collab_share_htg    numeric,
  received_at         timestamptz,
  featuring_share_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  select d.id, d.donor_name, d.message, s.title, d.method, d.amount_usd, d.amount_htg,
         coalesce(sum(e.amount_htg) filter (where e.kind = 'artist' and e.artist_id = d.artist_id), 0),
         coalesce(sum(e.amount_htg) filter (where e.kind = 'collaborator'), 0),
         coalesce(d.reviewed_at, d.created_at),
         coalesce(sum(e.amount_htg) filter (where e.kind = 'artist' and e.artist_id <> d.artist_id), 0)
  from public.donations d
  left join public.songs s on s.id = d.song_id
  left join public.earnings e on e.donation_id = d.id
  where d.artist_id = auth.uid() and d.status = 'verified'
  group by d.id, s.title
  order by coalesce(d.reviewed_at, d.created_at) desc;
$$;

revoke execute on function public.my_donations() from public, anon;
grant execute on function public.my_donations() to authenticated;

-- ---------------------------------------------------------------------
-- "REVNI MWEN": chak chante kote m se pwopriyetè OSWA featuring
-- ---------------------------------------------------------------------
create function public.my_song_revenue()
returns table (
  song_id         uuid,
  title           text,
  owner_name      text,
  is_owner        boolean,
  my_percentage   numeric,  -- pousantaj mwen kounye a (sou 85% la)
  plays           integer,
  donations_count bigint,
  total_htg       numeric,  -- tout don valide sou chante a (100%)
  artists_htg     numeric,  -- 85% "pa atis yo"
  my_htg          numeric   -- sa M touche vre (dapre liv kont la)
)
language sql
stable
security definer set search_path = ''
as $$
  with mine as (
    select s.id, s.title, s.artist_id, s.play_count, true as is_owner
    from public.songs s where s.artist_id = auth.uid()
    union
    select s.id, s.title, s.artist_id, s.play_count, false
    from public.song_artists sa join public.songs s on s.id = sa.song_id
    where sa.artist_id = auth.uid() and s.artist_id <> auth.uid()
  )
  select m.id, m.title, o.display_name, m.is_owner,
         case when m.is_owner then
           100 - coalesce((select sum(split_percentage) from public.song_artists where song_id = m.id), 0)
               - coalesce((select sum(percentage) from public.song_splits where song_id = m.id), 0)
         else (select split_percentage from public.song_artists where song_id = m.id and artist_id = auth.uid())
         end,
         m.play_count,
         (select count(*) from public.donations d where d.song_id = m.id and d.status = 'verified'),
         coalesce((select sum(d.amount_htg) from public.donations d where d.song_id = m.id and d.status = 'verified'), 0),
         coalesce((select sum(d.artist_share_htg) from public.donations d where d.song_id = m.id and d.status = 'verified'), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join public.donations d on d.id = e.donation_id
                   where d.song_id = m.id and e.kind = 'artist' and e.artist_id = auth.uid()), 0)
  from mine m
  join public.profiles o on o.id = m.artist_id
  order by m.is_owner desc, m.title;
$$;

revoke execute on function public.my_song_revenue() from public, anon;
grant execute on function public.my_song_revenue() to authenticated;
