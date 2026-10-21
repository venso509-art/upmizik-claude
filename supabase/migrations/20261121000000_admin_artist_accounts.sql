-- 💼 KONT ATIS (admin): kalkil mwa pa mwa, chante pa chante, ak ACHIV relve chak mwa.
-- Tout chif yo soti nan LIV KONT la (earnings) ak don/retrè yo: menm sous ak balans atis yo,
-- konsa sa admin nan wè a toujou egal ak sa atis la wè (pa gen de kalkil ki ka diferan).
-- Mwa yo kalkile nan lè Ayiti (America/Port-au-Prince).

-- ---------------------------------------------------------------------
-- 1. Kalkil chak (mwa, atis) an dirèk
-- ---------------------------------------------------------------------
create or replace function public.finance_month_rows()
returns table (
  month             date,
  artist_id         uuid,
  donations_count   bigint,
  gross_htg         numeric,  -- tout don valide pou atis la (100%)
  platform_htg      numeric,  -- 15% UpMizik
  own_htg           numeric,  -- pa atis la sou pwòp chante li
  featuring_in_htg  numeric,  -- sa l touche kòm featuring sou chante LÒT atis
  featuring_out_htg numeric,  -- sa featuring yo touche sou chante LI
  collaborators_htg numeric,  -- kolaboratè deyò (UpMizik peye yo)
  fee_htg           numeric,  -- $0.99 frè lojistik (mwa ki fini sèlman)
  net_htg           numeric,  -- sa atis la gen pou resevwa pou mwa a
  paid_htg          numeric,  -- retrè ki PEYE pandan mwa a
  closed            boolean   -- mwa a fini (pa mwa kounye a)
)
language sql
stable
security definer set search_path = ''
as $$
  with cur as (
    select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m
  ), don as (
    select d.artist_id,
           date_trunc('month', coalesce(d.reviewed_at, d.created_at) at time zone 'America/Port-au-Prince')::date as month,
           count(*) as cnt, sum(d.amount_htg) as gross, sum(d.amount_htg - d.artist_share_htg) as platform
    from public.donations d
    where d.status = 'verified'
    group by 1, 2
  ), earn as (
    select e.artist_id as earner, d.artist_id as owner, e.kind,
           date_trunc('month', e.earned_at at time zone 'America/Port-au-Prince')::date as month,
           sum(e.amount_htg) as amt
    from public.earnings e
    join public.donations d on d.id = e.donation_id
    group by 1, 2, 3, 4
  ), pays as (
    select p.artist_id,
           date_trunc('month', p.processed_at at time zone 'America/Port-au-Prince')::date as month,
           sum(p.amount_htg) as amt
    from public.payouts p
    where p.status = 'paid' and p.processed_at is not null
    group by 1, 2
  ), keys as (
    select artist_id, month from don
    union select earner, month from earn where kind = 'artist'
    union select owner, month from earn
    union select artist_id, month from pays
  ), agg as (
    select k.month, k.artist_id,
           coalesce(dn.cnt, 0) as cnt,
           coalesce(dn.gross, 0) as gross,
           coalesce(dn.platform, 0) as platform,
           coalesce((select sum(amt) from earn where kind = 'artist' and earner = k.artist_id and owner = k.artist_id and month = k.month), 0) as own,
           coalesce((select sum(amt) from earn where kind = 'artist' and earner = k.artist_id and owner <> k.artist_id and month = k.month), 0) as fin,
           coalesce((select sum(amt) from earn where kind = 'artist' and owner = k.artist_id and earner <> k.artist_id and month = k.month), 0) as fout,
           coalesce((select sum(amt) from earn where kind = 'collaborator' and owner = k.artist_id and month = k.month), 0) as col,
           coalesce(p.amt, 0) as paid
    from keys k
    left join don dn on dn.artist_id = k.artist_id and dn.month = k.month
    left join pays p on p.artist_id = k.artist_id and p.month = k.month
  )
  select a.month, a.artist_id, a.cnt, a.gross, a.platform, a.own, a.fin, a.fout, a.col,
         -- Menm règ ak balans atis la: $0.99 sèlman pou mwa ki fini, e pa plis pase sa l touche
         case when a.month < (select m from cur) then least(a.own + a.fin, public.monthly_fee_htg()) else 0 end,
         (a.own + a.fin) - case when a.month < (select m from cur) then least(a.own + a.fin, public.monthly_fee_htg()) else 0 end,
         a.paid,
         a.month < (select m from cur)
  from agg a
  where public.is_admin();
$$;

revoke execute on function public.finance_month_rows() from public, anon;
grant execute on function public.finance_month_rows() to authenticated;

-- ---------------------------------------------------------------------
-- 2. ACHIV: relve mwa yo, JELE lè admin nan fèmen mwa a (pa ka chanje apre)
-- ---------------------------------------------------------------------
create table public.closed_months (
  month      date primary key check (month = date_trunc('month', month)::date),
  closed_at  timestamptz not null default now(),
  closed_by  uuid references public.profiles (id) on delete set null
);

