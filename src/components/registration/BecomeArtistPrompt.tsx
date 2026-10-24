"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Portal } from "@/components/Portal";

const DISMISS_KEY = "upmizik-become-artist-dismissed";
const DISMISS_DAYS = 7;
const SHOW_AFTER_MS = 45000; // apre kat "Enstale app la" (12 s), pou yo pa parèt ansanm

// Ti kat pou koutè ki konekte yo: "Ou se atis? Pibliye mizik ou" → /vin-atis (menm stil ak kat enstalasyon an)
export function BecomeArtistPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (last && Date.now() - last < DISMISS_DAYS * 86400 * 1000) return;
    } catch {}
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (!visible || pathname.startsWith("/vin-atis")) return null;

  return (
    <Portal>
      <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] z-[59] mx-auto max-w-md motion-safe:animate-fade-up sm:bottom-6">
        <div className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/40 bg-zinc-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 text-2xl" aria-hidden>
            🎤
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Ou se atis?</p>
            <p className="text-xs text-zinc-400">Pibliye mizik ou sou UpMizik epi resevwa don fanatik yo.</p>
          </div>
          <Link href="/vin-atis" onClick={dismiss} className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm">
            Vin atis
          </Link>
          <button type="button" onClick={dismiss} className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-white" aria-label="Pita">
            ✕
          </button>
        </div>
      </div>
    </Portal>
  );
}
