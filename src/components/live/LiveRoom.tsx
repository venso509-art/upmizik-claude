"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track, type LocalVideoTrack, type Participant } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";
import {
  HEARTBEAT_MS,
  LIKE_FLUSH_MS,
  formatCount,
  type GiftType,
  type LiveGiftEvent,
  type LiveGuest,
  type LiveMessage,
  type LiveRow,
} from "@/lib/live";

type Me = { id: string; name: string; isArtist: boolean } | null;
type Artist = { id: string; name: string; avatarUrl: string | null; verified: boolean };
type FloatingHeart = { id: number; x: number; hue: number };
type GiftAnim = { key: string; emoji: string; name: string; sender: string; quantity: number; big: boolean };

// ===== Kare videyo yon moun sou sèn nan =====
function VideoTile({ participant, version, mirror, label, big }: { participant: Participant; version: number; mirror: boolean; label?: string; big?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cam = participant.getTrackPublication(Track.Source.Camera);
  const hasVideo = !!cam?.track && !cam.isMuted;

  useEffect(() => {
    const track = participant.getTrackPublication(Track.Source.Camera)?.track;
    const el = videoRef.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [participant, version]);

  useEffect(() => {
    if (participant.isLocal) return; // pa tande pwòp vwa w
    const track = participant.getTrackPublication(Track.Source.Microphone)?.track;
    const el = audioRef.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [participant, version]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-zinc-900 ${big ? "" : "rounded-2xl ring-2 ring-white/20"}`}>
      <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className={`h-full w-full object-cover ${mirror ? "-scale-x-100" : ""} ${hasVideo ? "" : "hidden"}`} />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-900/60 to-zinc-950 text-4xl text-white/70">🎤</div>
      )}
      <audio ref={audioRef} autoPlay />
      {label && <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">{label}</span>}
    </div>
  );
}

export function LiveRoom({
  live: initialLive,
  artist,
  me,
  gifts,
  initialMessages,
  initialGuests,
  initialBalance,
  initialCapacity,
}: {
  live: LiveRow;
  artist: Artist;
  me: Me;
  gifts: GiftType[];
  initialMessages: LiveMessage[];
  initialGuests: LiveGuest[];
  initialBalance: number;
  initialCapacity: number;
}) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const isHost = me?.id === artist.id;

  const [live, setLive] = useState(initialLive);
  const [messages, setMessages] = useState(initialMessages);
  const [guests, setGuests] = useState(initialGuests);
  const [balance, setBalance] = useState(initialBalance);
  const [capacity, setCapacity] = useState(initialCapacity);

  // LiveKit
  const roomRef = useRef<Room | null>(null);
  const [version, setVersion] = useState(0);
  const [connState, setConnState] = useState<"connecting" | "connected" | "error" | "ended">("connecting");
  const [connError, setConnError] = useState<string>();
  const [canPublish, setCanPublish] = useState(false);
  const [needAudioTap, setNeedAudioTap] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  // UI
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [giftAnims, setGiftAnims] = useState<GiftAnim[]>([]);
  const [showGifts, setShowGifts] = useState(false);
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string>();
  const pendingTaps = useRef(0);
  const heartId = useRef(0);

  const myGuest = useMemo(() => (me ? guests.find((g) => g.user_id === me.id && (g.status === "requested" || g.status === "accepted")) : undefined), [guests, me]);
  const onStage = useMemo(() => guests.filter((g) => g.status === "accepted"), [guests]);
  const requests = useMemo(() => guests.filter((g) => g.status === "requested"), [guests]);
  const giftById = useMemo(() => new Map(gifts.map((g) => [g.id, g])), [gifts]);
  const ended = live.status !== "live" || connState === "ended";

  const flash = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(undefined), 2500);
  }, []);

  // ===== Konekte nan chanm videyo a (oswa rekonekte lè yon envite monte/desann) =====
  const connect = useCallback(async () => {
    setConnState("connecting");
    setConnError(undefined);
    try {
      await roomRef.current?.disconnect();
      const res = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ liveId: live.id }) });
      const data = (await res.json()) as { token?: string; url?: string; canPublish?: boolean; error?: string };
      if (!res.ok || !data.token || !data.url) throw new Error(data.error ?? "Pa ka konekte nan live la.");

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      const bump = () => setVersion((v) => v + 1);
      room
        .on(RoomEvent.ParticipantConnected, bump)
        .on(RoomEvent.ParticipantDisconnected, bump)
        .on(RoomEvent.TrackSubscribed, bump)
        .on(RoomEvent.TrackUnsubscribed, bump)
        .on(RoomEvent.TrackMuted, bump)
        .on(RoomEvent.TrackUnmuted, bump)
        .on(RoomEvent.LocalTrackPublished, bump)
        .on(RoomEvent.LocalTrackUnpublished, bump)
        .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedAudioTap(!room.canPlaybackAudio))
        .on(RoomEvent.ConnectionStateChanged, (s) => {
          if (s === ConnectionState.Connected) setConnState("connected");
          if (s === ConnectionState.Disconnected && roomRef.current === room) setConnState("connecting");
        });

      await room.connect(data.url, data.token);
      setCanPublish(!!data.canPublish);
      if (data.canPublish) {
        await room.localParticipant.setCameraEnabled(true, { facingMode: facing });
        await room.localParticipant.setMicrophoneEnabled(true);
        setCamOn(true);
        setMicOn(true);
      }
      setNeedAudioTap(!room.canPlaybackAudio);
      setConnState("connected");
      bump();
    } catch (e) {
      setConnState("error");
      setConnError(e instanceof Error ? e.message : "Pa ka konekte nan live la.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.id]);

  useEffect(() => {
    void connect();
    if (me) void supabase.rpc("join_live", { p_live: live.id });
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envite: lè atis la aksepte m (oswa retire m), rekonekte ak bon dwa yo
  const acceptedNow = !!me && onStage.some((g) => g.user_id === me.id);
  const firstStageCheck = useRef(true);
  useEffect(() => {
    if (firstStageCheck.current) {
      firstStageCheck.current = false;
      return;
    }
    if (!isHost && me) void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedNow]);

  // ===== An dirèk: like, kado, chat, sèn nan, fen live la =====
  useEffect(() => {
    const refreshCapacity = () => void supabase.rpc("live_capacity", { p_live: live.id }).then(({ data }) => typeof data === "number" && setCapacity(data));
    const channel = supabase
      .channel(`live-${live.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${live.id}` }, (p) => {
        setLive((cur) => ({ ...cur, ...(p.new as LiveRow) }));
        if ((p.new as LiveRow).status !== "live") setConnState("ended");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_messages", filter: `live_id=eq.${live.id}` }, (p) => {
        setMessages((cur) => [...cur.slice(-49), p.new as LiveMessage]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `live_id=eq.${live.id}` }, (p) => {
        const g = p.new as LiveGiftEvent;
        const type = giftById.get(g.gift_id);
        const key = g.id;
        setGiftAnims((cur) => [...cur.slice(-3), { key, emoji: type?.emoji ?? "🎁", name: type?.name ?? "Kado", sender: g.sender_name, quantity: g.quantity, big: g.credits >= 100 }]);
        setTimeout(() => setGiftAnims((cur) => cur.filter((a) => a.key !== key)), 4200);
        refreshCapacity();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_guests", filter: `live_id=eq.${live.id}` }, (p) => {
        const row = (p.new ?? p.old) as LiveGuest;
        setGuests((cur) => [...cur.filter((g) => g.id !== row.id), row]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [live.id, supabase, giftById]);

  // Kapasite a chanje lè like yo pase 100
  const likesOver100 = live.likes >= 100;
  useEffect(() => {
    void supabase.rpc("live_capacity", { p_live: live.id }).then(({ data }) => typeof data === "number" && setCapacity(data));
  }, [likesOver100, live.id, supabase]);

  // ===== Atis la: "batman kè" chak 20 segonn =====
  useEffect(() => {
    if (!isHost || ended) return;
    const beat = () => void supabase.rpc("live_heartbeat", { p_live: live.id, p_watching: Math.max(0, (roomRef.current?.numParticipants ?? 1) - 1) });
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [isHost, ended, live.id, supabase]);

  // ===== Like: tape kantite fwa w vle; nou voye yo an pake chak segonn =====
  useEffect(() => {
    const t = setInterval(async () => {
      const taps = pendingTaps.current;
      if (!taps) return;
      pendingTaps.current = 0;
      const { data } = await supabase.rpc("like_live", { p_live: live.id, p_taps: Math.min(taps, 30) });
      if (typeof data === "number") setLive((cur) => ({ ...cur, likes: Math.max(cur.likes, data) }));
    }, LIKE_FLUSH_MS);
    return () => clearInterval(t);
  }, [live.id, supabase]);

  function tapLike() {
    if (!me) return flash("Konekte pou w like live la");
    pendingTaps.current += 1;
    setLive((cur) => ({ ...cur, likes: cur.likes + 1 }));
    const id = ++heartId.current;
    setHearts((cur) => [...cur.slice(-14), { id, x: Math.random() * 40 - 20, hue: Math.floor(Math.random() * 60) }]);
    setTimeout(() => setHearts((cur) => cur.filter((h) => h.id !== id)), 1800);
  }

  async function sendGift(gift: GiftType) {
    if (!me) return flash("Konekte pou w voye kado");
    const { data, error } = await supabase.rpc("send_gift", { p_live: live.id, p_gift: gift.id, p_quantity: qty });
    if (error) return flash(error.message.includes("ase kredi") ? "Ou pa gen ase kredi 🪙" : error.message);
    if (typeof data === "number") setBalance(data);
    setShowGifts(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (!me) return flash("Konekte pou w ekri");
    setDraft("");
    const { error } = await supabase.rpc("send_live_message", { p_live: live.id, p_body: body });
    if (error) flash(error.message);
  }

  async function requestJoin() {
    const { error } = await supabase.rpc("request_join_live", { p_live: live.id });
    flash(error ? error.message : "✋ Demann ou an voye. Tann atis la reponn.");
  }

  async function respond(guest: LiveGuest, accept: boolean) {
    const { error } = await supabase.rpc("respond_join_live", { p_guest: guest.id, p_accept: accept });
    if (error) flash(error.message);
  }

  async function leaveStage(guestId: string) {
    const { error } = await supabase.rpc("leave_live_stage", { p_guest: guestId });
    if (error) flash(error.message);
  }

  async function endLive() {
    if (!confirm("Fini live la?")) return;
    await supabase.rpc("end_live", { p_live: live.id });
    await roomRef.current?.disconnect();
    router.push("/dashboard/revni-live");
  }

  async function toggleCam() {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setCameraEnabled(!camOn, { facingMode: facing });
    setCamOn(!camOn);
  }
  async function toggleMic() {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setMicrophoneEnabled(!micOn);
    setMicOn(!micOn);
  }
  async function flipCam() {
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    const next = facing === "user" ? "environment" : "user";
    await track?.restartTrack({ facingMode: next });
    setFacing(next);
  }

  // Moun ki sou sèn nan: atis la + envite aksepte yo
  const room = roomRef.current;
  const allParticipants: Participant[] = room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [];
  const hostP = allParticipants.find((p) => p.identity === artist.id);
  const guestPs = onStage
    .map((g) => ({ g, p: allParticipants.find((p) => p.identity === g.user_id) }))
    .filter((x): x is { g: LiveGuest; p: Participant } => !!x.p);
  const watching = Math.max(0, (room?.numParticipants ?? 1) - 1);

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black text-white">
      <div className="relative h-full w-full max-w-md overflow-hidden">
        {/* ===== VIDEYO YO ===== */}
        <div className="absolute inset-0">
          {hostP ? (
            <VideoTile participant={hostP} version={version} mirror={hostP.isLocal && facing === "user"} big />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900 to-black">
              {artist.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.avatarUrl} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-red-500/70" />
              ) : (
                <span className="text-6xl">🎤</span>
              )}
              <p className="text-sm text-white/70">{connState === "error" ? connError : ended ? "Live la fini" : "Ap konekte…"}</p>
              {connState === "error" && (
                <button type="button" onClick={() => void connect()} className="btn-primary rounded-full px-4 py-2 text-sm">
                  Eseye ankò
                </button>
              )}
            </div>
          )}
        </div>

        {/* Envite yo sou sèn nan (anlè adwat) */}
        {guestPs.length > 0 && (
          <div className="absolute right-2 top-28 z-10 flex w-28 flex-col gap-2">
            {guestPs.map(({ g, p }) => (
              <div key={g.id} className="relative aspect-[3/4]">
                <VideoTile participant={p} version={version} mirror={p.isLocal && facing === "user"} label={g.guest_name} />
                {(isHost || g.user_id === me?.id) && (
                  <button
                    type="button"
                    onClick={() => void leaveStage(g.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs"
                    aria-label={isHost ? "Retire envite a" : "Desann"}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gradyan pou tèks yo li byen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 to-transparent" />

        {/* ===== TÈT: atis la, LIVE, espektatè, like ===== */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link href={`/atis/${artist.id}`} className="flex min-w-0 items-center gap-2 rounded-full bg-black/40 py-1 pl-1 pr-3 backdrop-blur">
            {artist.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-700 font-bold">{artist.name.charAt(0)}</span>
            )}
            <span className="min-w-0">
              <span className="flex items-center text-sm font-semibold">
                <span className="truncate">{artist.name}</span>
                {artist.verified && <VerifiedBadge />}
              </span>
              <span className="block text-[11px] text-white/70">❤️ {formatCount(live.likes)}</span>
            </span>
          </Link>
          <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-black ${ended ? "bg-zinc-700" : "bg-red-600"}`}>
            {!ended && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
            {ended ? "FINI" : "LIVE"}
          </span>
          <span className="rounded-md bg-black/40 px-2 py-0.5 text-xs">👁 {formatCount(watching)}</span>
          <span className="ml-auto" />
          {isHost ? (
            <button type="button" onClick={() => void endLive()} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold">
              Fini live la
            </button>
          ) : (
            <button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg" aria-label="Kite live la">
              ✕
            </button>
          )}
        </div>
        {live.title && <p className="absolute left-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 max-w-[70%] truncate rounded-full bg-black/35 px-3 py-1 text-xs">{live.title}</p>}

        {/* Son bloke pa navigatè a */}
        {needAudioTap && (
          <button
            type="button"
            onClick={() => void roomRef.current?.startAudio().then(() => setNeedAudioTap(false))}
            className="absolute left-1/2 top-1/3 z-30 -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-bold text-zinc-950 shadow-xl"
          >
            🔊 Tape pou tande live la
          </button>
        )}

        {/* ===== ANIMASYON KADO ===== */}
        <div className="pointer-events-none absolute left-3 top-1/3 z-30 space-y-2">
          {giftAnims.map((a) => (
            <div key={a.key} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600/90 to-transparent py-1 pl-1 pr-6 motion-safe:animate-gift-in">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-2xl">{a.emoji}</span>
              <span className="text-sm leading-tight">
                <span className="block font-bold">{a.sender}</span>
                <span className="text-white/80">voye {a.name}</span>
              </span>
              <span className="ml-1 text-2xl font-black italic text-citron-300">x{a.quantity}</span>
            </div>
          ))}
        </div>
        {/* Gwo kado yo (100 kredi +): gwo emoji nan mitan ekran an */}
        {giftAnims
          .filter((a) => a.big)
          .slice(-1)
          .map((a) => (
            <div key={`big-${a.key}`} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <span className="text-[9rem] drop-shadow-[0_8px_30px_rgba(255,215,0,0.6)] motion-safe:animate-gift-big">{a.emoji}</span>
            </div>
          ))}

        {/* Kè k ap monte */}
        <div className="pointer-events-none absolute bottom-40 right-6 z-30">
          {hearts.map((h) => (
            <span key={h.id} className="absolute bottom-0 text-3xl motion-safe:animate-heart-float" style={{ left: h.x, filter: `hue-rotate(${h.hue}deg)` }}>
              ❤️
            </span>
          ))}
        </div>

        {/* ===== CHAT ===== */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-3 z-20 max-h-[32vh] w-[72%] space-y-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_25%)] [scrollbar-width:none]">
          {messages.slice(-30).map((m) => (
            <p key={m.id} className="w-fit max-w-full break-words rounded-2xl bg-black/35 px-3 py-1 text-sm">
              <span className="font-semibold text-citron-300">{m.sender_name}</span> {m.body}
            </p>
          ))}
        </div>

        {/* ===== BOUTON ADWAT ===== */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-2 z-20 flex flex-col items-center gap-3">
          {!isHost && (
            <button type="button" onClick={tapLike} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-2xl active:scale-90" aria-label="Like">
              ❤️
            </button>
          )}
          {!isHost && (
            <button type="button" onClick={() => setShowGifts(true)} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-400 text-2xl active:scale-90" aria-label="Voye yon kado">
              🎁
            </button>
          )}
          {me?.isArtist && !isHost && !myGuest && (
            <button type="button" onClick={() => void requestJoin()} className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-black/40 text-[10px] font-bold leading-tight" aria-label="Mande monte">
              <span className="text-lg">✋</span>Monte
            </button>
          )}
          {myGuest?.status === "requested" && <span className="rounded-full bg-black/50 px-2 py-1 text-[10px]">⏳ Ap tann</span>}
          {isHost && canPublish && (
            <>
              <button type="button" onClick={() => void toggleMic()} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg" aria-label="Mikwo">
                {micOn ? "🎙️" : "🔇"}
              </button>
              <button type="button" onClick={() => void toggleCam()} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg" aria-label="Kamera">
                {camOn ? "📷" : "🚫"}
              </button>
              <button type="button" onClick={() => void flipCam()} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg" aria-label="Vire kamera a">
                🔄
              </button>
            </>
          )}
          <ShareLinkButton
            path={`/live/${live.id}`}
            label="↗"
            title={`${artist.name} ap fè live sou UpMizik`}
            text={`🔴 ${artist.name} ap fè live sou UpMizik kounye a! Vin gade l, like epi voye yon ti kado 🎁🇭🇹`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg"
          />
        </div>

        {/* ===== ANBA: ekri nan chat la ===== */}
        <form onSubmit={sendMessage} className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 200))}
            placeholder={me ? "Di kichòy…" : "Konekte pou w ekri"}
            disabled={ended}
            className="min-w-0 flex-1 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none backdrop-blur focus:border-citron-400"
          />
          <span className="shrink-0 rounded-full bg-black/40 px-3 py-2 text-xs font-semibold">
            👥 {onStage.length}/{capacity}
          </span>
        </form>

        {toast && <p className="absolute inset-x-6 top-1/2 z-40 rounded-2xl bg-black/80 px-4 py-3 text-center text-sm">{toast}</p>}

        {/* ===== ATIS LA: demann pou monte ===== */}
        {isHost && requests.length > 0 && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-40 space-y-2">
            {requests.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-2xl border border-white/15 bg-zinc-900/95 p-3 shadow-2xl motion-safe:animate-fade-up">
                <span className="text-2xl">✋</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-bold">{r.guest_name}</span>
                  <span className="text-xs text-white/60">vle monte nan live ou ({onStage.length}/{capacity} sou sèn)</span>
                </span>
                <button type="button" onClick={() => void respond(r, false)} className="rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold">
                  Refize
                </button>
                <button type="button" onClick={() => void respond(r, true)} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold">
                  Aksepte
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===== FEN LIVE LA ===== */}
        {ended && !isHost && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-8 text-center">
            <p className="text-5xl">🎬</p>
            <p className="text-xl font-bold">Live la fini</p>
            <p className="text-sm text-white/70">
              ❤️ {formatCount(live.likes)} like · 🎁 {formatCount(live.gifts_count)} kado
            </p>
            <Link href={`/atis/${artist.id}`} className="btn-primary rounded-full px-6 py-3">
              Wè pwofil {artist.name}
            </Link>
          </div>
        )}

        {/* ===== FENÈT KADO YO ===== */}
        {showGifts && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowGifts(false)}>
            <div className="w-full rounded-t-3xl bg-zinc-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] motion-safe:animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-bold">🎁 Voye yon kado</p>
                <Link href="/kredi" className="rounded-full bg-citron-400/15 px-3 py-1 text-sm font-semibold text-citron-300">
                  🪙 {balance.toLocaleString("fr-HT")} · Achte
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {gifts.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => void sendGift(g)}
                    disabled={g.credits * qty > balance}
                    className="flex flex-col items-center rounded-xl p-2 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <span className="text-3xl">{g.emoji}</span>
                    <span className="mt-1 text-[11px] text-white/80">{g.name}</span>
                    <span className="text-[11px] font-bold text-citron-300">🪙 {g.credits * qty}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                {[1, 5, 10, 99].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQty(n)}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold ${qty === n ? "bg-citron-400 text-zinc-950" : "bg-white/10"}`}
                  >
                    x{n}
                  </button>
                ))}
              </div>
              {balance < gifts[0]?.credits && (
                <Link href="/kredi" className="btn-primary mt-4 block rounded-xl px-4 py-3 text-center">
                  🪙 Achte kredi pou voye kado
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
