"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Portal } from "@/components/Portal";

export type Incoming = { id: string; type: string; title: string; body: string; link: string | null };

// Ikòn liy (stil afich UpMizik la): kè pou don/like, epi yon ikòn pa kalite pou lòt notifikasyon yo
const svg = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const HEART = svg(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />);
const ICONS: Record<string, React.ReactNode> = {
  donation: HEART,
  like: HEART,
  new_song: svg(
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>,
  ),
  live: svg(
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </>,
  ),
  new_post: svg(
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>,
  ),
  comment: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  admin_message: svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  payout: svg(
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>,
  ),
  follow: svg(
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-1a7 7 0 0 1 14 0v1M19 8v6M22 11h-6" />
    </>,
  ),
  account: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  registration: svg(
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0M12 17v5" />
    </>,
  ),
};
const BELL = svg(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>,
);
// Tit yo san emoji devan (kare jòn nan deja montre ikòn nan), tankou modèl afich UpMizik la
const LEADING_EMOJI = new RegExp("^[\\p{Extended_Pictographic}\\uFE0F\\u200D\\s]+", "u");
const cleanTitle = (t: string) => t.replace(LEADING_EMOJI, "") || t;

// Don ak like: ti kè a bat (tankou yon kè ki kontan)
const LOVE = new Set(["donation", "like"]);

// Ti son "ding-dong" an de nòt, fabrike dirèkteman (pa gen fichye pou telechaje).
// Don ak enskripsyon (admin): yon son "ka-ching" an 3 nòt, pi fò, pou l pa pase inapèsi.
function playChime(ctxRef: React.MutableRefObject<AudioContext | null>, type = "") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const important = type === "donation" || type === "registration";
    (important
      ? [
          { f: 1046.5, t: 0 },
          { f: 1318.5, t: 0.1 },
          { f: 1568, t: 0.2 },
          { f: 2093, t: 0.32 },
        ]
      : [
          { f: 880, t: 0 },
          { f: 1318.5, t: 0.14 },
        ]
    ).forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(important ? 0.35 : 0.25, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.65);
    });
  } catch {
    // Navigatè a refize son an (pa egzanp moun nan poko klike sou paj la): kat la parèt kanmenm
  }
}

// Kat blan + kare jòn (stil afich UpMizik la). Koulè yo fiks: menm kat la an mòd sonb ak light.
export function NotificationCard({ n, onClose }: { n: Incoming; onClose: () => void }) {
  return (
    <div
      className="group pointer-events-auto relative w-full max-w-sm rounded-[1.25rem] bg-[#FFFFFF] shadow-[0_18px_45px_-12px_rgba(11,19,43,0.55),0_4px_14px_rgba(11,19,43,0.18)] ring-1 ring-[#0B132B]/5 motion-safe:animate-toast-pop"
    >
      <Link href={n.link ?? "/mesaj"} onClick={onClose} className="flex items-center gap-3.5 py-3.5 pl-3.5 pr-10">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-[#0B132B] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]"
          aria-hidden
        >
          <span className={`flex ${LOVE.has(n.type) ? "motion-safe:animate-heartbeat" : ""}`}>{ICONS[n.type] ?? BELL}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-tight text-[#0B132B]">{cleanTitle(n.title)}</span>
          <span className="mt-1 block truncate text-[13px] text-[#64708A]">
            {n.body ? `${n.body} · ` : ""}kounye a
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm text-[#94A0B8] transition hover:bg-[#F1F3F8] hover:text-[#0B132B]"
        aria-label="Fèmen"
      >
        ✕
      </button>
    </div>
  );
}

// Koute bwat mesaj moun ki konekte a AN DIRÈK: lè yon nouvo mesaj rive, li sonnen
// epi li montre yon ti kat ak yon lyen pou al wè/tande nouvote a.
export function NotificationListener({ userId }: { userId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Incoming[]>([]);
  const audioRef = useRef<AudioContext | null>(null);

  // Navigatè yo bloke son an toutotan moun nan pa entèraji ak paj la: nou "reveye" son an nan premye klik la
  useEffect(() => {
    const unlock = () => {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioRef.current = audioRef.current ?? new Ctx();
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Incoming;
          playChime(audioRef, n.type);
          setToasts((t) => [n, ...t].slice(0, 3));
          // Mete kontè 🔔 la ajou
          router.refresh();
          // Kat la disparèt poukont li apre 10 segonn
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 10000);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  if (toasts.length === 0) return null;

  return (
    <Portal>
      <div
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[90] flex flex-col items-end gap-2.5 sm:inset-x-auto sm:right-4 md:bottom-6"
        aria-live="polite"
      >
        {toasts.map((n) => (
          <NotificationCard key={n.id} n={n} onClose={() => setToasts((t) => t.filter((x) => x.id !== n.id))} />
        ))}
      </div>
    </Portal>
  );
}
