"use client";

import { useState } from "react";

// Kopye (oswa pataje sou telefòn) lyen paj don an
export function ShareLinkButton({ path, label = "🔗 Pataje lyen don an" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sipòte atis sa a sou UpMizik", url });
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
      className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-citron-400 hover:text-white"
    >
      {copied ? "✓ Lyen an kopye" : label}
    </button>
  );
}
