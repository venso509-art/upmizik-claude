"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Track } from "@/components/player/PlayerProvider";
import { OFFLINE_EVENT, isSavedOffline, removeOffline, saveOffline } from "@/lib/offline";

type State = "unknown" | "idle" | "saving" | "saved";

export function DownloadButton({
  track,
  currentUserId,
  className,
  showLabel = false,
}: {
  track: Track;
  currentUserId: string | null;
  className: string;
  showLabel?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("unknown");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const check = () => isSavedOffline(track.id).then((saved) => setState((s) => (s === "saving" ? s : saved ? "saved" : "idle")));
    check();
    window.addEventListener(OFFLINE_EVENT, check);
    return () => window.removeEventListener(OFFLINE_EVENT, check);
  }, [track.id]);

  async function onClick() {
    if (!currentUserId) return router.push("/konekte");
    if (state === "saving") return;

    if (state === "saved") {
      if (confirm(`Retire « ${track.title} » nan mizik offline ou yo?`)) await removeOffline(track);
      return;
    }

    setState("saving");
    setProgress(0);
    try {
      await saveOffline(track, setProgress);
      setState("saved");
    } catch (err) {
      setState("idle");
      alert(err instanceof Error ? err.message : "Telechajman an echwe. Eseye ankò.");
    }
  }

  if (state === "unknown") return null;

  const label = state === "saved" ? "Offline" : state === "saving" ? `${Math.round(progress * 100)}%` : "Sove offline";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} ${state === "saved" ? "text-emerald-400" : ""}`}
      aria-label={state === "saved" ? "Retire nan mizik offline" : "Sove pou koute san entènèt"}
      title={state === "saved" ? "Sove offline ✓ (klike pou retire l)" : "Sove pou koute san entènèt"}
    >
      {state === "saved" ? "✅" : state === "saving" ? "⏳" : "📥"} {(showLabel || state === "saving") && label}
    </button>
  );
}
