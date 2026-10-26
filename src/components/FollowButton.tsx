"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineIcon } from "@/components/LineIcon";

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "")}k` : String(n));

// Bouton "Abone" pou atis Pro yo: abone yo resevwa tout sa atis la pibliye (chante, pòs, stati, live)
export function FollowButton({
  artistId,
  artistName,
  userId,
  initialFollowing,
  initialCount,
}: {
  artistId: string;
  artistName: string;
  userId: string | null;
  initialFollowing: boolean;
  initialCount: number;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pop, setPop] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (userId === artistId) {
    // Atis la li menm: sèlman kantite abone li yo
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 text-sm font-semibold text-zinc-200">
        <LineIcon name="user" /> {compact(count)} abone
      </span>
    );
  }

  if (!userId) {
    return (
      <Link
        href="/konekte"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FFD700] px-5 text-sm font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105"
      >
        <LineIcon name="user" /> Abone · {compact(count)}
      </Link>
    );
  }

  function toggle() {
    const next = !following;
    setError(undefined);
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 900);
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = next
        ? await supabase.from("artist_follows").insert({ follower_id: userId, artist_id: artistId })
        : await supabase.from("artist_follows").delete().eq("follower_id", userId).eq("artist_id", artistId);
      if (err && !err.message.includes("duplicate")) {
        setFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        setError(next ? "Abònman an pa pase. Eseye ankò." : "Pa ka dezabone kounye a.");
      }
    });
  }

  return (
    <span className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        title={following ? `Dezabone nan ${artistName}` : `Abone nan ${artistName} pou w pa rate anyen`}
        className={`relative inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-black transition active:scale-95 ${
          following
            ? "border border-zinc-600 bg-zinc-900/70 text-zinc-100 hover:border-red-400/60 hover:text-red-300"
            : "bg-[#FFD700] text-[#0B132B] shadow-lg shadow-[#FFD700]/25 hover:brightness-105"
        }`}
      >
        {following ? "✓ Abone" : "＋ Abone"}
        <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${following ? "bg-white/10" : "bg-[#0B132B]/10"}`}>{compact(count)}</span>
        {/* Ti eklat lè moun nan abone */}
        {pop && (
          <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-lg motion-safe:animate-heart-float" aria-hidden>
            🎉
          </span>
        )}
      </button>
      {error && <span className="mt-1 text-xs text-red-300">{error}</span>}
    </span>
  );
}
