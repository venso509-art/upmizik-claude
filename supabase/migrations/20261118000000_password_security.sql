-- 🔐 Chanjman modpas pwoteje: ansyen modpas + KÒD SEKRÈ + 3 tantativ maksimòm.
-- Kòd sekrè a sove CHIFRE (bcrypt). Li PA janm parèt nan kòd sit la.
-- Pou mete kòd ou a, kouri yon ti kòmand apa nan SQL Editor (gade enstriksyon yo), pa nan fichye sa a.

create table public.account_security (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  secret_hash     text,                         -- bcrypt kòd sekrè a
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

-- Pa gen okenn règ RLS: pèsonn pa ka li tablo a dirèkteman, menm pa admin nan.
-- Se sèlman fonksyon ki anba yo ki ka manyen l.
alter table public.account_security enable row level security;

-- Eta kont moun ki konekte a: èske li gen yon kòd, èske l bloke
create function public.security_status()
returns table (has_code boolean, locked_until timestamptz, failed_attempts integer)
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(s.secret_hash is not null, false),
         case when s.locked_until > now() then s.locked_until end,
         coalesce(s.failed_attempts, 0)
  from (select auth.uid() as uid) me
  left join public.account_security s on s.user_id = me.uid;
$$;

-- Konte yon echèk. Apre 3, kont lan bloke 30 minit (epi sit la dekonekte moun nan).
-- Retounen kantite tantativ ki rete (0 = bloke).
create function public.register_security_failure()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_attempts integer;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  insert into public.account_security (user_id, failed_attempts)
  values (v_uid, 1)
  on conflict (user_id) do update
    set failed_attempts = public.account_security.failed_attempts + 1, updated_at = now()
  returning failed_attempts into v_attempts;

  if v_attempts >= 3 then
    update public.account_security
    set failed_attempts = 0, locked_until = now() + interval '30 minutes', updated_at = now()
    where user_id = v_uid;
    perform public.audit('security.lockout', 'account_security', v_uid, '{}'::jsonb);
    return 0;
  end if;
  return 3 - v_attempts;
end;
$$;

-- Verifye kòd sekrè a. Si l pa bon, sa konte kòm yon echèk.
-- Retounen: ok, tantativ ki rete, èske kont lan bloke kounye a.
create function public.verify_secret_code(p_code text)
returns table (ok boolean, attempts_left integer, locked boolean)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.account_security;
  v_left integer;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte';
  end if;
  select * into v_row from public.account_security where user_id = v_uid;
  if v_row.locked_until > now() then
    return query select false, 0, true;
    return;
  end if;
  if v_row.secret_hash is null then
    raise exception 'Kont ou pa gen kòd sekrè';
  end if;
  if p_code is not null and extensions.crypt(p_code, v_row.secret_hash) = v_row.secret_hash then
    return query select true, 3 - coalesce(v_row.failed_attempts, 0), false;
    return;
  end if;
  v_left := public.register_security_failure();
  return query select false, v_left, v_left = 0;
end;
$$;

-- Tout bagay pase: remete kontè a a zewo epi anrejistre chanjman an nan jounal la
create function public.password_change_succeeded()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.account_security
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = auth.uid();
  perform public.audit('security.password_changed', 'account_security', auth.uid(), '{}'::jsonb);
end;
$$;

revoke execute on function public.security_status() from public, anon;
revoke execute on function public.register_security_failure() from public, anon;
revoke execute on function public.verify_secret_code(text) from public, anon;
revoke execute on function public.password_change_succeeded() from public, anon;
grant execute on function public.security_status() to authenticated;
grant execute on function public.register_security_failure() to authenticated;
grant execute on function public.verify_secret_code(text) to authenticated;
grant execute on function public.password_change_succeeded() to authenticated;
