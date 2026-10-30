"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/PlayerProvider";
import { LineIcon } from "@/components/LineIcon";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import type { Track } from "@/components/player/PlayerProvider";

// Notifikasyon boost pou VIZITÈ (pa konekte): anlè sit la, menm stil ak notifikasyon like/kòmantè yo.
// Plizyè boost an menm tan: chak boost gen pwòp notifikasyon li, youn apre lòt, a 1, 4, 7, 10, 15 minit
// (apre sa, chak 5 minit). Chak èdtan lòd la melanje o aza, konsa chak atis gen menm chans pou l pase an premye.
// Plan 24 è pou yon mizik: notifikasyon "kado" 🎁 — moun nan peze l, anvlòp la louvri, epi l ale sou mizik la.
// Chak boost parèt yon sèl fwa pa sesyon (menm si moun nan chanje paj); pa sou paj live / koneksyon yo.
const START_KEY = "upmizik-visit-start";
const SHOWN_KEY = "upmizik-boost-shown";
const SKIP = ["/live", "/konekte", "/enskri", "/admin", "/auth"];
const SLOTS_MIN = [1, 4, 7, 10, 15];
const slotMinutes = (i: number) => (i < SLOTS_MIN.length ? SLOTS_MIN[i] : 15 + 5 * (i - SLOTS_MIN.length + 1));
const MIN_GAP_MS = 20_000; // omwen 20 segonn ant 2 notifikasyon
const AUTO_HIDE_MS = 14_000; // notifikasyon nòmal la disparèt poukont li (kado a rete)

export type Pick = { kind: "song"; track: Track; gift: boolean } | { kind: "artist"; id: string; name: string; avatarUrl: string | null };
const keyOf = (p: Pick) => (p.kind === "song" ? `s:${p.track.id}` : `a:${p.id}`);

// Ti tèks kout (chak notifikasyon gen youn diferan)
const SONG_LINES = [
  "Yon mizik espesyal pou ou. Peze pou koute! 🎧",
  "Tout moun ap koute l kounye a 🔥",
  "3 minit bon vibrasyon. Peze ▶ ✨",
  "Bay li yon chans, w ap renmen l 💛",
  "Bon mizik pou jounen an 🎶",
];
const ARTIST_LINES = ["Yon talan k ap monte. Dekouvri l! 🎤", "Pwochen gwo atis ayisyen an 🔥", "Sipòte talan lakay 🇭🇹", "Mizik li ap fè w vibre ✨"];

// Melanj ki chanje chak èdtan (menm lòd pou tout moun pandan èdtan an, yon lòt lòd èdtan apre a)
function hourShuffle(items: Pick[]) {
  const sorted = [...items].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  let seed = Math.floor(Date.now() / 3_600_000) >>> 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  }
  return sorted;
}

