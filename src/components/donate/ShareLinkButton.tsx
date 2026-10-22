"use client";

import { useState } from "react";

// Kopye (oswa pataje sou telefòn) yon lyen sit la: paj don, pwofil atis, pòs...
export function ShareLinkButton({
  path,
  label = "🔗 Pataje lyen don an",
  title = "Sipòte atis sa a sou UpMizik",
  className = "rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-citron-400 hover:text-white",
}: {
  path: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Moun nan anile pataj la: pa fè anyen
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={className}
    >
      {copied ? "✓ Lyen an kopye" : label}
    </button>
  );
}
