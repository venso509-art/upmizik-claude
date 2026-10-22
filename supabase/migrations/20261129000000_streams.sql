-- 🎧 STREAMS: chak fwa NENPÒT moun (konekte oswa non) koute yon chante omwen 5 segonn,
-- +1 yon sèl fwa pa sesyon navigatè. (play_count la pa chanje: li konte moun KONEKTE inik yo,
-- e se li ki sèvi pou Top 10 ak nivo atis yo.)

alter table public.songs add column streams integer not null default 0 check (streams >= 0);

-- Ki sesyon ki deja konte pou ki chante (pou menm moun nan pa konte plizyè fwa)
create table public.stream_sessions (
  session_id text not null check (char_length(session_id) between 16 and 64),
  song_id    uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, song_id)
);

alter table public.stream_sessions enable row level security;
-- Pa gen règ: se sèlman fonksyon record_stream ki ka ekri ladan l.

-- Yon ekout ka sèvi yon sèl fwa pou yon stream
alter table public.song_plays add column streamed boolean not null default false;

-- Anrejistre yon stream. p_play_id = ekout start_play te kreye a; li dwe "reyèl" (≥ 4-5 s).
create or replace function public.record_stream(p_play_id uuid, p_session text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_song uuid;
begin
  if p_session is null or char_length(p_session) not between 16 and 64 then
    return;
  end if;

  -- Ekout la dwe reyèl, resan, e li pa t janm sèvi pou yon stream
  update public.song_plays
  set streamed = true
  where id = p_play_id
    and is_real
    and not streamed
    and started_at > now() - interval '6 hours'
  returning song_id into v_song;
  if v_song is null then
    return;
  end if;

  -- Premye fwa sesyon sa a koute chante sa a? +1
  insert into public.stream_sessions (session_id, song_id) values (p_session, v_song)
  on conflict do nothing;
  if found then
    update public.songs set streams = streams + 1 where id = v_song;
  end if;
end;
$$;

revoke execute on function public.record_stream(uuid, text) from public;
grant execute on function public.record_stream(uuid, text) to anon, authenticated;

-- Pwoteksyon: menm atis la pa ka chanje chif ekout/streams/pataj chante li jan l vle (sèlman +1, oswa admin)
create or replace function public.songs_share_guard()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.share_count := 0;
    new.streams := 0;
    new.play_count := 0;
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.share_count <> old.share_count and new.share_count <> old.share_count + 1 then
    raise exception 'Ou pa ka chanje kontè pataj la';
  end if;
  if new.streams <> old.streams and new.streams <> old.streams + 1 then
    raise exception 'Ou pa ka chanje kontè streams yo';
  end if;
  if new.play_count <> old.play_count and new.play_count <> old.play_count + 1 then
    raise exception 'Ou pa ka chanje kontè ekout yo';
  end if;
  return new;
end;
$$;

-- Netwaye sesyon ki gen plis pase 2 jou (pa obligatwa; ka rele l de tanzantan)
create or replace function public.cleanup_stream_sessions()
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.stream_sessions where created_at < now() - interval '2 days';
$$;

revoke execute on function public.cleanup_stream_sessions() from public, anon, authenticated;
