"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track, VideoPresets, type LocalVideoTrack, type Participant } from "livekit-client";
import { CamIcon, CamOffIcon, CloseIcon, EyeIcon, FlipIcon, GiftIcon, HandIcon, HeartIcon, MicIcon, MicOffIcon, MoreIcon, PowerIcon, SendIcon, ShareIcon, UserPlusIcon, UsersIcon } from "./LiveIcons";
import { createClient } from "@/lib/supabase/client";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { shareLink } from "@/lib/share";
import { openPortraitCamera, type PortraitCamera } from "@/lib/portraitCamera";
import { CameraHelp } from "./CameraHelp";
import { LiveDiagnostics } from "./LiveDiagnostics";
import { FX, playFx, playGiftSound, preloadFx, unlockFx, type FxId } from "@/lib/liveFx";
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

// Kamera a: Full HD (1920×1080 nan sans sansè a = 1080×1920 lè telefòn nan kanpe) a 30 imaj pa segonn.
// (4K pa itilize: li twò lou pou entènèt fanatik yo ak pou batri telefòn atis la)
const CAPTURE = { resolution: { width: 1920, height: 1080, frameRate: 30 } };
type GiftAnim = { key: string; emoji: string; name: string; sender: string; quantity: number; big: boolean };
// Gwo kado (250+ goud): animasyon plen ekran; lyon an antre epi l gwonde
type PremiumAnim = { key: string; giftId: string; emoji: string; name: string; sender: string; quantity: number };
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.28,
  color: ["#facc15", "#f43f5e", "#22c55e", "#38bdf8", "#e879f9"][i % 5],
  size: 6 + (i % 3) * 3,
}));

