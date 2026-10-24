"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track, VideoPresets, type LocalVideoTrack, type Participant } from "livekit-client";
import { CamIcon, CamOffIcon, CloseIcon, EyeIcon, FlipIcon, GiftIcon, HandIcon, HeartIcon, MicIcon, MicOffIcon, PowerIcon, SendIcon, ShareIcon, UsersIcon } from "./LiveIcons";
import { createClient } from "@/lib/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { shareLink } from "@/lib/share";
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
// x/y: kote dwèt la touche ekran an (tap doub); side: kè ki monte bò bouton like la
type FloatingHeart = { id: number; x: number; y: number; hue: number; rot: number; side: boolean };

// Kamera a: fòma vètikal (telefòn) ak bon kalite, pou imaj la pa flou lè l plen ekran an
const CAPTURE = { resolution: { width: 720, height: 1280, frameRate: 30 } };
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

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: CAPTURE,
        // Plis débit = imaj pi klè; simulcast = moun ki gen entènèt fèb resevwa yon vèsyon pi lejè otomatikman
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h540],
          videoEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
          degradationPreference: "maintain-resolution",
        },
      });
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
        await room.localParticipant.setCameraEnabled(true, { ...CAPTURE, facingMode: facing });
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

  // Yon like: kontè a monte touswit, epi l ale nan baz done a nan pwochen pake a
  function addLike(x: number, y: number, side: boolean) {
    if (!me) return flash("Konekte pou w like live la");
    if (isHost) return;
    pendingTaps.current += 1;
    setLive((cur) => ({ ...cur, likes: cur.likes + 1 }));
    const id = ++heartId.current;
    setHearts((cur) => [...cur.slice(-18), { id, x, y, hue: Math.floor(Math.random() * 50) - 25, rot: Math.floor(Math.random() * 40) - 20, side }]);
    setTimeout(() => setHearts((cur) => cur.filter((h) => h.id !== id)), 1400);
  }
  const tapLike = () => addLike(0, 0, true);

  // Tap doub (oswa plis) NENPÒT kote sou ekran an = like, tankou TikTok
  const lastTap = useRef(0);
  const comboUntil = useRef(0);
  function stageTap(e: React.PointerEvent<HTMLDivElement>) {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    if (now < comboUntil.current || now - lastTap.current < 320) {
      addLike(e.clientX - rect.left, e.clientY - rect.top, false);
      comboUntil.current = now + 650; // pandan moun nan kontinye tape, chak tap konte
    }
    lastTap.current = now;
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
    await lp.setCameraEnabled(!camOn, { ...CAPTURE, facingMode: facing });
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
    await track?.restartTrack({ ...CAPTURE, facingMode: next });
    setFacing(next);
  }

  async function shareLive() {
    const res = await shareLink(
      `/live/${live.id}`,
      `${artist.name} ap fè live sou UpMizik`,
      `🔴 ${artist.name} ap fè live sou UpMizik kounye a! Vin gade l, like epi voye yon ti kado 🎁🇭🇹`,
    );
    if (res === "copied") flash("✓ Lyen live la kopye");
  }

  // Moun ki sou sèn nan: atis la + envite aksepte yo
  const room = roomRef.current;
  const allParticipants: Participant[] = room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [];
  const hostP = allParticipants.find((p) => p.identity === artist.id);
  const guestPs = onStage
    .map((g) => ({ g, p: allParticipants.find((p) => p.identity === g.user_id) }))
    .filter((x): x is { g: LiveGuest; p: Participant } => !!x.p);
  const watching = Math.max(0, (room?.numParticipants ?? 1) - 1);
  const glass = "bg-black/35 backdrop-blur-md ring-1 ring-white/15";

  // Bouton kolòn adwat la (ikòn + etikèt anba l, tankou TikTok)
  const RailButton = ({ onClick, label, children, accent, ariaLabel }: { onClick: () => void; label: string; children: React.ReactNode; accent?: string; ariaLabel: string }) => (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1" aria-label={ariaLabel}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full transition group-active:scale-90 ${accent ?? glass}`}>{children}</span>
      <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{label}</span>
    </button>
  );

  // Bouton kontwòl atis la (mikwo, kamera, vire)
  const HostButton = ({ onClick, label, active, children }: { onClick: () => void; label: string; active: boolean; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} className="flex w-16 flex-col items-center gap-1" aria-label={label} aria-pressed={active}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90 ${active ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-white text-zinc-900"}`}>{children}</span>
      <span className="text-[11px] font-medium text-white/85">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black text-white">
      <div className="relative h-full w-full max-w-md overflow-hidden">
        {/* ===== VIDEYO ATIS LA ===== */}
        <div className="absolute inset-0">
          {hostP ? (
            <VideoTile participant={hostP} version={version} mirror={hostP.isLocal && facing === "user"} big />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
              <span className="relative">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatarUrl} alt="" className="h-28 w-28 rounded-full object-cover" />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-fuchsia-800 text-4xl font-black">{artist.name.charAt(0)}</span>
                )}
                {!ended && connState !== "error" && <span className="absolute -inset-2 rounded-full border-2 border-red-500/70 motion-safe:animate-ping" />}
              </span>
              <p className="text-sm text-white/70">{connState === "error" ? connError : ended ? "Live la fini" : "Ap konekte nan live la…"}</p>
              {connState === "error" && (
                <button type="button" onClick={() => void connect()} className="btn-primary rounded-full px-5 py-2 text-sm">
                  Eseye ankò
                </button>
              )}
            </div>
          )}
        </div>

        {/* Zòn tap la: tape 2 fwa oswa plis nenpòt kote = like */}
        <div className="absolute inset-0 z-[5] touch-manipulation" onPointerDown={stageTap} aria-hidden />

        {/* Kè tap doub yo, kote dwèt la touche */}
        <div className="pointer-events-none absolute inset-0 z-[25]">
          {hearts
            .filter((h) => !h.side)
            .map((h) => (
              <span
                key={h.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-rose-500 motion-safe:animate-heart-pop"
                style={{ left: h.x, top: h.y, filter: `hue-rotate(${h.hue}deg) drop-shadow(0 4px 12px rgba(244,63,94,0.6))`, ["--rot" as string]: `${h.rot}deg` }}
              >
                <HeartIcon className="h-20 w-20" />
              </span>
            ))}
        </div>

        {/* Envite yo sou sèn nan (anlè adwat) */}
        {guestPs.length > 0 && (
          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+5.5rem)] z-20 flex w-28 flex-col gap-2">
            {guestPs.map(({ g, p }) => (
              <div key={g.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-xl">
                <VideoTile participant={p} version={version} mirror={p.isLocal && facing === "user"} label={g.guest_name} />
                {(isHost || g.user_id === me?.id) && (
                  <button
                    type="button"
                    onClick={() => void leaveStage(g.id)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    aria-label={isHost ? "Retire envite a" : "Desann"}
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gradyan pou tèks yo li byen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-80 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* ===== TÈT ===== */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-start gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link href={`/atis/${artist.id}`} className={`flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 ${glass}`}>
            <span className="relative shrink-0">
              {artist.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-red-500" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-700 font-bold ring-2 ring-red-500">{artist.name.charAt(0)}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center text-sm font-bold leading-tight">
                <span className="truncate">{artist.name}</span>
                {artist.verified && <VerifiedBadge />}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-white/75">
                <HeartIcon className="h-3 w-3 text-rose-400" /> {formatCount(live.likes)}
              </span>
            </span>
          </Link>
          <span className="ml-auto" />
          <span className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-black tracking-wide ${ended ? "bg-zinc-700" : "bg-red-600 shadow-lg shadow-red-600/40"}`}>
            {!ended && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            {ended ? "FINI" : "LIVE"}
          </span>
          <span className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${glass}`}>
            <EyeIcon className="h-4 w-4" /> {formatCount(watching)}
          </span>
          {!isHost && (
            <button type="button" onClick={() => router.back()} className={`flex h-8 w-8 items-center justify-center rounded-full ${glass}`} aria-label="Kite live la">
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {live.title && (
          <p className={`absolute left-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 max-w-[66%] truncate rounded-full px-3 py-1 text-xs font-medium ${glass}`}>{live.title}</p>
        )}

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
        <div className="pointer-events-none absolute left-3 top-[34%] z-30 space-y-2">
          {giftAnims.map((a) => (
            <div key={a.key} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600/95 via-fuchsia-600/60 to-transparent py-1 pl-1 pr-8 shadow-lg motion-safe:animate-gift-in">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-2xl">{a.emoji}</span>
              <span className="text-sm leading-tight">
                <span className="block font-bold">{a.sender}</span>
                <span className="text-white/85">voye {a.name}</span>
              </span>
              <span className="ml-1 text-2xl font-black italic text-citron-300 drop-shadow">x{a.quantity}</span>
            </div>
          ))}
        </div>
        {giftAnims
          .filter((a) => a.big)
          .slice(-1)
          .map((a) => (
            <div key={`big-${a.key}`} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <span className="text-[9rem] drop-shadow-[0_8px_30px_rgba(255,215,0,0.6)] motion-safe:animate-gift-big">{a.emoji}</span>
            </div>
          ))}

        {/* Kè bouton like la k ap monte */}
        <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+15rem)] right-6 z-30">
          {hearts
            .filter((h) => h.side)
            .map((h) => (
              <span key={h.id} className="absolute bottom-0 text-rose-500 motion-safe:animate-heart-float" style={{ left: (h.rot / 20) * 14, filter: `hue-rotate(${h.hue}deg)` }}>
                <HeartIcon className="h-8 w-8" />
              </span>
            ))}
        </div>

        {/* ===== CHAT ===== */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-3 z-20 max-h-[30vh] w-[70%] space-y-1.5 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_22%)] [scrollbar-width:none]">
          {messages.slice(-30).map((m) => (
            <p key={m.id} className="w-fit max-w-full break-words rounded-2xl bg-black/30 px-3 py-1.5 text-[13px] leading-snug backdrop-blur-sm">
              <span className="font-bold text-citron-300">{m.sender_name}</span> <span className="text-white/95">{m.body}</span>
            </p>
          ))}
        </div>

        {/* ===== KOLÒN ADWAT (fanatik yo) ===== */}
        {!isHost && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-3 z-20 flex flex-col items-center gap-4">
            <RailButton onClick={tapLike} label={formatCount(live.likes)} ariaLabel="Like">
              <HeartIcon className="h-7 w-7 text-rose-500" />
            </RailButton>
            <RailButton onClick={() => setShowGifts(true)} label="Kado" ariaLabel="Voye yon kado" accent="bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 shadow-lg shadow-fuchsia-500/40">
              <GiftIcon className="h-6 w-6" />
            </RailButton>
            {me?.isArtist && !myGuest && (
              <RailButton onClick={() => void requestJoin()} label="Monte" ariaLabel="Mande monte nan live la">
                <HandIcon className="h-6 w-6" />
              </RailButton>
            )}
            {myGuest?.status === "requested" && <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${glass}`}>⏳ Ap tann</span>}
            <RailButton onClick={() => void shareLive()} label="Pataje" ariaLabel="Pataje live la">
              <ShareIcon className="h-6 w-6" />
            </RailButton>
          </div>
        )}

        {/* ===== KONTWÒL ATIS LA ===== */}
        {isHost && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3 z-20 flex flex-col items-center gap-3">
            {canPublish && (
              <>
                <HostButton onClick={() => void toggleMic()} label={micOn ? "Mikwo" : "Bèbè"} active={micOn}>
                  {micOn ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />}
                </HostButton>
                <HostButton onClick={() => void toggleCam()} label={camOn ? "Kamera" : "Fèmen"} active={camOn}>
                  {camOn ? <CamIcon className="h-6 w-6" /> : <CamOffIcon className="h-6 w-6" />}
                </HostButton>
                <HostButton onClick={() => void flipCam()} label="Vire" active>
                  <FlipIcon className="h-6 w-6" />
                </HostButton>
              </>
            )}
            <button type="button" onClick={() => void endLive()} className="flex w-16 flex-col items-center gap-1" aria-label="Fini live la">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/40 transition active:scale-90">
                <PowerIcon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-semibold text-white/85">Fini</span>
            </button>
          </div>
        )}

        {/* ===== ANBA: ekri nan chat la ===== */}
        <form onSubmit={sendMessage} className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 flex items-center gap-2">
          <span className={`flex min-w-0 flex-1 items-center rounded-full pl-4 pr-1 ${glass}`}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 200))}
              placeholder={me ? "Ekri yon mesaj…" : "Konekte pou w ekri"}
              disabled={ended}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white placeholder:text-white/60 outline-none"
            />
            <button type="submit" disabled={!draft.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-citron-400 text-zinc-950 transition disabled:bg-white/10 disabled:text-white/40" aria-label="Voye">
              <SendIcon className="h-4 w-4" />
            </button>
          </span>
          <span className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${glass}`} title="Moun sou sèn nan / kapasite">
            <UsersIcon className="h-4 w-4" /> {onStage.length}/{capacity}
          </span>
        </form>

        {toast && <p className="absolute inset-x-6 top-1/2 z-40 -translate-y-1/2 rounded-2xl bg-black/85 px-4 py-3 text-center text-sm backdrop-blur">{toast}</p>}

        {/* ===== ATIS LA: demann pou monte ===== */}
        {isHost && requests.length > 0 && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+6.75rem)] z-40 space-y-2">
            {requests.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-zinc-900/95 p-3 shadow-2xl ring-1 ring-white/10 backdrop-blur motion-safe:animate-fade-up">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-600/30 text-fuchsia-200">
                  <HandIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-bold">{r.guest_name}</span>
                  <span className="text-xs text-white/60">
                    vle monte · {onStage.length}/{capacity} sou sèn
                  </span>
                </span>
                <button type="button" onClick={() => void respond(r, false)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  Refize
                </button>
                <button type="button" onClick={() => void respond(r, true)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950">
                  Aksepte
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===== FEN LIVE LA ===== */}
        {ended && !isHost && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-8 text-center backdrop-blur">
            <p className="text-5xl">🎬</p>
            <p className="text-xl font-bold">Live la fini</p>
            <p className="flex items-center gap-3 text-sm text-white/70">
              <span className="flex items-center gap-1">
                <HeartIcon className="h-4 w-4 text-rose-400" /> {formatCount(live.likes)}
              </span>
              <span className="flex items-center gap-1">
                <GiftIcon className="h-4 w-4" /> {formatCount(live.gifts_count)}
              </span>
            </p>
            <Link href={`/atis/${artist.id}`} className="btn-primary rounded-full px-6 py-3">
              Wè pwofil {artist.name}
            </Link>
          </div>
        )}

        {/* ===== FENÈT KADO YO ===== */}
        {showGifts && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowGifts(false)}>
            <div className="w-full rounded-t-3xl bg-zinc-900/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ring-1 ring-white/10 backdrop-blur-xl motion-safe:animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 font-bold">
                  <GiftIcon className="h-5 w-5 text-fuchsia-300" /> Voye yon kado
                </p>
                <Link href="/kredi" className="rounded-full bg-citron-400/15 px-3 py-1 text-sm font-semibold text-citron-300">
                  🪙 {balance.toLocaleString("fr-HT")} · Achte
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {gifts.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => void sendGift(g)}
                    disabled={g.credits * qty > balance}
                    className="flex flex-col items-center rounded-2xl p-2 transition hover:bg-white/10 active:scale-95 disabled:opacity-35"
                  >
                    <span className="text-3xl drop-shadow">{g.emoji}</span>
                    <span className="mt-1 text-[11px] text-white/80">{g.name}</span>
                    <span className="text-[11px] font-bold text-citron-300">🪙 {g.credits * qty}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                {[1, 5, 10, 99].map((n) => (
                  <button key={n} type="button" onClick={() => setQty(n)} className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${qty === n ? "bg-citron-400 text-zinc-950" : "bg-white/10 text-white"}`}>
                    x{n}
                  </button>
                ))}
              </div>
              {balance < (gifts[0]?.credits ?? 0) && (
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
