"use client";

import { useState } from "react";
import { shareLink } from "@/lib/share";

// Kopye (oswa pataje sou telefòn) yon lyen sit la: paj don, pwofil atis, pòs...
export function ShareLinkButton({
  path,
  label = "🔗 Pataje lyen don an",
  title = "Sipòte atis sa a sou UpMizik",
  text,
  className = "rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-citron-400 hover:text-white",
}: {
  path: string;
  label?: string;
  title?: string;
  text?: string; // mesaj ki akonpaye lyen an (lib/shareMessages.ts)
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if ((await shareLink(path, title, text)) === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={className}
    >
      {copied ? "✓ Mesaj ak lyen an kopye" : label}
    </button>
  );
}