function readShown(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function BoostPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const { playTrack, isPlaying } = usePlayer();
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const [queue, setQueue] = useState<Pick[] | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [line, setLine] = useState("");
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false); // anvlòp kado a ap louvri
  const lastClosed = useRef(0);
  const giftTimer = useRef<ReturnType<typeof setTimeout>>();
  const skip = SKIP.some((p) => pathname.startsWith(p));

  // Chaje boost aktif yo (sèlman pou vizitè ki pa konekte)
  useEffect(() => {
    if (skip) return;
    try {
      if (!sessionStorage.getItem(START_KEY)) sessionStorage.setItem(START_KEY, String(Date.now()));
    } catch {
      // navigatè prive: nou kontinye san memwa
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (cancelled || session.session) return;
      const now = new Date().toISOString();
      const [{ data: songs }, { data: artists }] = await Promise.all([
        supabase
          .from("songs")
          .select(`${SONG_SELECT}, boost_days`)
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)
          .is("archived_at", null)
          .limit(20)
          .returns<(SongRow & { boost_days: number | null })[]>(),
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)
          .eq("role", "artist")
          .eq("status", "approved")
          .is("archived_at", null)
          .limit(20),
      ]);
      if (cancelled) return;
      const options: Pick[] = [
        ...(songs ?? []).map((s) => ({ kind: "song" as const, track: toTrack(supabase, s), gift: s.boost_days === 1 })),
        ...((artists ?? []) as { id: string; display_name: string; avatar_url: string | null }[]).map((a) => ({
          kind: "artist" as const,
          id: a.id,
          name: a.display_name,
          avatarUrl: a.avatar_url,
        })),
      ];
      setQueue(hourShuffle(options));
    })();
    return () => {
      cancelled = true;
    };
  }, [skip]);

  // Pwochen notifikasyon an: premye boost ki poko parèt, nan minit pa l (1, 4, 7, 10, 15...)
  useEffect(() => {
    if (skip || visible || !queue?.length) return;
    const shown = readShown();
    const i = queue.findIndex((p) => !shown.has(keyOf(p)));
    if (i < 0) return; // tout boost yo deja parèt nan sesyon sa a
    let start = Date.now();
    try {
      start = Number(sessionStorage.getItem(START_KEY)) || start;
    } catch {}
    const due = Math.max(start + slotMinutes(i) * 60_000, lastClosed.current + MIN_GAP_MS);
    const timer = setTimeout(() => {
      const chosen = queue[i];
      const hour = Math.floor(Date.now() / 3_600_000);
      setPick(chosen);
      setLine(chosen.kind === "song" ? SONG_LINES[(i + hour) % SONG_LINES.length] : ARTIST_LINES[(i + hour) % ARTIST_LINES.length]);
      setOpening(false);
      setVisible(true);
      try {
        sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...Array.from(readShown()), keyOf(chosen)]));
      } catch {}
    }, Math.max(0, due - Date.now()));
    return () => clearTimeout(timer);
  }, [queue, visible, skip]);

  // Notifikasyon nòmal la disparèt poukont li (kado a rete jiskaske moun nan louvri l oswa fèmen l)
  const isGift = pick?.kind === "song" && pick.gift;
  useEffect(() => {
    if (!visible || isGift) return;
    const t = setTimeout(() => {
      lastClosed.current = Date.now();
      setVisible(false);
      if (!playingRef.current && pick) void autoPlay(pick);
    }, AUTO_HIDE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isGift]);

  // Jwe mizik boost la (oswa chante atis boost la ki pi koute a) nan ba anba a, san chanje paj
  async function autoPlay(p: Pick) {
    if (p.kind === "song") return playTrack(p.track, [p.track]);
    const supabase = createClient();
    const { data } = await supabase
      .from("songs")
      .select(SONG_SELECT)
      .eq("artist_id", p.id)
      .is("archived_at", null)
      .order("play_count", { ascending: false })
      .limit(5)
      .returns<SongRow[]>();
    const tracks = (data ?? []).map((row) => toTrack(supabase, row));
    if (tracks.length && !playingRef.current) playTrack(tracks[0], tracks);
  }

  if (!visible || !pick || skip) return null;

  const close = () => {
    lastClosed.current = Date.now();
    setVisible(false);
    setOpening(false);
  };

  // Ale sou mizik la (epi jwe l) oswa sou paj atis la (yon sèl fwa, menm si timer a ak bouton an tou de rive)
  const go = () => {
    clearTimeout(giftTimer.current);
    if (!visible) return;
    if (pick.kind === "song") {
      playTrack(pick.track, [pick.track]);
      router.push(`/chante/${pick.track.id}`);
    } else router.push(`/atis/${pick.id}`);
    close();
  };

  // Anvlòp la louvri, epi apre animasyon an nou mennen moun nan sou mizik la
  const openGift = () => {
    setOpening(true);
    giftTimer.current = setTimeout(go, 2600);
  };

  return <BoostNotice pick={pick} line={line} opening={opening} onOpenGift={openGift} onGo={go} onClose={close} />;
}

