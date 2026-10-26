-- =====================================================================
-- MANM AFILYE: non jwèt / non atis (anplis vrè non ak siyati a)
--  - Demann nan mande l (obligatwa)
--  - Pseudo otomatik la fèt ak non jwèt la (egz: "Venso Music" → VENSOMUSIC2026)
-- Yon atis ka vin manm tou: li rete atis (wòl li pa chanje), li gen 2 espas (Dashboard atis + Espas manm).
-- =====================================================================

alter table public.members
  add column nickname text check (char_length(trim(nickname)) between 2 and 40);

drop function public.request_membership(text, text, text, text, text, text);

create function public.request_membership(
  p_full_name text, p_nickname text, p_email text, p_phone text, p_city text, p_motivation text, p_sex text
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.members;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Ou dwe konekte pou w vin manm';
  end if;
  if p_sex not in ('fi', 'gason') then
    raise exception 'Chwazi si w se fi oswa gason';
  end if;
  if char_length(trim(coalesce(p_nickname, ''))) not between 2 and 40 then
    raise exception 'Mete non jwèt ou oswa non atis ou (2 a 40 karaktè)';
  end if;
  select * into v_old from public.members where user_id = v_uid;
  if found then
    if v_old.status <> 'rejected' then
      raise exception 'Ou deja voye yon demann manm';
    end if;
    update public.members
    set full_name = trim(p_full_name), nickname = trim(p_nickname), email = lower(trim(p_email)), phone = trim(p_phone),
        city = nullif(trim(coalesce(p_city, '')), ''), motivation = nullif(trim(coalesce(p_motivation, '')), ''),
        sex = p_sex, status = 'pending', admin_note = null, created_at = now()
    where id = v_old.id
    returning id into v_id;
  else
    insert into public.members (user_id, full_name, nickname, email, phone, city, motivation, sex)
    values (v_uid, trim(p_full_name), trim(p_nickname), lower(trim(p_email)), trim(p_phone), nullif(trim(coalesce(p_city, '')), ''),
            nullif(trim(coalesce(p_motivation, '')), ''), p_sex)
    returning id into v_id;
  end if;

  perform public.notify(p.id, 'account', 'Nouvo demann manm afilye',
    trim(p_nickname) || ' (' || trim(p_full_name) || ') vle vin manm afilye. Tcheke demann nan.', '/admin/manm')
  from public.profiles p where p.is_admin;
  return v_id;
end;
$$;

revoke execute on function public.request_membership(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.request_membership(text, text, text, text, text, text, text) to authenticated;

-- Pseudo otomatik: non jwèt la (si l genyen), sinon premye non an
create or replace function public.admin_review_member(p_member uuid, p_action text, p_note text default null)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  m      public.members;
  v_base text;
  v_code text;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  i      integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Se admin sèlman';
  end if;
  select * into m from public.members where id = p_member for update;
  if not found then
    raise exception 'Manm sa a pa egziste';
  end if;

  if p_action = 'approve' then
    v_code := m.pseudo_referral;
    if v_code is null then
      v_base := left(upper(regexp_replace(translate(coalesce(nullif(trim(m.nickname), ''), split_part(trim(m.full_name), ' ', 1)),
                  'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'), '[^A-Za-z0-9]', '', 'g')), 12);
      if char_length(v_base) < 3 then v_base := 'MANM'; end if;
      v_code := v_base || to_char(now(), 'YYYY');
      while exists (select 1 from public.members where pseudo_referral = v_code)
         or exists (select 1 from public.member_pseudo_changes where old_code = v_code) loop
        i := i + 1;
        v_code := v_base || to_char(now(), 'YYYY') || i::text;
      end loop;
    end if;
    update public.members
    set status = 'approved', pseudo_referral = v_code, approved_at = coalesce(approved_at, now()), admin_note = v_note
    where id = p_member;
    perform public.notify(m.user_id, 'account', '🎉 Ou se manm afilye UpMizik kounye a!',
      'Pseudo ou: ' || v_code || '. Pataje l ak atis yo pou yo enskri.', '/manm/dashboard');
    return v_code;
  elsif p_action = 'reject' then
    if v_note is null then
      raise exception 'Ekri rezon an pou moun nan ka korije demann li';
    end if;
    update public.members set status = 'rejected', admin_note = v_note where id = p_member;
    perform public.notify(m.user_id, 'account', 'Demann manm ou pa aksepte',
      v_note || ' Ou ka korije l epi voye l ankò.', '/manm');
    return null;
  elsif p_action = 'block' then
    update public.members set status = 'blocked', admin_note = v_note where id = p_member;
    perform public.notify(m.user_id, 'account', 'Kont manm ou bloke',
      coalesce(v_note, 'Kontakte ekip UpMizik la pou plis enfòmasyon.'), '/manm');
    return null;
  else
    raise exception 'Aksyon an pa valid';
  end if;
end;
$$;
