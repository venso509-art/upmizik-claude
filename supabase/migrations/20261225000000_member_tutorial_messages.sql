-- =====================================================================
-- MANM YO VOYE TUTO BAY ATIS YO NAN BWAT MESAJ SIT LA
--  - Nouvo kalite notifikasyon: 'tutorial' (📘 Tuto)
--  - Yon manm apwouve chwazi youn nan atis li fè enskri yo, epi tuto a
--    rive nan bwat mesaj atis la (ak notifikasyon push), ak yon lyen /tuto/<id>.
--  - Tit la soti nan lis ki anba a (pa nan men manm nan): okenn tèks lib, pa gen spam.
--  - Limit: menm tuto a 1 fwa pa jou pou yon atis; 30 tuto pa jou pou yon manm.
-- NB: lis tuto yo dwe menm jan ak src/lib/tutorials.ts
-- =====================================================================

alter type public.notification_type add value if not exists 'tutorial';

create or replace function public.member_send_tutorial(p_artist uuid, p_tutorial text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_member public.members;
  v_artist text;
  v_title  text;
  v_from   text;
begin
  select * into v_member from public.members where user_id = auth.uid() and status = 'approved';
  if v_member.id is null then
    raise exception 'Se manm apwouve yo sèlman ki ka voye tuto.';
  end if;

  select display_name into v_artist from public.profiles
  where id = p_artist and referred_by_member_id = v_member.id and role = 'artist' and archived_at is null;
  if v_artist is null then
    raise exception 'Atis sa a pa enskri ak pseudo ou.';
  end if;

  select t.title into v_title from (values
      ('mete-mizik', '🎵 Kijan pou w mete yon mizik sou UpMizik?'),
      ('poste', '📣 Kijan pou w ajoute yon pòs sou kont ou?'),
      ('pwofil', '👤 Kijan pou w chanje pwofil ou?'),
      ('cv-bel', '✨ Kijan pou w fè CV atis ou bèl?'),
      ('pataje', '🔗 Kijan pou w pataje mizik ou sou WhatsApp, TikTok ak Instagram?'),
      ('don-retre', '💝 Kijan fanatik yo sipòte w, e kijan pou w retire kòb ou?'),
      ('pro', '⭐ Kijan pou w vin atis Pro?'),
      ('stati', '📸 Kijan pou w poste yon stati (24 è)?'),
      ('live', '🔴 Kijan pou w fè yon live?'),
      ('abone', '➕ Kijan pou w jwenn plis abone?')
    ) as t(id, title)
  where t.id = p_tutorial;
  if v_title is null then
    raise exception 'Tuto sa a pa egziste.';
  end if;

  if exists (select 1 from public.notifications
             where user_id = p_artist and type = 'tutorial'::public.notification_type
               and link = '/tuto/' || p_tutorial and created_at > now() - interval '1 day') then
    raise exception 'Ou deja voye tuto sa a bay % jodi a.', v_artist;
  end if;
  if (select count(*) from public.notifications
      where created_by = auth.uid() and type = 'tutorial'::public.notification_type
        and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Ou rive nan limit 30 tuto pou jodi a. Eseye ankò demen.';
  end if;

  v_from := coalesce(nullif(trim(v_member.nickname), ''), split_part(v_member.full_name, ' ', 1));
  insert into public.notifications (user_id, type, title, body, link, created_by)
  values (p_artist, 'tutorial'::public.notification_type, left('📘 ' || v_title, 120),
          v_from || ' (manm ekip UpMizik) voye w tuto sa a pou ede w byen sèvi ak sit la. Peze « Wè detay » pou w swiv etap yo youn pa youn.',
          '/tuto/' || p_tutorial, auth.uid());
  return v_artist;
end;
$$;

revoke execute on function public.member_send_tutorial(uuid, text) from public, anon;
grant execute on function public.member_send_tutorial(uuid, text) to authenticated;
