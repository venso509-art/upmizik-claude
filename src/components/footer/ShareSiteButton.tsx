"use client";

import { useState } from "react";
import { shareLink } from "@/lib/share";
import { siteShareText } from "@/lib/shareMessages";

// Flèch "Pataje UpMizik": voye lyen sit la (ak yon ti mesaj ki fè moun anvi vizite) sou WhatsApp, Facebook...
export function ShareSiteButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    if ((await shareLink("/", "UpMizik: mizik 100% ayisyen", siteShareText())) === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Pataje UpMizik ak zanmi w"
      title={copied ? "Mesaj ak lyen an kopye!" : "Pataje UpMizik ak zanmi w"}
      className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-citron-400 text-zinc-950 shadow-lg shadow-citron-400/20 transition hover:scale-105"
    >
      {/* Ti wonn k ap respire pou atire atansyon */}
      <span className="absolute inset-0 rounded-full bg-citron-400/60 motion-safe:animate-ping" aria-hidden />
      {copied ? (
        <span className="relative text-sm font-bold" aria-hidden>
          ✓
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 14l5-5-5-5" />
          <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
        </svg>
      )}
    </button>
  );
}
