"use client";

import { useState } from "react";
import { recordShare, shareLink, type ShareKind } from "@/lib/share";

// Bouton 🔗 Pataje ki montre kantite pataj yo epi ki ogmante kontè a lè moun nan pataje
export function ShareCountButton({
  kind,
  id,
  path,
  title,
  initialCount = 0,
  className,
}: {
  kind: ShareKind;
  id: string;
  path: string;
  title: string;
  initialCount?: number;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const res = await shareLink(path, title);
    if (!res) return;
    if (res === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    const total = await recordShare(kind, id);
    if (total !== null) setCount(total);
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={`Pataje (${count} pataj)`}>
      🔗 {copied ? "Lyen an kopye!" : count > 0 ? <span className="tabular-nums">{count}</span> : "Pataje"}
    </button>
  );
}