// ===== Kare videyo yon moun sou sèn nan =====
function VideoTile({
  participant,
  version,
  mirror,
  label,
  big,
  avatarUrl,
}: {
  participant: Participant;
  version: number;
  mirror: boolean;
  label?: string;
  big?: boolean;
  avatarUrl?: string | null;
}) {
  const micOff = !participant.isMicrophoneEnabled;
  const selfView = !!big && participant.isLocal;
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgRef = useRef<HTMLVideoElement>(null); // kopi flou dèyè a (gwo ekran sèlman)
  const audioRef = useRef<HTMLAudioElement>(null);
  const cam = participant.getTrackPublication(Track.Source.Camera);
  const hasVideo = !!cam?.track && !cam.isMuted;

  useEffect(() => {
    const track = participant.getTrackPublication(Track.Source.Camera)?.track;
    const el = videoRef.current;
    if (!track || !el) return;
    track.attach(el);
    const bg = bgRef.current;
    if (bg) track.attach(bg);
    return () => {
      track.detach(el);
      if (bg) track.detach(bg);
    };
  }, [participant, version, hasVideo]);

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
      {/* Atis la wè PWÒP imaj li an antye (san zoom), ak yon kopi flou dèyè l; fanatik yo wè l plen ekran */}
      {selfView && hasVideo && (
        <video ref={bgRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl`} />
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`relative h-full w-full ${selfView ? "object-contain" : "object-cover"} ${mirror ? "-scale-x-100" : ""} ${hasVideo ? "" : "hidden"}`}
      />
      {/* Kamera fèmen: foto pwofil moun nan */}
      {!hasVideo && (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-900/60 to-zinc-950">
          {avatarUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className={`relative rounded-full object-cover ring-2 ring-white/40 ${big ? "h-28 w-28" : "h-14 w-14"}`} />
            </>
          ) : (
            <span className={`relative flex items-center justify-center rounded-full bg-fuchsia-700 font-black text-white ${big ? "h-28 w-28 text-4xl" : "h-14 w-14 text-xl"}`}>
              {(label ?? participant.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
      <audio ref={audioRef} autoPlay />
      {label && (
        <span className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-white backdrop-blur-sm">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-700 text-[10px]">{label.charAt(0).toUpperCase()}</span>
          )}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {micOff && <MicOffIcon className="h-3.5 w-3.5 shrink-0 text-red-400" />}
        </span>
      )}
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
  const camRef = useRef<PortraitCamera | null>(null); // kamera potrè (9:16) atis la / envite a

  // Louvri kamera a an POTRÈ epi voye l nan live la
  const publishCamera = useCallback(async (room: Room, facingMode: "user" | "environment") => {
    camRef.current?.stop();
    const cam = await openPortraitCamera(facingMode);
    camRef.current = cam;
    await room.localParticipant.publishTrack(cam.track, { source: Track.Source.Camera });
  }, []);
  const [version, setVersion] = useState(0);
  const [connState, setConnState] = useState<"connecting" | "connected" | "error" | "ended">("connecting");
  const [connError, setConnError] = useState<string>();
  const [canPublish, setCanPublish] = useState(false);
  const [camErr, setCamErr] = useState<unknown>(null); // kamera/mikwo pa louvri (otorizasyon)
  const [showDiag, setShowDiag] = useState(false); // 🔧 Tcheke
  const [needAudioTap, setNeedAudioTap] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");

  // UI
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [giftAnims, setGiftAnims] = useState<GiftAnim[]>([]);
  const [premium, setPremium] = useState<PremiumAnim | null>(null);
  const [fxPop, setFxPop] = useState<{ key: number; emoji: string; label: string } | null>(null);
  const [micAsk, setMicAsk] = useState(false); // atis la mande envite a ouvri mikwo li
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const lastFx = useRef(0);
  // Fèt 🥳 chak fwa yon moun rive 100, 200, 300... like
  const [parties, setParties] = useState<{ key: number; name: string; count: number; mine: boolean }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myTaps = useRef(0); // like MWEN nan live sa a
  const serverLikes = useRef(initialLive.likes); // dènye kantite baz done a voye
  const ownSent = useRef(0); // like mwen voye ki poko parèt nan kantite baz done a
  const [showGifts, setShowGifts] = useState(false);
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string>();
  const pendingTaps = useRef(0);
  const heartId = useRef(0);

  const myGuest = useMemo(
    () => (me ? guests.find((g) => g.user_id === me.id && (g.status === "requested" || g.status === "invited" || g.status === "accepted")) : undefined),
    [guests, me],
  );
  const invited = useMemo(() => guests.filter((g) => g.status === "invited"), [guests]);
  // Meni ⋮ atis la: pataje, envite atis, demann yo, sèn nan
  const [showMenu, setShowMenu] = useState(false);
  type Candidate = { id: string; name: string; avatarUrl: string | null; isLive: boolean; liveId?: string };
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
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
      camRef.current?.stop();
      camRef.current = null;
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
          videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h720],
          videoEncoding: { maxBitrate: 5_000_000, maxFramerate: 30 },
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
      if (data.canPublish) await startMedia(room);
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
    let session = "";
    try {
      session = sessionStorage.getItem("upmizik-live-session") ?? crypto.randomUUID();
      sessionStorage.setItem("upmizik-live-session", session);
    } catch {
      session = crypto.randomUUID();
    }
    void supabase.rpc("record_live_view", { p_live: live.id, p_session: session });
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
      camRef.current?.stop();
      camRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Louvri kamera + mikwo; si telefòn nan refize, nou montre etap pou bay otorizasyon an
  async function startMedia(room: Room) {
    const lp = room.localParticipant;
    let failed: unknown = null;
    try {
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (!pub) await publishCamera(room, facing);
      else if (pub.isMuted) await pub.unmute();
      setCamOn(true);
    } catch (e) {
      failed = e;
      setCamOn(false);
    }
    try {
      await lp.setMicrophoneEnabled(true);
    } catch (e) {
      failed ??= e;
    }
    setMicOn(lp.isMicrophoneEnabled);
    setCamErr(failed);
    setVersion((v) => v + 1);
  }

  // Chaje son yo davans: atis la (tout FX yo), tout moun (son gwo kado yo)
  useEffect(() => {
    preloadFx("gifts");
    if (isHost) preloadFx("host");
  }, [isHost]);

  // Envite: lè atis la aksepte m (oswa retire m), rekonekte ak bon dwa yo
  const acceptedNow = !!me && onStage.some((g) => g.user_id === me.id);
  const stageRetries = useRef(0);
  useEffect(() => {
    stageRetries.current = 0;
  }, [acceptedNow]);
  useEffect(() => {
    if (isHost || !me || connState !== "connected" || acceptedNow === canPublish) return;
    if (stageRetries.current >= 3) return;
    stageRetries.current += 1;
    const t = setTimeout(() => void connect(), stageRetries.current === 1 ? 0 : 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedNow, canPublish, connState]);

  // Pandan m ap tann (demann / envitasyon), tcheke sèn nan chak 4 segonn an plis Realtime (si yon chanjman pa rive)
  const waitingStage = !isHost && !!myGuest && (myGuest.status !== "accepted" || !canPublish);
  useEffect(() => {
    if (!waitingStage) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("live_guests").select("*").eq("live_id", live.id);
      if (data) setGuests(data as LiveGuest[]);
    }, 4000);
    return () => clearInterval(t);
  }, [waitingStage, live.id, supabase]);

  const myId = me?.id;
  // ===== An dirèk: like, kado, chat, sèn nan, fen live la =====
  useEffect(() => {
    const refreshCapacity = () => void supabase.rpc("live_capacity", { p_live: live.id }).then(({ data }) => typeof data === "number" && setCapacity(data));
    const channel = supabase
      .channel(`live-${live.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${live.id}` }, (p) => {
        const row = p.new as LiveRow;
        // Like lòt moun yo: kè yo monte sou ekran tout moun (atis la tou)
        const delta = Math.max(0, Number(row.likes) - serverLikes.current);
        serverLikes.current = Math.max(serverLikes.current, Number(row.likes));
        const mine = Math.min(ownSent.current, delta);
        ownSent.current -= mine;
        spawnRemoteHearts(delta - mine);
        setLive((cur) => ({ ...cur, ...row, likes: Math.max(cur.likes, Number(row.likes)) }));
        if (row.status !== "live") setConnState("ended");
      })
      .on("broadcast", { event: "fx" }, ({ payload }) => {
        const fx = FX.find((f) => f.id === (payload as { id?: string })?.id);
        if (fx) showFx(fx.id, false);
      })
      .on("broadcast", { event: "mic" }, ({ payload }) => {
        const m = payload as { user?: string; action?: string };
        if (!myId || m?.user !== myId) return;
        if (m.action === "mute") {
          void roomRef.current?.localParticipant.setMicrophoneEnabled(false).then(() => setMicOn(false));
          flash("🔇 Atis la fèmen mikwo w");
        } else if (m.action === "ask") setMicAsk(true);
      })
      .on("broadcast", { event: "milestone" }, ({ payload }) => {
        const m = payload as { name?: string; count?: number };
        if (m?.name && m.count) celebrate(String(m.name).slice(0, 40), Number(m.count), false);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_messages", filter: `live_id=eq.${live.id}` }, (p) => {
        setMessages((cur) => [...cur.slice(-49), p.new as LiveMessage]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_gifts", filter: `live_id=eq.${live.id}` }, (p) => {
        const g = p.new as LiveGiftEvent;
        const type = giftById.get(g.gift_id);
        const key = g.id;
        const isPremium = g.credits >= 250 || g.gift_id === "lyon";
        setGiftAnims((cur) => [...cur.slice(-3), { key, emoji: type?.emoji ?? "🎁", name: type?.name ?? "Kado", sender: g.sender_name, quantity: g.quantity, big: g.credits >= 100 && !isPremium }]);
        setTimeout(() => setGiftAnims((cur) => cur.filter((a) => a.key !== key)), 4200);
        if (isPremium) {
          setPremium({ key, giftId: g.gift_id, emoji: type?.emoji ?? "🎁", name: type?.name ?? "Kado", sender: g.sender_name, quantity: g.quantity });
          playGiftSound(g.gift_id);
          setTimeout(() => setPremium((cur) => (cur?.key === key ? null : cur)), 5000);
        }
        refreshCapacity();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_guests", filter: `live_id=eq.${live.id}` }, (p) => {
        const row = (p.new ?? p.old) as LiveGuest;
        setGuests((cur) => [...cur.filter((g) => g.id !== row.id), row]);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [live.id, supabase, giftById, flash, myId]);

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
      const taps = Math.min(pendingTaps.current, 30);
      if (!taps) return;
      pendingTaps.current -= taps; // rès la ale nan pwochen pake a
      ownSent.current += taps;
      const { data } = await supabase.rpc("like_live", { p_live: live.id, p_taps: taps });
      if (typeof data === "number") setLive((cur) => ({ ...cur, likes: Math.max(cur.likes, data) }));
    }, LIKE_FLUSH_MS);
    return () => clearInterval(t);
  }, [live.id, supabase]);

  // Kè ki soti nan like lòt moun yo (maks 12 alafwa, youn apre lòt)
  function spawnRemoteHearts(n: number) {
    for (let i = 0; i < Math.min(n, 12); i++) {
      setTimeout(() => {
        const id = ++heartId.current;
        setHearts((cur) => [...cur.slice(-24), { id, x: 0, y: 0, hue: Math.floor(Math.random() * 60) - 30, rot: Math.floor(Math.random() * 40) - 20, side: true }]);
        setTimeout(() => setHearts((cur) => cur.filter((h) => h.id !== id)), 1800);
      }, i * 110);
    }
  }

  // FX: son an jwe sou aparèy chak moun, ak yon ti etikèt sou ekran an
  function showFx(id: FxId, mine: boolean) {
    const now = Date.now();
    if (!mine && now - lastFx.current < 300) return;
    lastFx.current = now;
    const fx = FX.find((f) => f.id === id);
    if (!fx) return;
    playFx(id);
    const key = now + Math.random();
    setFxPop({ key, emoji: fx.emoji, label: fx.label });
    setTimeout(() => setFxPop((cur) => (cur?.key === key ? null : cur)), 1600);
  }
  const fxCooldown = useRef(0);
  function sendFx(id: FxId) {
    const now = Date.now();
    if (now - fxCooldown.current < 350) return;
    fxCooldown.current = now;
    showFx(id, true);
    void channelRef.current?.send({ type: "broadcast", event: "fx", payload: { id } });
  }
  // Atis la: fèmen mikwo yon envite, oswa mande l ouvri l
  function guestMic(userId: string, action: "mute" | "ask") {
    void channelRef.current?.send({ type: "broadcast", event: "mic", payload: { user: userId, action } });
    flash(action === "mute" ? "🔇 Mikwo envite a fèmen" : "🎤 Ou mande envite a ouvri mikwo li");
  }
  async function openMyMic() {
    setMicAsk(false);
    const room = roomRef.current;
    if (room) await startMedia(room);
  }

  // Fèt 🥳: "X bay 100 like!" sou ekran tout moun
  function celebrate(name: string, count: number, mine: boolean) {
    const key = Date.now() + Math.random();
    setParties((cur) => [...cur.slice(-1), { key, name, count, mine }]);
    setTimeout(() => setParties((cur) => cur.filter((p) => p.key !== key)), 3200);
  }

  // Yon like: kontè a monte touswit, epi l ale nan baz done a nan pwochen pake a
  function addLike(x: number, y: number, side: boolean) {
    if (!me) return flash("Konekte pou w like live la");
    if (isHost) return;
    pendingTaps.current += 1;
    myTaps.current += 1;
    // Chak 100 like moun nan bay: ti fèt pou li, e tout moun (atis la tou) wè l
    if (myTaps.current % 100 === 0) {
      celebrate(me.name, myTaps.current, true);
      void channelRef.current?.send({ type: "broadcast", event: "milestone", payload: { name: me.name, count: myTaps.current } });
    }
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
    unlockFx();
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
    router.push(`/dashboard/revni-live?live=${live.id}`);
  }

  // Kamera: nou mete l an poz (mute) olye fèmen l, pou l rete an potrè lè l tounen
  async function toggleCam() {
    const pub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!pub) return;
    if (camOn) await pub.mute();
    else await pub.unmute();
    setCamOn(!camOn);
  }
  async function toggleMic() {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    try {
      await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled);
    } catch (e) {
      setCamErr(e); // otorizasyon bloke: montre etap yo
    }
    setMicOn(lp.isMicrophoneEnabled);
    setVersion((v) => v + 1);
  }
  // Vire kamera a (devan/dèyè), toujou an potrè
  async function flipCam() {
    const track = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined;
    if (!track) return;
    const next = facing === "user" ? "environment" : "user";
    const old = camRef.current;
    const cam = await openPortraitCamera(next);
    await track.replaceTrack(cam.track, true);
    camRef.current = cam;
    old?.stop();
    setFacing(next);
  }

  // Atis yo ka envite: sa ki an live kounye a sou sit la + atis k ap gade live sa a
  async function openMenu() {
    setShowMenu(true);
    setCandidates(null);
    const { data: lives } = await supabase.rpc("live_now");
    const liveRows = ((lives ?? []) as { live_id: string; artist_id: string }[]).filter((l) => l.artist_id !== artist.id);
    const viewerIds = Array.from(roomRef.current?.remoteParticipants.values() ?? [])
      .map((p) => p.identity)
      .filter((id) => /^[0-9a-f-]{36}$/i.test(id) && id !== artist.id);
    const ids = Array.from(new Set([...liveRows.map((l) => l.artist_id), ...viewerIds]));
    if (!ids.length) return setCandidates([]);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids)
      .eq("role", "artist")
      .eq("status", "approved");
    const liveBy = new Map(liveRows.map((l) => [l.artist_id, l.live_id]));
    setCandidates(
      ((profs ?? []) as { id: string; display_name: string; avatar_url: string | null }[])
        .map((p) => ({ id: p.id, name: p.display_name, avatarUrl: p.avatar_url, isLive: liveBy.has(p.id), liveId: liveBy.get(p.id) }))
        .sort((a, b) => Number(b.isLive) - Number(a.isLive)),
    );
  }

  async function invite(artistId: string) {
    const { error } = await supabase.rpc("invite_to_live", { p_live: live.id, p_artist: artistId });
    if (error) flash(error.message.includes("invite_to_live") ? "Baz done a poko ajou (migration envitasyon an)." : error.message);
    else flash("✉️ Envitasyon an voye!");
  }

  async function respondInvite(guestId: string, accept: boolean) {
    const { error } = await supabase.rpc("respond_live_invite", { p_guest: guestId, p_accept: accept });
    if (error) return flash(error.message);
    // Pa tann Realtime: mete sèn nan ajou touswit (sa lanse rekoneksyon ak dwa pou pale)
    const { data } = await supabase.from("live_guests").select("*").eq("live_id", live.id);
    if (data) setGuests(data as LiveGuest[]);
  }

  async function shareLive() {
    const res = await shareLink(
      `/live/${live.id}`,
      `${artist.name} ap fè live sou UpMizik`,
      `🔴 ${artist.name} ap fè live sou UpMizik kounye a! Vin gade l, like epi voye yon ti kado 🎁🇭🇹`,
    );
    if (res === "copied") flash("✓ Lyen live la kopye");
  }

  // Foto pwofil envite yo (pou kare yo anlè a)
  const stageIds = onStage.map((g) => g.user_id).sort().join(",");
  useEffect(() => {
    const ids = stageIds ? stageIds.split(",").filter((id) => !(id in avatars)) : [];
    if (!ids.length) return;
    void supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", ids)
      .then(({ data }) => {
        const next: Record<string, string | null> = {};
        for (const id of ids) next[id] = null;
        for (const r of (data ?? []) as { id: string; avatar_url: string | null }[]) next[r.id] = r.avatar_url;
        setAvatars((cur) => ({ ...cur, ...next }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIds, supabase]);

  // Moun ki sou sèn nan: atis la + envite aksepte yo
  const room = roomRef.current;
  const allParticipants: Participant[] = room ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())] : [];
  const hostP = allParticipants.find((p) => p.identity === artist.id);
  const guestPs = onStage
    .map((g) => ({ g, p: allParticipants.find((p) => p.identity === g.user_id) }))
    .filter((x): x is { g: LiveGuest; p: Participant } => !!x.p);
  const watching = Math.max(0, (room?.numParticipants ?? 1) - 1);
  const iAmGuest = canPublish && !isHost; // envite ki sou sèn nan
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
                <VideoTile participant={p} version={version} mirror={p.isLocal && facing === "user"} label={g.guest_name} avatarUrl={avatars[g.user_id]} />
                {/* Atis la: fèmen mikwo envite a, oswa mande l ouvri l */}
                {isHost && (
                  <button
                    type="button"
                    onClick={() => guestMic(g.user_id, p.isMicrophoneEnabled ? "mute" : "ask")}
                    className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ${p.isMicrophoneEnabled ? "bg-black/60" : "bg-red-600"}`}
                    aria-label={p.isMicrophoneEnabled ? "Fèmen mikwo envite a" : "Mande envite a ouvri mikwo li"}
                  >
                    {p.isMicrophoneEnabled ? <MicIcon className="h-3.5 w-3.5" /> : <MicOffIcon className="h-3.5 w-3.5" />}
                  </button>
                )}
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
          {(isHost || !!myGuest) && (
            <button
              type="button"
              onClick={() => setShowDiag(true)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm ${glass}`}
              aria-label="Tcheke mikwo ak kamera"
            >
              🔧
              {canPublish && (!micOn || !!camErr) && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />}
            </button>
          )}
          {isHost ? (
            <button type="button" onClick={() => void openMenu()} className={`relative flex h-8 w-8 items-center justify-center rounded-full ${glass}`} aria-label="Plis opsyon">
              <MoreIcon className="h-5 w-5" />
              {requests.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold">{requests.length}</span>}
            </button>
          ) : (
            <button type="button" onClick={() => router.back()} className={`flex h-8 w-8 items-center justify-center rounded-full ${glass}`} aria-label="Kite live la">
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {live.title && (
          <p className={`absolute left-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 max-w-[66%] truncate rounded-full px-3 py-1 text-xs font-medium ${glass}`}>{live.title}</p>
        )}

        {/* Lis datant: konbyen atis k ap tann pou monte (klike = wè yo tout) */}
        {isHost && requests.length > 0 && (
          <button
            type="button"
            onClick={() => void openMenu()}
            className="absolute left-3 top-[calc(env(safe-area-inset-top)+6.25rem)] z-30 flex items-center gap-2 rounded-full bg-fuchsia-600/90 py-1.5 pl-1.5 pr-3 text-xs font-bold shadow-lg shadow-fuchsia-600/30 backdrop-blur motion-safe:animate-fade-up"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <HandIcon className="h-3.5 w-3.5" />
            </span>
            {requests.length} ap tann pou monte
          </button>
        )}

        {/* Son bloke pa navigatè a */}
        {needAudioTap && (
          <button
            type="button"
            onClick={() => {
              unlockFx();
              void roomRef.current?.startAudio().then(() => setNeedAudioTap(false));
            }}
            className="absolute left-1/2 top-1/3 z-30 -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-bold text-zinc-950 shadow-xl"
          >
            🔊 Tape pou tande live la
          </button>
        )}

        {/* ===== FÈT 100 LIKE 🥳 ===== */}
        {parties.slice(-1).map((p) => (
          <div key={p.key} className="pointer-events-none absolute inset-x-0 top-[26%] z-40 flex flex-col items-center">
            <span className="relative">
              <span className="block text-[6.5rem] leading-none drop-shadow-[0_10px_30px_rgba(255,215,0,0.55)] motion-safe:animate-gift-big">🥳</span>
              <span className="absolute -left-10 top-2 text-4xl motion-safe:animate-heart-float">🎉</span>
              <span className="absolute -right-10 top-4 text-4xl motion-safe:animate-heart-float [animation-delay:150ms]">🎊</span>
              <span className="absolute -top-6 left-1/2 text-3xl motion-safe:animate-heart-float [animation-delay:300ms]">✨</span>
            </span>
            <span className="mt-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 px-5 py-2 text-center text-sm font-black shadow-2xl motion-safe:animate-fade-up">
              {p.mine ? `Ou bay ${p.count} like! Mèsi 💖` : `${p.name} bay ${p.count} like! 💖`}
            </span>
          </div>
        ))}

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

        {/* ===== GWO KADO (250+ goud): plen ekran; lyon an antre epi l gwonde ===== */}
        {premium && (
          <div key={premium.key} className={`pointer-events-none absolute inset-0 z-[45] overflow-hidden motion-safe:animate-premium-in ${premium.giftId === "lyon" ? "bg-black/55" : "bg-black/35"}`}>
            <div
              className="absolute left-1/2 top-[40%] h-[150vw] max-h-[850px] w-[150vw] max-w-[850px] rounded-full opacity-70 motion-safe:animate-rays-spin"
              style={{
                background: "repeating-conic-gradient(from 0deg, rgba(255,200,0,0.38) 0deg 9deg, transparent 9deg 24deg)",
                WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 62%)",
                maskImage: "radial-gradient(circle, black 15%, transparent 62%)",
              }}
            />
            {premium.giftId === "lyon" &&
              [1.1, 1.35, 1.6].map((d) => (
                <span
                  key={d}
                  className="absolute left-1/2 top-[40%] h-64 w-64 rounded-full border-4 border-amber-400/80 opacity-0 motion-safe:animate-roar-ring"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            <div className={`absolute inset-x-0 top-[22%] flex justify-center ${premium.giftId === "lyon" ? "motion-safe:animate-screen-shake [animation-delay:1.1s]" : ""}`}>
              <span
                className={`block text-[10rem] leading-none drop-shadow-[0_0_45px_rgba(255,190,0,0.85)] ${premium.giftId === "lyon" ? "motion-safe:animate-lion-enter" : "motion-safe:animate-premium-gift"}`}
              >
                {premium.emoji}
              </span>
            </div>
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="absolute top-0 rounded-sm opacity-0 motion-safe:animate-confetti-fall"
                style={{ left: `${c.left}%`, width: c.size, height: c.size * 1.6, background: c.color, animationDelay: `${0.6 + c.delay}s` }}
              />
            ))}
            <div className="absolute inset-x-4 top-[60%] flex justify-center">
              <span className="rounded-3xl bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600 px-6 py-3 text-center shadow-2xl shadow-amber-500/30 motion-safe:animate-fade-up [animation-delay:0.6s]">
                <span className="block text-lg font-black">{premium.sender}</span>
                <span className="text-sm font-bold text-white/95">
                  {premium.giftId === "lyon" ? "🦁 voye yon LYON! Rrrraaah!" : `voye ${premium.name}${premium.quantity > 1 ? ` x${premium.quantity}` : ""}!`}
                </span>
              </span>
            </div>
          </div>
        )}

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
        <div
          className={`absolute left-3 z-20 max-h-[30vh] w-[70%] space-y-1.5 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_22%)] [scrollbar-width:none] ${
            isHost ? "bottom-[calc(env(safe-area-inset-bottom)+9rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]"
          }`}
        >
          {messages.slice(-30).map((m) => (
            <p key={m.id} className="w-fit max-w-full break-words rounded-2xl bg-black/30 px-3 py-1.5 text-[13px] leading-snug backdrop-blur-sm">
              <span className="font-bold text-citron-300">{m.sender_name}</span> <span className="text-white/95">{m.body}</span>
            </p>
          ))}
        </div>

        {/* ===== KOLÒN ADWAT (fanatik yo) ===== */}
        {!isHost && !iAmGuest && (
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

        {/* ===== KONTWÒL ENVITE A (sou sèn nan): mikwo, kamera, vire, desann ===== */}
        {iAmGuest && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3 z-20 flex flex-col items-center gap-3">
            <HostButton onClick={() => void toggleMic()} label={micOn ? "Mikwo" : "Bèbè"} active={micOn}>
              {micOn ? <MicIcon className="h-6 w-6" /> : <MicOffIcon className="h-6 w-6" />}
            </HostButton>
            <HostButton onClick={() => void toggleCam()} label={camOn ? "Kamera" : "Fèmen"} active={camOn}>
              {camOn ? <CamIcon className="h-6 w-6" /> : <CamOffIcon className="h-6 w-6" />}
            </HostButton>
            <HostButton onClick={() => void flipCam()} label="Vire" active>
              <FlipIcon className="h-6 w-6" />
            </HostButton>
            <RailButton onClick={() => setShowGifts(true)} label="Kado" ariaLabel="Voye yon kado" accent="bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 shadow-lg shadow-fuchsia-500/40">
              <GiftIcon className="h-6 w-6" />
            </RailButton>
            {myGuest && (
              <button type="button" onClick={() => void leaveStage(myGuest.id)} className="flex w-16 flex-col items-center gap-1" aria-label="Desann sèn nan">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/40 transition active:scale-90">
                  <CloseIcon className="h-6 w-6" />
                </span>
                <span className="text-[11px] font-semibold text-white/85">Desann</span>
              </button>
            )}
          </div>
        )}

        {/* ===== ATIS LA MANDE M OUVRI MIKWO M ===== */}
        {iAmGuest && micAsk && !micOn && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+6.75rem)] z-40 flex items-center gap-3 rounded-2xl bg-zinc-900/95 p-3 shadow-2xl ring-1 ring-emerald-500/40 backdrop-blur motion-safe:animate-fade-up">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <MicIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-bold">{artist.name} mande w ouvri mikwo w</span>
            <button type="button" onClick={() => setMicAsk(false)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              Pita
            </button>
            <button type="button" onClick={() => void openMyMic()} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950">
              Ouvri
            </button>
          </div>
        )}

        {/* ===== EFÈ SON (FX) ATIS LA: peze pou tout moun tande ===== */}
        {isHost && !ended && (
          <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-20 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {FX.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => sendFx(f.id)}
                className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl transition active:scale-90 active:bg-white/25 ${glass}`}
                aria-label={`Efè son: ${f.label}`}
              >
                <span className="text-xl leading-none">{f.emoji}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-white/85">{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Etikèt FX la (tout moun wè l) */}
        {fxPop && (
          <div key={fxPop.key} className="pointer-events-none absolute inset-x-0 top-[22%] z-30 flex justify-center">
            <span className="flex items-center gap-2 rounded-full bg-black/55 px-5 py-2 text-lg font-black shadow-xl backdrop-blur motion-safe:animate-gift-big">
              <span className="text-3xl">{fxPop.emoji}</span> {fxPop.label}!
            </span>
          </div>
        )}

        {/* ===== KONTWÒL ATIS LA ===== */}
        {isHost && (
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+9rem)] right-3 z-20 flex flex-col items-center gap-3">
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

        {/* Ou aksepte sou sèn nan men koneksyon an poko gen dwa pale: bouton pou monte kounye a */}
        {!isHost && acceptedNow && !canPublish && connState === "connected" && (
          <button
            type="button"
            onClick={() => void connect()}
            className="absolute inset-x-6 top-[calc(env(safe-area-inset-top)+6.75rem)] z-40 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 shadow-2xl"
          >
            🎤 Ou aksepte! Peze la a pou monte sou sèn nan
          </button>
        )}

        {/* 🔧 Tcheke: otorizasyon, koneksyon, mikwo */}
        {showDiag && (
          <LiveDiagnostics
            room={roomRef.current}
            version={version}
            connState={connState}
            canPublish={canPublish}
            isHost={isHost}
            guestStatus={myGuest?.status}
            onClose={() => setShowDiag(false)}
            onReconnect={() => void connect()}
            onStartMedia={async () => {
              if (roomRef.current) await startMedia(roomRef.current);
            }}
          />
        )}

        {/* Kamera/mikwo bloke: etap pou bay app la otorizasyon */}
        {canPublish && !!camErr && !ended && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] z-50 max-h-[70vh] overflow-y-auto">
            <CameraHelp compact error={camErr} onClose={() => setCamErr(null)} onRetry={() => roomRef.current && void startMedia(roomRef.current)} />
          </div>
        )}

        {toast && <p className="absolute inset-x-6 top-1/2 z-40 -translate-y-1/2 rounded-2xl bg-black/85 px-4 py-3 text-center text-sm backdrop-blur">{toast}</p>}

        {/* ===== MWEN ENVITE: aksepte oswa refize ===== */}
        {myGuest?.status === "invited" && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+6.75rem)] z-40 flex items-center gap-3 rounded-2xl bg-zinc-900/95 p-3 shadow-2xl ring-1 ring-fuchsia-500/40 backdrop-blur motion-safe:animate-fade-up">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-600/30 text-fuchsia-200">
              <UserPlusIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-bold">{artist.name} envite w monte!</span>
              <span className="text-xs text-white/60">Kamera w ak mikwo w ap limen</span>
            </span>
            <button type="button" onClick={() => void respondInvite(myGuest.id, false)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              Non
            </button>
            <button type="button" onClick={() => void respondInvite(myGuest.id, true)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950">
              Monte
            </button>
          </div>
        )}

        {/* ===== MENI ⋮ ATIS LA ===== */}
        {isHost && showMenu && (
          <div className="absolute inset-0 z-50 flex items-end bg-black/50" onClick={() => setShowMenu(false)}>
            <div
              className="max-h-[78vh] w-full overflow-y-auto rounded-t-3xl bg-zinc-900/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ring-1 ring-white/10 backdrop-blur-xl motion-safe:animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

              {/* Pataje */}
              <button type="button" onClick={() => void shareLive()} className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/10">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-citron-400 text-zinc-950">
                  <ShareIcon className="h-5 w-5" />
                </span>
                <span className="text-sm">
                  <span className="block font-bold">Pataje live la</span>
                  <span className="text-xs text-white/60">WhatsApp, Facebook, Instagram…</span>
                </span>
              </button>

              {/* Demann monte */}
              {requests.length > 0 && (
                <section className="mt-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">✋ Demann pou monte ({requests.length})</p>
                  <ul className="space-y-2">
                    {requests.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.guest_name}</span>
                        <button type="button" onClick={() => void respond(r, false)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                          Refize
                        </button>
                        <button type="button" onClick={() => void respond(r, true)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950">
                          Aksepte
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Sèn nan */}
              <section className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">
                  👥 Sou sèn nan ({onStage.length}/{capacity})
                </p>
                {onStage.length + invited.length === 0 ? (
                  <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/60">Pèsonn poko monte. Envite yon atis anba a!</p>
                ) : (
                  <ul className="space-y-2">
                    {[...onStage, ...invited].map((g) => (
                      <li key={g.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.guest_name}</span>
                        <span className={`text-xs ${g.status === "accepted" ? "text-emerald-300" : "text-amber-300"}`}>{g.status === "accepted" ? "Sou sèn" : "⏳ Envite"}</span>
                        <button type="button" onClick={() => void leaveStage(g.id)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                          {g.status === "accepted" ? "Retire" : "Anile"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-white/45">100 like → 2 moun sou sèn · 100 like + $5 kado → 5 moun</p>
              </section>

              {/* Envite yon atis */}
              <section className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">🎤 Envite yon atis</p>
                {candidates === null ? (
                  <p className="p-3 text-xs text-white/60">Ap chèche atis yo…</p>
                ) : candidates.length === 0 ? (
                  <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/60">Pa gen lòt atis an live oswa k ap gade live ou kounye a.</p>
                ) : (
                  <ul className="space-y-2">
                    {candidates.map((c) => {
                      const g = guests.find((x) => x.user_id === c.id && (x.status === "invited" || x.status === "accepted" || x.status === "requested"));
                      return (
                        <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                          <span className="relative shrink-0">
                            {c.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatarUrl} alt="" className={`h-10 w-10 rounded-full object-cover ${c.isLive ? "ring-2 ring-red-500" : ""}`} />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-700 font-bold">{c.name.charAt(0)}</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{c.name}</span>
                            <span className={`text-[11px] ${c.isLive ? "text-red-300" : "text-white/55"}`}>{c.isLive ? "🔴 An live kounye a" : "👁 Ap gade live ou"}</span>
                          </span>
                          {g ? (
                            <span className="text-xs text-white/60">{g.status === "accepted" ? "Sou sèn" : g.status === "invited" ? "⏳ Envite" : "✋ Mande"}</span>
                          ) : (
                            <button type="button" onClick={() => void invite(c.id)} className="flex items-center gap-1 rounded-full bg-fuchsia-600 px-3 py-1.5 text-xs font-bold">
                              <UserPlusIcon className="h-3.5 w-3.5" /> Envite
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ===== ATIS LA: demann pou monte ===== */}
        {isHost && requests.length > 0 && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+8.75rem)] z-40 space-y-2">
            {requests.slice(0, 2).map((r) => (
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
