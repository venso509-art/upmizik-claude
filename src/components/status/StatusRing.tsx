"use client";

import { useEffect, useState } from "react";
import { SEEN_EVENT, readSeen } from "@/lib/statuses";
import { StatusViewer, type StatusArtist } from "@/components/status/StatusViewer";

// Wonn ki antoure foto atis la lè l gen stati vivan (tankou WhatsApp):
// vèt = gen stati moun nan poko wè; gri = li wè yo tout. Klike = louvri stati yo.
export function useStatusSeen(statusIds: string[]) {
  const [unseen, setUnseen] = useState(statusIds.length > 0);
  const key = statusIds.join(","); // pou efè a pa rekòmanse chak fwa yon nouvo tablo [] rive
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const update = () => {
      const seen = readSeen();
      setUnseen(ids.some((id) => !seen.has(id)));
    };
    update();
    window.addEventListener(SEEN_EVENT, update);
    return () => window.removeEventListener(SEEN_EVENT, update);
  }, [key]);
  return unseen;
}

export function statusRingStyle(unseen: boolean) {
  return {
    background: unseen
      ? "conic-gradient(from 0deg, #22C55E, #FFD700, #22C55E, #10B981, #22C55E)"
      : "linear-gradient(135deg, #52525b, #3f3f46)",
  };
}

// Bouton ki louvri stati yon atis (pou foto gwo paj atis la, elatriye)
export function StatusRing({
  artist,
  statusIds,
  children,
  className = "",
  ringWidth = "p-1",
}: {
  artist: StatusArtist;
  statusIds: string[];
  children: React.ReactNode;
  className?: string;
  ringWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const unseen = useStatusSeen(statusIds);
  if (statusIds.length === 0) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative block rounded-full transition hover:scale-[1.02] ${ringWidth} ${className}`}
        style={statusRingStyle(unseen)}
        aria-label={`Wè stati ${artist.name}`}
        title="Wè stati yo"
      >
        <span className="block rounded-full bg-zinc-950 p-[3px]">{children}</span>
      </button>
      {open && <StatusViewer artist={artist} onClose={() => setOpen(false)} />}
    </>
  );
}