create table public.monthly_reports (
  month             date not null references public.closed_months (month) on delete restrict,
  artist_id         uuid not null references public.profiles (id) on delete cascade,
  donations_count   integer not null,
  gross_htg         numeric(12, 2) not null,
  platform_htg      numeric(12, 2) not null,
  own_htg           numeric(12, 2) not null,
  featuring_in_htg  numeric(12, 2) not null,
  featuring_out_htg numeric(12, 2) not null,
  collaborators_htg numeric(12, 2) not null,
  fee_htg           numeric(12, 2) not null,
  net_htg           numeric(12, 2) not null,
  paid_htg          numeric(12, 2) not null,
  primary key (month, artist_id)
);

alter table public.closed_months enable row level security;
alter table public.monthly_reports enable row level security;

create policy "Admin wè mwa ki fèmen yo" on public.closed_months for select to authenticated using ((select public.is_admin()));
-- Admin wè tout relve yo; chak atis ka wè pwòp relve pa l
create policy "Admin oswa atis la wè relve a" on public.monthly_reports for select to authenticated
  using ((select public.is_admin()) or artist_id = (select auth.uid()));
-- Pa gen règ pou ekri: SÈLMAN admin_close_month ka kreye relve yo, e pèsonn pa ka modifye yo.

create or replace function public.admin_close_month(p_month date)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Se sèlman admin ki ka fèmen yon mwa';
  end if;
  if v_month >= date_trunc('month', now() at time zone 'America/Port-au-Prince')::date then
    raise exception 'Ou ka fèmen yon mwa sèlman APRE li fini';
  end if;
  if exists (select 1 from public.closed_months where month = v_month) then
    raise exception 'Mwa sa a deja fèmen';
  end if;

  insert into public.closed_months (month, closed_by) values (v_month, auth.uid());
  insert into public.monthly_reports
  select r.month, r.artist_id, r.donations_count, r.gross_htg, r.platform_htg, r.own_htg, r.featuring_in_htg,
         r.featuring_out_htg, r.collaborators_htg, r.fee_htg, r.net_htg, r.paid_htg
  from public.finance_month_rows() r
  where r.month = v_month;
  get diagnostics v_count = row_count;

  perform public.audit('month.closed', 'closed_months', null, jsonb_build_object('month', v_month, 'artists', v_count));
  return v_count;
end;
$$;

revoke execute on function public.admin_close_month(date) from public, anon;
grant execute on function public.admin_close_month(date) to authenticated;

