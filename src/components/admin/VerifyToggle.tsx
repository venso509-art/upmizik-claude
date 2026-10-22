"use client";

import { useState, useTransition } from "react";
import { setVerified } from "@/app/admin/nivo/actions";
import { VerifiedBadge } from "@/components/VerifiedBadge";

// Bouton bò kote non atis la nan Admin: yon klik pou sètifye l (badj ble a), yon lòt klik pou retire l
export function VerifyToggle({ artistId, name, verified: initial }: { artistId: string; name: string; verified: boolean }) {
  const [verified, setLocal] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function toggle(e: React.MouseEvent) {
    // Bouton an ka andedan yon lyen (kat atis la): pa louvri paj la
    e.preventDefault();
    e.stopPropagation();
    const next = !verified;
    if (!next && !confirm(`Retire badj verifye a sou ${name}?`)) return;
    setError(undefined);
    setLocal(next);
    startTransition(async () => {
      const res = await setVerified(artistId, next);
      if (res.error) {
        setLocal(!next);
        setError(res.error);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={verified ? "Retire sètifikasyon an" : "Sètifye atis sa a"}
        aria-pressed={verified}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition disabled:opacity-60 ${
          verified
            ? "border-[#1D9BF0]/50 bg-[#1D9BF0]/15 text-sky-200 hover:bg-red-500/15 hover:text-red-200 hover:border-red-500/40"
            : "border-zinc-700 text-zinc-400 hover:border-[#1D9BF0]/60 hover:text-sky-200"
        }`}
      >
        {verified ? (
          <>
            <VerifiedBadge className="!ml-0" /> Sètifye
          </>
        ) : (
          <>➕ Sètifye</>
        )}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </span>
  );
}
