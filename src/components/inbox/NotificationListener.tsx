"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Portal } from "@/components/Portal";

type Incoming = { id: string; type: string; title: string; body: string; link: string | null };

const ICONS: Record<string, string> = {
  new_song: "🎵",
  new_post: "📣",
  admin_message: "🛡️",
  donation: "💝",
  payout: "💸",
  account: "👤",
  registration: "🎤",
};

// Ti son "ding-dong" an de nòt, fabrike dirèkteman (pa gen fichye pou telechaje)
function playChime(ctxRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [
      { f: 880, t: 0 },
      { f: 1318.5, t: 0.14 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.65);
    });
  } catch {
    // Navigatè a refize son an (pa egzanp moun nan poko klike sou paj la): kat la parèt kanmenm
  }
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
          playChime(audioRef);
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
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[90] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 md:bottom-6"
        aria-live="polite"
      >
        {toasts.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-citron-400/30 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl motion-safe:animate-fade-up"
          >
            <div className="flex gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-citron-400/15 text-xl" aria-hidden>
                {ICONS[n.type] ?? "🔔"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{n.body}</p>
                <div className="mt-3 flex gap-2">
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))}
                      className="btn-primary rounded-full px-4 py-1.5 text-sm"
                    >
                      {n.type === "new_song" ? "🎧 Tande l →" : n.type === "new_post" ? "Wè l →" : "Louvri →"}
                    </Link>
                  )}
                  <Link href="/mesaj" className="rounded-full px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
                    🔔 Mesaj yo
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))}
                className="h-7 w-7 shrink-0 rounded-full text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Fèmen"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </Portal>
  );
}
