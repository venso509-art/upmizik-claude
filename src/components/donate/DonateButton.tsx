"use client";

import { useState } from "react";
import { DonateModal } from "./DonateModal";

// Ikòn "men k ap bay yon kè" (Lucide hand-heart, lisans ISC)
export function DonateIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
      <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 15 6 6" />
      <path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" />
    </svg>
  );
}

export function DonateButton({
  artistId,
  artistName,
  songId = null,
  songTitle = null,
  className,
  label,
  defaultOpen = false,
}: {
  artistId: string;
  artistName: string;
  songId?: string | null;
  songTitle?: string | null;
  className: string;
  label?: string;
  defaultOpen?: boolean; // louvri fenèt don an touswit (paj /don/...)
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={`Fè yon don bay ${artistName}`}>
        <DonateIcon /> {label}
      </button>
      {open && (
        <DonateModal artistId={artistId} artistName={artistName} songId={songId} songTitle={songTitle} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
