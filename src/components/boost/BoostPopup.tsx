"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/PlayerProvider";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import type { Track } from "@/components/player/PlayerProvider";

// Pop-up pou VIZITÈ (pa konekte): apre 1 minit sou sit la, yon rekòmandasyon pou yon mizik oswa yon atis boosted.
// Yon sèl fwa pa sesyon (menm si moun nan chanje paj), epi pa sou paj live / koneksyon yo.
const START_KEY = "upmizik-visit-start";
const SHOWN_KEY = "upmizik-boost-popup";
const DELAY_MS = 60_000;
const SKIP = ["/live", "/konekte", "/enskri", "/admin", "/auth"];

type Pick = { kind: "song"; track: Track } | { kind: "artist"; id: string; name: string; avatarUrl: string | null };

// Ti mesaj ki ankouraje moun nan klike (youn chwazi o aza)
const SONG_LINES = [
  (t: string, a: string) => `« ${t} » se yon mizik espesyal ${a} fè pou fè w plezi. Bay li yon chans, w ap renmen l! 🎧`,
  (t: string, a: string) => `Tout moun ap pale de « ${t} » pa ${a}. Koute l kounye a epi di nou sa w panse! 🔥`,
  (t: string, a: string) => `Yon ti pèl pou zòrèy ou: « ${t} » pa ${a}. Peze ▶, se 3 minit bon vibrasyon! ✨`,
  (t: string, a: string) => `${a} mete tout kè l nan « ${t} ». Ou pa ka pa tande sa! 💛`,
];
const ARTIST_LINES = [
  (a: string) => `Dekouvri ${a}, yon talan k ap monte sou UpMizik. Mizik li ap fè w vibre! 🎤`,
  (a: string) => `${a} se non pou w sonje. Vin tande pwochen gwo atis ayisyen an anvan tout moun! 🔥`,
  (a: string) => `Ou poko konnen ${a}? Se kounye a pou w dekouvri l. Ou p ap regrèt! ✨`,
];

export function BoostPopup() {
  const pathname = usePathname();
  const { playTrack } = usePlayer();
  const [pick, setPick] = useState<Pick | null>(null);
  const [line, setLine] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p))) return;
    let shown = false;
    let start = Date.now();
    try {
      shown = sessionStorage.getItem(SHOWN_KEY) === "1";
      const saved = Number(sessionStorage.getItem(START_KEY));
      if (saved) start = saved;
      else sessionStorage.setItem(START_KEY, String(start));
    } catch {
      // navigatè prive: nou kontinye san memwa
    }
    if (shown) return;

    let cancelled = false;
    const wait = Math.max(0, DELAY_MS - (Date.now() - start));
    const timer = setTimeout(async () => {
      const supabase = createClient();
      // Moun ki konekte pa resevwa pop-up sa a
      const { data: session } = await supabase.auth.getSession();
      if (cancelled || session.session) return;
      const now = new Date().toISOString();
      const [{ data: songs }, { data: artists }] = await Promise.all([
        supabase.from("songs").select(SONG_SELECT).eq("is_boosted", true).gt("boost_expires_at", now).is("archived_at", null).limit(10).returns<SongRow[]>(),
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)
          .eq("role", "artist")
          .eq("status", "approved")
          .is("archived_at", null)
          .limit(10),
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
      if (!options.length) return; // pa gen boost aktif: pa gen pop-up
      const chosen = options[Math.floor(Math.random() * options.length)];
      setPick(chosen);
      setLine(
        chosen.kind === "song"
          ? SONG_LINES[Math.floor(Math.random() * SONG_LINES.length)](chosen.track.title, chosen.track.artistName)
          : ARTIST_LINES[Math.floor(Math.random() * ARTIST_LINES.length)](chosen.name),
      );
      setVisible(true);
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {}
    }, wait);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  if (!visible || !pick) return null;
  const close = () => setVisible(false);
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