-- Lis mwa yo ak total yo (relve jele si mwa a fèmen, sinon kalkil an dirèk)
create or replace function public.admin_months()
returns table (
  month date, is_closed boolean, closed_at timestamptz, artists integer, donations_count bigint,
  gross_htg numeric, platform_htg numeric, artists_net_htg numeric, featuring_htg numeric,
  collaborators_htg numeric, fee_htg numeric, paid_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with live as (select * from public.finance_month_rows()),
  months as (select distinct month from live union select month from public.closed_months)
  select m.month, cm.month is not null, cm.closed_at,
         case when cm.month is not null then (select count(*)::int from public.monthly_reports r where r.month = m.month)
              else (select count(*)::int from live l where l.month = m.month) end,
         coalesce(case when cm.month is not null then (select sum(donations_count) from public.monthly_reports r where r.month = m.month)
                       else (select sum(donations_count) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(gross_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(gross_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(platform_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(platform_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(net_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(net_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(featuring_in_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(featuring_in_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(collaborators_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(collaborators_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(fee_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(fee_htg) from live l where l.month = m.month) end, 0),
         coalesce(case when cm.month is not null then (select sum(paid_htg) from public.monthly_reports r where r.month = m.month)
                       else (select sum(paid_htg) from live l where l.month = m.month) end, 0)
  from months m
  left join public.closed_months cm on cm.month = m.month
  where public.is_admin()
  order by m.month desc;
$$;

revoke execute on function public.admin_months() from public, anon;
grant execute on function public.admin_months() to authenticated;

-- Detay yon mwa: yon liy pa atis (relve jele si mwa a fèmen)
create or replace function public.admin_month_detail(p_month date)
returns table (
  artist_id uuid, display_name text, is_closed boolean, donations_count bigint,
  gross_htg numeric, platform_htg numeric, own_htg numeric, featuring_in_htg numeric, featuring_out_htg numeric,
  collaborators_htg numeric, fee_htg numeric, net_htg numeric, paid_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with m as (select date_trunc('month', p_month)::date as v),
  frozen as (
    select r.artist_id, true as is_closed, r.donations_count::bigint as donations_count, r.gross_htg, r.platform_htg, r.own_htg,
           r.featuring_in_htg, r.featuring_out_htg, r.collaborators_htg, r.fee_htg, r.net_htg, r.paid_htg
    from public.monthly_reports r where r.month = (select v from m)
  ),
  live as (
    select l.artist_id, false, l.donations_count, l.gross_htg, l.platform_htg, l.own_htg,
           l.featuring_in_htg, l.featuring_out_htg, l.collaborators_htg, l.fee_htg, l.net_htg, l.paid_htg
    from public.finance_month_rows() l
    where l.month = (select v from m)
      and not exists (select 1 from public.closed_months c where c.month = (select v from m))
  ),
  rows_ as (select * from frozen union all select * from live)
  select x.artist_id, p.display_name, x.is_closed, x.donations_count, x.gross_htg, x.platform_htg, x.own_htg,
         x.featuring_in_htg, x.featuring_out_htg, x.collaborators_htg, x.fee_htg, x.net_htg, x.paid_htg
  from rows_ x
  join public.profiles p on p.id = x.artist_id
  where public.is_admin()
  order by x.gross_htg desc, p.display_name;
$$;

revoke execute on function public.admin_month_detail(date) from public, anon;
grant execute on function public.admin_month_detail(date) to authenticated;

-- ---------------------------------------------------------------------
-- 3. LIS ATIS YO ak balans yo
-- ---------------------------------------------------------------------
create or replace function public.admin_artist_accounts()
returns table (
  artist_id uuid, display_name text, avatar_url text, status public.account_status, is_verified boolean,
  songs integer, plays bigint, month_gross_htg numeric, month_net_htg numeric,
  available_htg numeric, pending_htg numeric, paid_htg numeric, eligible_from timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  with cur as (select date_trunc('month', now() at time zone 'America/Port-au-Prince')::date as m),
  live as (select * from public.finance_month_rows() where month = (select m from cur))
  select p.id, p.display_name, p.avatar_url, p.status, p.is_verified,
         (select count(*)::int from public.songs s where s.artist_id = p.id),
         coalesce((select sum(s.play_count) from public.songs s where s.artist_id = p.id), 0)::bigint,
         coalesce((select gross_htg from live where live.artist_id = p.id), 0),
         coalesce((select net_htg from live where live.artist_id = p.id), 0),
         coalesce(b.available_htg, 0), coalesce(b.pending_htg, 0), coalesce(b.paid_htg, 0), b.eligible_from
  from public.profiles p
  left join lateral public.artist_balance(p.id) b on true
  where p.role = 'artist' and public.is_admin()
  order by coalesce(b.available_htg, 0) desc, p.display_name;
$$;

revoke execute on function public.admin_artist_accounts() from public, anon;
grant execute on function public.admin_artist_accounts() to authenticated;

-- ---------------------------------------------------------------------
-- 4. CHANTE yon atis: ekout, don, ak kote chak goud ale (tout tan, oswa yon mwa)
-- ---------------------------------------------------------------------
create or replace function public.admin_artist_songs(p_artist uuid, p_month date default null)
returns table (
  song_id uuid, title text, is_owner boolean, owner_name text, plays integer, archived boolean,
  donations_count bigint, gross_htg numeric, platform_htg numeric, owner_htg numeric,
  featuring_htg numeric, collaborators_htg numeric, this_artist_htg numeric
)
language sql
stable
security definer set search_path = ''
as $$
  with songs_ as (
    select s.id, s.title, s.artist_id, s.play_count, s.archived_at, true as is_owner
    from public.songs s where s.artist_id = p_artist
    union
    select s.id, s.title, s.artist_id, s.play_count, s.archived_at, false
    from public.song_artists sa join public.songs s on s.id = sa.song_id
    where sa.artist_id = p_artist and s.artist_id <> p_artist
  ), dons as (
    select d.* from public.donations d
    where d.status = 'verified'
      and (p_month is null
           or date_trunc('month', coalesce(d.reviewed_at, d.created_at) at time zone 'America/Port-au-Prince')::date
              = date_trunc('month', p_month)::date)
  )
  select s.id, s.title, s.is_owner, o.display_name, s.play_count, s.archived_at is not null,
         (select count(*) from dons d where d.song_id = s.id),
         coalesce((select sum(d.amount_htg) from dons d where d.song_id = s.id), 0),
         coalesce((select sum(d.amount_htg - d.artist_share_htg) from dons d where d.song_id = s.id), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join dons d on d.id = e.donation_id
                   where d.song_id = s.id and e.kind = 'artist' and e.artist_id = s.artist_id), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join dons d on d.id = e.donation_id
                   where d.song_id = s.id and e.kind = 'artist' and e.artist_id <> s.artist_id), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join dons d on d.id = e.donation_id
                   where d.song_id = s.id and e.kind = 'collaborator'), 0),
         coalesce((select sum(e.amount_htg) from public.earnings e join dons d on d.id = e.donation_id
                   where d.song_id = s.id and e.kind = 'artist' and e.artist_id = p_artist), 0)
  from songs_ s
  join public.profiles o on o.id = s.artist_id
  where public.is_admin()
  order by s.is_owner desc, 8 desc, s.title;
$$;

revoke execute on function public.admin_artist_songs(uuid, date) from public, anon;
grant execute on function public.admin_artist_songs(uuid, date) to authenticated;