// Afichaj la (separe pou ka montre l san done, pa egzanp pou tès)
export function BoostNotice({
  pick,
  line,
  opening,
  onOpenGift,
  onGo,
  onClose,
}: {
  pick: Pick;
  line: string;
  opening: boolean;
  onOpenGift: () => void;
  onGo: () => void;
  onClose: () => void;
}) {
  const isGift = pick.kind === "song" && pick.gift;
  const title =
    pick.kind === "song" ? (pick.gift ? "Ou gen yon kado mizik! 🎁" : `« ${pick.track.title} » · ${pick.track.artistName}`) : `Dekouvri ${pick.name}`;
  const text = pick.kind === "song" && pick.gift ? "Peze anvlòp la pou w louvri l ✨" : line;

  return (
    <>
      {/* ===== KAT NOTIFIKASYON AN (anlè sit la, kat blan + kare jòn) ===== */}
      {!opening && (
        <div
          className="fixed inset-x-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[85] flex justify-center sm:inset-x-auto sm:right-4 sm:w-[24rem]"
          role="dialog"
          aria-label="Rekòmandasyon UpMizik"
        >
          <div className="relative w-full rounded-[1.25rem] bg-[#FFFFFF] shadow-[0_18px_45px_-12px_rgba(11,19,43,0.55),0_4px_14px_rgba(11,19,43,0.18)] ring-1 ring-[#0B132B]/5 motion-safe:animate-toast-drop">
            <button type="button" onClick={isGift ? onOpenGift : onGo} className="flex w-full items-center gap-3.5 py-3.5 pl-3.5 pr-10 text-left">
              <span
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[#0B132B] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] ${
                  isGift ? "bg-gradient-to-br from-[#FFE34D] to-[#FFB800]" : "bg-[#FFD700]"
                }`}
                aria-hidden
              >
                {isGift ? (
                  <span className="text-2xl motion-safe:animate-gift-wiggle">🎁</span>
                ) : (
                  <LineIcon name={pick.kind === "song" ? "music" : "mic"} className="h-6 w-6" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold leading-tight text-[#0B132B]">{title}</span>
                <span className="mt-1 block truncate text-[13px] text-[#64708A]">{text}</span>
              </span>
              {/* Ti foto mizik/atis la adwat */}
              {!isGift && (pick.kind === "song" ? pick.track.coverUrl : pick.avatarUrl) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(pick.kind === "song" ? pick.track.coverUrl : pick.avatarUrl) ?? ""}
                  alt=""
                  className={`h-11 w-11 shrink-0 object-cover ${pick.kind === "artist" ? "rounded-full" : "rounded-lg"}`}
                />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm text-[#94A0B8] transition hover:bg-[#F1F3F8] hover:text-[#0B132B]"
              aria-label="Fèmen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ===== ANVLÒP KADO A K AP LOUVRI (plan 24 è, mizik) ===== */}
      {opening && pick.kind === "song" && (
        <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-black/70 px-6 backdrop-blur-sm" onClick={onGo}>
          <div className="relative h-48 w-72 motion-safe:animate-envelope-in" style={{ perspective: "800px" }}>
            {/* Do anvlòp la */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#E6B800] to-[#C99A00] shadow-2xl" />
            {/* Lèt la: kouvèti mizik la ki monte soti nan anvlòp la */}
            <div className="absolute inset-x-4 bottom-3 z-10 flex h-40 flex-col items-center rounded-xl bg-[#FFFFFF] p-2.5 shadow-lg motion-safe:animate-letter-rise">
              <span className="h-24 w-24 overflow-hidden rounded-lg bg-[#F1F3F8] shadow-md">
                {pick.track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pick.track.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-4xl">🎵</span>
                )}
              </span>
              <span className="mt-2 w-full truncate text-center text-sm font-black text-[#0B132B]">{pick.track.title}</span>
              <span className="w-full truncate text-center text-xs font-semibold text-[#64708A]">{pick.track.artistName}</span>
            </div>
            {/* Pòch devan an */}
            <div
              className="absolute inset-0 z-20 rounded-2xl bg-gradient-to-b from-[#FFD700] to-[#F2B900]"
              style={{ clipPath: "polygon(0 38%, 50% 72%, 100% 38%, 100% 100%, 0 100%)" }}
            />
            {/* Rabat la (li louvri an 3D) */}
            <div
              className="absolute inset-x-0 top-0 z-30 h-[62%] origin-top motion-safe:animate-flap-open"
              style={{ backfaceVisibility: "visible" }}
            >
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#FFE34D] to-[#FFD000]"
                style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", borderRadius: "1rem 1rem 0 0" }}
              />
              {/* Ti sele kè a: li vire ak rabat la */}
              <span className="absolute left-1/2 top-[68%] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#E11D48] text-sm text-[#FFFFFF] shadow-lg">
                ❤
              </span>
            </div>
            {/* Ti zetwal ki eklate */}
            {["-left-6 top-0", "-right-6 top-2", "left-6 -top-10", "right-8 -top-12", "left-1/2 -top-16"].map((pos, i) => (
              <span
                key={pos}
                className={`absolute ${pos} text-2xl opacity-0 motion-safe:animate-heart-float`}
                style={{ animationDelay: `${1.1 + i * 0.12}s` }}
                aria-hidden
              >
                {["✨", "🎶", "⭐", "💛", "🎵"][i]}
              </span>
            ))}
          </div>
          <p className="mt-16 text-center text-lg font-black text-white">Yon kado mizik pou ou! 🎧</p>
          <p className="mt-1 text-center text-sm text-white/70">N ap mennen w sou « {pick.track.title} »…</p>
          <button type="button" onClick={onGo} className="mt-5 rounded-full bg-[#FFD700] px-6 py-3 font-black text-[#0B132B] shadow-lg">
            ▶ Koute l kounye a
          </button>
        </div>
      )}
    </>
  );
}
