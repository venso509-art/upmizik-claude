-- =====================================================================
-- 🎄 KONKOU NWÈL: objektif ak final
--  Faz 1: chak ekip bezwen 200 vòt (phase1_goal) → li kalifye OTOMATIKMAN pou faz 2
--  Faz 2: objektif 500 vòt (phase2_goal); se 5 premye yo (finalists) ki pase nan final la
--  Faz 3: FINAL: piblik la vote ankò pami 5 finalis yo → admin pibliye 🥇🥈🥉 (3 premye yo)
--  Chak faz gen pwòp vòt li (vòt yo rekòmanse a zewo nan chak faz).
-- =====================================================================

alter table public.contests
  add column if not exists phase1_goal integer not null default 200 check (phase1_goal >= 1),
  add column if not exists phase2_goal integer not null default 500 check (phase2_goal >= 1),
  add column if not exists finalists   integer not null default 5 check (finalists between 1 and 50);

alter table public.contest_teams
  add column if not exists finalist boolean not null default false;   -- nan final la (faz 3)

alter table public.contest_votes drop constraint if exists contest_votes_phase_check;
alter table public.contest_votes add constraint contest_votes_phase_check check (phase between 1 and 3);

-- Vòt valide pa faz pou chak ekip + si l ka patisipe nan faz kounye a
drop function if exists public.contest_standings(text);
create function public.contest_standings(p_slug text)
returns table (team_id uuid, votes bigint, voters bigint, v1 bigint, v2 bigint, v3 bigint, qualified boolean, finalist boolean)
language sql
stable
security definer set search_path = ''
as $$
  with c as (select * from public.contests where slug = p_slug),
  s as (
    select t.id, t.qualified as q_flag, t.finalist,
           coalesce(sum(v.votes) filter (where v.status = 'verified' and v.phase = 1), 0) as v1,
           coalesce(sum(v.votes) filter (where v.status = 'verified' and v.phase = 2), 0) as v2,
           coalesce(sum(v.votes) filter (where v.status = 'verified' and v.phase = 3), 0) as v3,
           count(v.id) filter (where v.status = 'verified' and v.phase = (select phase from c)) as voters
    from public.contest_teams t
    left join public.contest_votes v on v.team_id = t.id
    where t.contest_id = (select id from c) and t.active
    group by t.id
  )
  select s.id,
         case (select phase from c) when 1 then s.v1 when 2 then s.v2 else s.v3 end,
         s.voters, s.v1, s.v2, s.v3,
         s.q_flag or s.v1 >= (select phase1_goal from c),
         s.finalist
  from s;
$$;
grant execute on function public.contest_standings(text) to anon, authenticated;

-- Vòt: faz 2 → sèlman ekip ki kalifye (200 vòt oswa admin); faz 3 → sèlman finalis yo
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
  v_v1    bigint;
  v_ip    text := public.request_ip_hash();
begin
  select * into t from public.contest_teams where id = p_team and active;
  if t.id is null then
    raise exception 'Ekip sa a pa egziste.';
  end if;
  select * into c from public.contests where id = t.contest_id;
  if not c.voting_open then
    raise exception 'Vòt yo fèmen pou kounye a.';
  end if;
  if c.phase = 2 then
    select coalesce(sum(votes), 0) into v_v1 from public.contest_votes where team_id = t.id and phase = 1 and status = 'verified';
    if not (t.qualified or v_v1 >= c.phase1_goal) then
      raise exception 'Ekip sa a pa t kalifye pou faz 2.';
    end if;
  elsif c.phase = 3 and not t.finalist then
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
    coalesce(nullif(trim(p_name), ''), 'Yon moun') || ' vote pou ' || t.team_name || ' (' || p_amount || ' goud, faz ' || c.phase || '). Valide prèv la.', '/admin/konkou');
  return v_votes;
end;
$$;

-- Admin: pase nan pwochen faz la
--  1 → 2: ekip ki gen 200 vòt yo make « kalifye » (pou istwa a)
--  2 → 3: 5 premye yo (vòt faz 2) make « finalis »
create or replace function public.contest_set_phase(p_contest uuid, p_phase smallint)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.contests;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman.';
  end if;
  select * into c from public.contests where id = p_contest for update;
  if c.id is null or p_phase not between 1 and 3 then
    raise exception 'Konkou oswa faz pa valid.';
  end if;

  if p_phase >= 2 and c.phase < 2 then
    update public.contest_teams t set qualified = true
    where t.contest_id = c.id and t.active
      and (select coalesce(sum(votes), 0) from public.contest_votes v where v.team_id = t.id and v.phase = 1 and v.status = 'verified') >= c.phase1_goal;
  end if;
  if p_phase = 3 and c.phase < 3 then
    update public.contest_teams set finalist = false where contest_id = c.id;
    update public.contest_teams set finalist = true
    where id in (
      select t.id from public.contest_teams t
      where t.contest_id = c.id and t.active and t.qualified
      order by (select coalesce(sum(votes), 0) from public.contest_votes v where v.team_id = t.id and v.phase = 2 and v.status = 'verified') desc, t.sort
      limit c.finalists
    );
  end if;
  update public.contests set phase = p_phase where id = c.id;
end;
$$;
revoke execute on function public.contest_set_phase(uuid, smallint) from public, anon;
grant execute on function public.contest_set_phase(uuid, smallint) to authenticated;

-- Admin: pibliye gayan yo (3 premye yo nan vòt final la) epi fèmen vòt yo
create or replace function public.contest_publish_winners(p_contest uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman.';
  end if;
  update public.contest_teams set final_rank = null where contest_id = p_contest;
  with ranked as (
    select t.id, row_number() over (
             order by (select coalesce(sum(votes), 0) from public.contest_votes v where v.team_id = t.id and v.phase = 3 and v.status = 'verified') desc, t.sort
           ) as rk
    from public.contest_teams t
    where t.contest_id = p_contest and t.active and t.finalist
  )
  update public.contest_teams t set final_rank = r.rk
  from ranked r where r.id = t.id and r.rk <= 3;
  update public.contests set voting_open = false where id = p_contest;
end;
$$;
revoke execute on function public.contest_publish_winners(uuid) from public, anon;
grant execute on function public.contest_publish_winners(uuid) to authenticated;
