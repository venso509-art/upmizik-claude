-- =====================================================================
-- MESAJ JOUNEN AN: chak atis jwenn yon sitasyon DIFERAN menm jou a
--  - Menm sijè a pou tout moun (egz: Lendi = Motivasyon), men nan sijè sa a
--    chak atis jwenn yon sitasyon pèsonn lòt atis pa jwenn jodi a.
--  - Si gen plis atis pase sitasyon nan sijè jou a, plizyè atis ka jwenn menm sitasyon an.
--  - Lòd priyorite a:
--      1. sitasyon atis la poko janm wè
--      2. pami yo: sitasyon okenn lòt atis pa jwenn jodi a
--      3. aza fiks pou (atis, jou)
--  - Yon "verou" pou jou a: 2 atis ki louvri paj la an menm tan pa ka pran menm sitasyon an.
-- =====================================================================

create index if not exists artist_daily_cards_day_idx on public.artist_daily_cards (day, quote_id);

create or replace function public.my_daily_card()
returns table (day date, template smallint, quote_id integer, teks text, kategori text, etiket text, sous text)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_day       date := (now() at time zone 'America/Port-au-Prince')::date;
  v_card      public.artist_daily_cards;
  v_yest      public.artist_daily_cards;
  v_yest_kat  text;
  v_topic     text;
  v_quote     integer;
  v_tpl       smallint;
begin
  if v_uid is null or not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'artist') then
    return;
  end if;

  select * into v_card from public.artist_daily_cards c where c.artist_id = v_uid and c.day = v_day;
  if v_card.artist_id is null then
    -- Yon sèl atis alafwa ka chwazi sitasyon jodi a (konsa 2 atis pa pran menm nan)
    perform pg_advisory_xact_lock(hashtext('upmizik_daily_card_' || v_day::text));
    select * into v_card from public.artist_daily_cards c where c.artist_id = v_uid and c.day = v_day;
  end if;

  if v_card.artist_id is null then
    select * into v_yest from public.artist_daily_cards c where c.artist_id = v_uid and c.day = v_day - 1;
    select q.kategori into v_yest_kat from public.daily_quotes q where q.id = v_yest.quote_id;
    select t.kategori into v_topic from public.quote_day_topics t where t.weekday = extract(dow from v_day)::smallint;

    with last_seen as (
      select c.quote_id as qid, max(c.day) as d from public.artist_daily_cards c where c.artist_id = v_uid group by c.quote_id
    ), today as (
      select c.quote_id as qid, count(*) as n from public.artist_daily_cards c where c.day = v_day group by c.quote_id
    )
    select q.id into v_quote
    from public.daily_quotes q
    left join last_seen ls on ls.qid = q.id
    left join today td on td.qid = q.id
    where q.active
      and (v_topic is null or q.kategori = v_topic)
      and (v_topic is not null or v_yest_kat is null or q.kategori <> v_yest_kat)
    order by (ls.d is not null), coalesce(td.n, 0), ls.d, md5(v_uid::text || v_day::text || q.id::text)
    limit 1;

    -- Pa gen sitasyon nan sijè sa a: nenpòt sitasyon aktif (menm lòd priyorite a)
    if v_quote is null then
      with last_seen as (
        select c.quote_id as qid, max(c.day) as d from public.artist_daily_cards c where c.artist_id = v_uid group by c.quote_id
      ), today as (
        select c.quote_id as qid, count(*) as n from public.artist_daily_cards c where c.day = v_day group by c.quote_id
      )
      select q.id into v_quote
      from public.daily_quotes q
      left join last_seen ls on ls.qid = q.id
      left join today td on td.qid = q.id
      where q.active
      order by (ls.d is not null), coalesce(td.n, 0), ls.d, md5(v_uid::text || v_day::text || q.id::text)
      limit 1;
    end if;
    if v_quote is null then
      return; -- poko gen sitasyon: "Mesaj jounen an ap vini byento"
    end if;

    -- Desen: pa menm jan ak yè, epi sa l itilize mwens nan 12 dènye jou yo
    select t::smallint into v_tpl
    from generate_series(1, 6) t
    where v_yest.template is null or t <> v_yest.template
    order by (select count(*) from public.artist_daily_cards c
              where c.artist_id = v_uid and c.day > v_day - 12 and c.template = t),
             md5(v_uid::text || v_day::text || t::text)
    limit 1;

    insert into public.artist_daily_cards (artist_id, day, quote_id, template)
    values (v_uid, v_day, v_quote, v_tpl)
    on conflict on constraint artist_daily_cards_pkey do nothing;

    select * into v_card from public.artist_daily_cards c where c.artist_id = v_uid and c.day = v_day;
  end if;

  return query
  select v_card.day, v_card.template, q.id, q.teks, q.kategori, q.etiket, q.sous
  from public.daily_quotes q
  where q.id = v_card.quote_id;
end;
$$;

revoke execute on function public.my_daily_card() from public, anon;
grant execute on function public.my_daily_card() to authenticated;
