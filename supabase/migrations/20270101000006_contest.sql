-- =====================================================================
-- 🎄 KONKOU CHANTE NWÈL UPMIZIK (/konkou)
--  3 faz:
--    1. Kalifikasyon: piblik la vote pou ekip lekòl yo
--    2. Final: ekip ki kalifye yo (admin chwazi) gen chante yo sou sit la; vòt yo rekòmanse a zewo
--    3. Rezilta: gayan yo ak twofe yo (🥇🥈🥉)
--  Vòt: peye ak MonCash/NatCash + prèv (menm jan ak don yo). 50 goud = 1 vòt.
--       Vòt la konte SÈLMAN lè admin nan valide prèv la. Lajan an: 100 % UpMizik.
--  Elèv yo ka minè: sou sit la, non + premye lèt siyati sèlman; pa gen laj, telefòn, ni adrès.
-- =====================================================================

create table if not exists public.contests (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  title          text not null check (char_length(title) between 3 and 120),
  subtitle       text check (char_length(subtitle) <= 200),
  description    text check (char_length(description) <= 2000),
  phase          smallint not null default 1 check (phase between 1 and 3),
  vote_price_htg integer not null default 50 check (vote_price_htg between 1 and 10000),
  voting_open    boolean not null default false,
  phase_ends_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.contest_teams (
  id          uuid primary key default gen_random_uuid(),
  contest_id  uuid not null references public.contests (id) on delete cascade,
  school_name text not null check (char_length(trim(school_name)) between 2 and 120),
  team_name   text not null check (char_length(trim(team_name)) between 2 and 80),
  slogan      text check (char_length(slogan) <= 140),
  description text check (char_length(description) <= 1500),
  photo_url   text check (char_length(photo_url) <= 500),
  song_id     uuid references public.songs (id) on delete set null,   -- chante faz 2 a
  qualified   boolean not null default false,                         -- kalifye pou faz 2
  final_rank  smallint check (final_rank between 1 and 10),           -- faz 3: 1 = 🥇, 2 = 🥈, 3 = 🥉
  sort        integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists contest_teams_contest_idx on public.contest_teams (contest_id, sort);

create table if not exists public.contest_members (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.contest_teams (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),  -- egz: « Wideline P. »
  role         text check (char_length(role) <= 40),                                    -- egz: Chantè, Rap, Koris
  bio          text check (char_length(bio) <= 300),
  photo_url    text check (char_length(photo_url) <= 500),
  sort         integer not null default 0
);
create index if not exists contest_members_team_idx on public.contest_members (team_id, sort);

create table if not exists public.contest_votes (
  id              uuid primary key default gen_random_uuid(),
  contest_id      uuid not null references public.contests (id) on delete cascade,
  team_id         uuid not null references public.contest_teams (id) on delete cascade,
  phase           smallint not null check (phase between 1 and 2),
  amount_htg      numeric(12, 2) not null check (amount_htg > 0),
  votes           integer not null check (votes >= 1),
  voter_name      text check (char_length(voter_name) <= 80),
  method          public.donation_method not null,
  transaction_ref text check (char_length(transaction_ref) <= 60),
  proof_path      text not null check (proof_path like 'pending/%'),
  status          public.donation_status not null default 'pending',
  admin_note      text check (char_length(admin_note) <= 500),
  ip_hash         text,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists contest_votes_team_idx on public.contest_votes (team_id, phase, status);
create index if not exists contest_votes_status_idx on public.contest_votes (status, created_at desc);

alter table public.contests enable row level security;
alter table public.contest_teams enable row level security;
alter table public.contest_members enable row level security;
alter table public.contest_votes enable row level security;

-- Tout moun wè konkou a, ekip aktif yo ak elèv yo; admin jere yo
drop policy if exists "Tout moun wè konkou yo" on public.contests;
create policy "Tout moun wè konkou yo" on public.contests for select using (true);
drop policy if exists "Admin jere konkou yo" on public.contests;
create policy "Admin jere konkou yo" on public.contests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Tout moun wè ekip yo" on public.contest_teams;
create policy "Tout moun wè ekip yo" on public.contest_teams for select using (active or (select public.is_admin()));
drop policy if exists "Admin jere ekip yo" on public.contest_teams;
create policy "Admin jere ekip yo" on public.contest_teams for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Tout moun wè elèv yo" on public.contest_members;
create policy "Tout moun wè elèv yo" on public.contest_members for select using (true);
drop policy if exists "Admin jere elèv yo" on public.contest_members;
create policy "Admin jere elèv yo" on public.contest_members for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Vòt yo: admin sèlman ka li yo (non moun ki vote, prèv); piblik la wè total yo ak contest_standings()
drop policy if exists "Admin wè vòt yo" on public.contest_votes;
create policy "Admin wè vòt yo" on public.contest_votes for select to authenticated using ((select public.is_admin()));

-- Foto ekip yo ak elèv yo (piblik), admin sèlman ka mete yo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contest', 'contest', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "Admin mete foto konkou" on storage.objects;
create policy "Admin mete foto konkou" on storage.objects for insert to authenticated
  with check (bucket_id = 'contest' and (select public.is_admin()));
drop policy if exists "Admin efase foto konkou" on storage.objects;
create policy "Admin efase foto konkou" on storage.objects for delete to authenticated
  using (bucket_id = 'contest' and (select public.is_admin()));

-- Premye konkou a
insert into public.contests (slug, title, subtitle, description, phase, vote_price_htg, voting_open)
values ('nwel-2026', 'Konkou Chante Nwèl UpMizik', 'Lekòl Tomond yo ap chante pou Nwèl 🎄',
        'Chak lekòl prezante 3 elèv ki reprezante l. Vote pou ekip ou pi renmen an: chak 50 goud = 1 vòt. Ekip ki kalifye yo pral anrejistre chante Nwèl yo sou UpMizik, epi gayan yo ap resevwa twofe yo.',
        1, 50, false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- VOTE (tout moun, menm san kont): demann nan ap tann admin nan valide prèv la
-- ---------------------------------------------------------------------
create or replace function public.submit_contest_vote(
  p_team uuid, p_amount numeric, p_name text, p_method public.donation_method, p_ref text, p_proof_path text
)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  c       public.contests;
  t       public.contest_teams;
  v_votes integer;
  v_ip    text := public.request_ip_hash();
begin
  select * into t from public.contest_teams where id = p_team and active;
  if t.id is null then
    raise exception 'Ekip sa a pa egziste.';
  end if;
  select * into c from public.contests where id = t.contest_id;
  if not c.voting_open or c.phase > 2 then
    raise exception 'Vòt yo fèmen pou kounye a.';
  end if;
  if c.phase = 2 and not t.qualified then
    raise exception 'Ekip sa a pa nan final la.';
  end if;
  if p_amount is null or p_amount < c.vote_price_htg or p_amount > 1000000 then
    raise exception 'Montan minimòm lan se % goud (1 vòt).', c.vote_price_htg;
  end if;
  if p_proof_path is null or p_proof_path not like 'pending/contest-%' then
    raise exception 'Ajoute foto prèv peman an.';
  end if;
  if v_ip is not null and (select count(*) from public.contest_votes where ip_hash = v_ip and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'Twòp demann vòt. Eseye ankò pita.';
  end if;

  v_votes := floor(p_amount / c.vote_price_htg)::integer;
  insert into public.contest_votes (contest_id, team_id, phase, amount_htg, votes, voter_name, method, transaction_ref, proof_path, ip_hash)
  values (c.id, t.id, c.phase, p_amount, v_votes, nullif(left(trim(coalesce(p_name, '')), 80), ''), p_method,
          nullif(left(trim(coalesce(p_ref, '')), 60), ''), p_proof_path, v_ip);

  perform public.notify_admins('donation', '🗳️ Nouvo vòt konkou: ' || v_votes || ' vòt',
    coalesce(nullif(trim(p_name), ''), 'Yon moun') || ' vote pou ' || t.team_name || ' (' || p_amount || ' goud). Valide prèv la.', '/admin/konkou');
  return v_votes;
end;
$$;
revoke execute on function public.submit_contest_vote(uuid, numeric, text, public.donation_method, text, text) from public;
grant execute on function public.submit_contest_vote(uuid, numeric, text, public.donation_method, text, text) to anon, authenticated;

-- Admin: valide oswa rejte yon vòt
create or replace function public.review_contest_vote(p_vote uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman.';
  end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then
    raise exception 'Ekri rezon an pou w rejte l.';
  end if;
  update public.contest_votes
  set status = case when p_approve then 'verified'::public.donation_status else 'rejected'::public.donation_status end,
      admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_vote and status = 'pending';
  if not found then
    raise exception 'Vòt sa a deja trete.';
  end if;
end;
$$;
revoke execute on function public.review_contest_vote(uuid, boolean, text) from public, anon;
grant execute on function public.review_contest_vote(uuid, boolean, text) to authenticated;

-- Klasman piblik la: vòt VALIDE pou faz kounye a (faz 3 → montre total final la, faz 2)
create or replace function public.contest_standings(p_slug text)
returns table (team_id uuid, votes bigint, voters bigint)
language sql
stable
security definer set search_path = ''
as $$
  select t.id,
         coalesce(sum(v.votes) filter (where v.status = 'verified' and v.phase = least(c.phase, 2)), 0),
         count(v.id) filter (where v.status = 'verified' and v.phase = least(c.phase, 2))
  from public.contests c
  join public.contest_teams t on t.contest_id = c.id and t.active
  left join public.contest_votes v on v.team_id = t.id
  where c.slug = p_slug
  group by t.id;
$$;
grant execute on function public.contest_standings(text) to anon, authenticated;
