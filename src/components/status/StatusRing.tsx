"use client";

import { useEffect, useState } from "react";
import { SEEN_EVENT, readSeen } from "@/lib/statuses";
import { StatusViewer, type StatusArtist } from "@/components/status/StatusViewer";

// Ki stati moun nan deja wè (navigatè a), pou koulè chak moso wonn nan
export function useSeenFlags(statusIds: string[]) {
  const key = statusIds.join(","); // pou efè a pa rekòmanse chak fwa yon nouvo tablo [] rive
  const [flags, setFlags] = useState<boolean[]>(() => statusIds.map(() => false));
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const update = () => {
      const seen = readSeen();
      setFlags(ids.map((id) => seen.has(id)));
    };
    update();
    window.addEventListener(SEEN_EVENT, update);
    return () => window.removeEventListener(SEEN_EVENT, update);
  }, [key]);
  return flags;
}

// Wonn ki koupe an moso (tankou WhatsApp): 1 stati = wonn konplè, 2 stati = 2 moso, elatriye.
// Vèt = stati moun nan poko wè; gri = li deja wè l.
export function SegmentedRing({ seen, width = 3.5 }: { seen: boolean[]; width?: number }) {
  const n = Math.max(1, seen.length);
  const r = 50 - width / 2;
  const c = 2 * Math.PI * r;
  const gap = n > 1 ? Math.min(6, c / n / 4) : 0;
  const seg = c / n - gap;
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <defs>
        <linearGradient id="status-unseen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
      {seen.map((isSeen, i) => (
        <circle
          key={i}
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={isSeen ? "#52525b" : "url(#status-unseen)"}
          strokeWidth={width}
          strokeLinecap={n > 1 ? "round" : "butt"}
          strokeDasharray={`${seg} ${c - seg}`}
          strokeDashoffset={-(i * (c / n) + gap / 2)}
        />
      ))}
    </svg>
  );
}

// Bouton ki louvri stati yon atis (pou gwo foto paj atis la, elatriye)
export function StatusRing({
  artist,
  statusIds,
  children,
  className = "",
  pad = "p-1.5",
}: {
  artist: StatusArtist;
  statusIds: string[];
  children: React.ReactNode;
  className?: string;
  pad?: string;
}) {
  const [open, setOpen] = useState(false);
  const seen = useSeenFlags(statusIds);
  if (statusIds.length === 0) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative block rounded-full transition hover:scale-[1.02] ${pad} ${className}`}
        aria-label={`Wè stati ${artist.name}`}
        title="Wè stati yo"
      >
        <SegmentedRing seen={seen} width={2.5} />
        <span className="relative block rounded-full">{children}</span>
      </button>
      {open && <StatusViewer artist={artist} onClose={() => setOpen(false)} />}
    </>
  );
}
