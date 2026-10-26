"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/PlayerProvider";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import type { Track } from "@/components/player/PlayerProvider";

// Pop-up pou VIZITÈ (pa konekte): rekòmandasyon pou mizik ak atis boosted yo.
// Plizyè boost an menm tan: chak boost gen pwòp pop-up li, youn apre lòt, a 1, 4, 7, 10, 15 minit
// (apre sa, chak 5 minit). Chak èdtan lòd la melanje o aza, konsa chak atis gen menm chans pou l pase an premye.
// Chak boost parèt yon sèl fwa pa sesyon (menm si moun nan chanje paj); pa sou paj live / koneksyon yo.
const START_KEY = "upmizik-visit-start";
const SHOWN_KEY = "upmizik-boost-shown";
const SKIP = ["/live", "/konekte", "/enskri", "/admin", "/auth"];
const SLOTS_MIN = [1, 4, 7, 10, 15];
const slotMinutes = (i: number) => (i < SLOTS_MIN.length ? SLOTS_MIN[i] : 15 + 5 * (i - SLOTS_MIN.length + 1));
const MIN_GAP_MS = 20_000; // omwen 20 segonn ant 2 pop-up

type Pick = { kind: "song"; track: Track } | { kind: "artist"; id: string; name: string; avatarUrl: string | null };
const keyOf = (p: Pick) => (p.kind === "song" ? `s:${p.track.id}` : `a:${p.id}`);

// Ti mesaj ki ankouraje moun nan klike (chak pop-up gen yon mesaj diferan)
const SONG_LINES = [
  (t: string, a: string) => `« ${t} » se yon mizik espesyal ${a} fè pou fè w plezi. Bay li yon chans, w ap renmen l! 🎧`,
  (t: string, a: string) => `Tout moun ap pale de « ${t} » pa ${a}. Koute l kounye a epi di nou sa w panse! 🔥`,
  (t: string, a: string) => `Yon ti pèl pou zòrèy ou: « ${t} » pa ${a}. Peze ▶, se 3 minit bon vibrasyon! ✨`,
  (t: string, a: string) => `${a} mete tout kè l nan « ${t} ». Ou pa ka pa tande sa! 💛`,
  (t: string, a: string) => `Ou bezwen yon bon mizik pou jounen an? « ${t} » pa ${a} se li menm! 🎶`,
  (t: string, a: string) => `Fanatik ${a} yo pa ka sispann koute « ${t} ». Vin wè poukisa! 😍`,
];
const ARTIST_LINES = [
  (a: string) => `Dekouvri ${a}, yon talan k ap monte sou UpMizik. Mizik li ap fè w vibre! 🎤`,
  (a: string) => `${a} se non pou w sonje. Vin tande pwochen gwo atis ayisyen an anvan tout moun! 🔥`,
  (a: string) => `Ou poko konnen ${a}? Se kounye a pou w dekouvri l. Ou p ap regrèt! ✨`,
  (a: string) => `Sipòte talan lakay: ${a} gen bèl mizik k ap tann ou sou paj li. 🇭🇹`,
];

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
  const { playTrack } = usePlayer();
  const [queue, setQueue] = useState<Pick[] | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [line, setLine] = useState("");
  const [visible, setVisible] = useState(false);
  const lastClosed = useRef(0);
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
        supabase.from("songs").select(SONG_SELECT).eq("is_boosted", true).gt("boost_expires_at", now).is("archived_at", null).limit(20).returns<SongRow[]>(),
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
        ...(songs ?? []).map((s) => ({ kind: "song" as const, track: toTrack(supabase, s) })),
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

  // Pwochen pop-up la: premye boost ki poko parèt, nan minit pa l (1, 4, 7, 10, 15...)
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
      setLine(
        chosen.kind === "song"
          ? SONG_LINES[(i + hour) % SONG_LINES.length](chosen.track.title, chosen.track.artistName)
          : ARTIST_LINES[(i + hour) % ARTIST_LINES.length](chosen.name),
      );
      setVisible(true);
      try {
        sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...Array.from(readShown()), keyOf(chosen)]));
      } catch {}
    }, Math.max(0, due - Date.now()));
    return () => clearTimeout(timer);
  }, [queue, visible, skip]);

  if (!visible || !pick || skip) return null;
  const close = () => {
    lastClosed.current = Date.now();
    setVisible(false);
  };
  const image = pick.kind === "song" ? pick.track.coverUrl : pick.avatarUrl;
  const title = pick.kind === "song" ? pick.track.title : pick.name;
  const subtitle = pick.kind === "song" ? pick.track.artistName : "Atis sou UpMizik";

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[85] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[23rem]"
      role="dialog"
      aria-label="Rekòmandasyon UpMizik"
    >
      {/* Bòdi gradyan (jòn → oranj → vèt) */}
      <div className="rounded-[1.6rem] bg-gradient-to-br from-[#FFD700] via-orange-500 to-[#0A5C36] p-[2px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] motion-safe:animate-toast-pop">
        <div className="force-dark relative overflow-hidden rounded-[1.5rem] bg-[#0B132B] p-4">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#FFD700]/20 blur-3xl" aria-hidden />
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-white/80 transition hover:bg-white/20"
            aria-label="Fèmen"
          >
            ✕
          </button>

          <p className="relative inline-flex items-center gap-1.5 rounded-full bg-[#FFD700] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0B132B]">
            🔥 Rekòmande pou ou
          </p>

          <div className="relative mt-3 flex items-center gap-3.5">
            <span
              className={`relative h-20 w-20 shrink-0 overflow-hidden bg-zinc-800 shadow-lg ring-2 ring-[#FFD700]/70 ${pick.kind === "artist" ? "rounded-full" : "rounded-2xl"}`}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-3xl">{pick.kind === "song" ? "🎵" : "🎤"}</span>
              )}
            </span>
            <span className="min-w-0 pr-6">
              <span className="block truncate text-lg font-black leading-tight text-white">{title}</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-[#FFE34D]">{subtitle}</span>
            </span>
          </div>

          <p className="relative mt-3 text-[14px] leading-snug text-white/85">{line}</p>

          <div className="relative mt-4 flex gap-2">
            {pick.kind === "song" ? (
              <button
                type="button"
                onClick={() => {
                  playTrack(pick.track, [pick.track]);
                  close();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FFD700] px-4 py-3 text-[15px] font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105 active:scale-[0.98]"
              >
                ▶ Koute l kounye a
              </button>
            ) : (
              <Link
                href={`/atis/${pick.id}`}
                onClick={close}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FFD700] px-4 py-3 text-[15px] font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105 active:scale-[0.98]"
              >
                🎤 Dekouvri l
              </Link>
            )}
            <button type="button" onClick={close} className="rounded-full px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
              Pita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
