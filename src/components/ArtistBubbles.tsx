"use client";

import Link from "next/link";
import { useState } from "react";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { StatusViewer } from "@/components/status/StatusViewer";
import { SegmentedRing, useSeenFlags } from "@/components/status/StatusRing";
import { LiveBadge } from "@/components/live/LiveBadge";

export type BubbleArtist = { artist_id: string; display_name: string; avatar_url: string | null; plays: number; is_verified?: boolean };

// Ranje atis an sèk won (tankou estati WhatsApp), ki woule de goch a dwat.
// statuses = id stati vivan chak atis: wonn vèt + klike = wè stati yo; san stati = ale sou pwofil la.
// lives = { artist_id: live_id } pou atis ki an live kounye a (wonn wouj + klike = antre nan live la)
export function ArtistBubbles({
  title,
  artists,
  statuses = {},
  lives = {},
}: {
  title: string;
  artists: BubbleArtist[];
  statuses?: Record<string, string[]>;
  lives?: Record<string, string>;
}) {
  const [viewing, setViewing] = useState<BubbleArtist | null>(null);
  if (artists.length === 0) return null;

  // Atis ki gen stati yo an premye (tankou WhatsApp)
  // Atis an live yo an premye, apre sa sa ki gen stati yo
  const rank = (a: BubbleArtist) => (lives[a.artist_id] ? 2 : 0) + (statuses[a.artist_id]?.length ? 1 : 0);
  const sorted = [...artists].sort((a, b) => rank(b) - rank(a));

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.map((a) => (
          <li key={a.artist_id} className="shrink-0 snap-start">
            <Bubble artist={a} statusIds={statuses[a.artist_id] ?? []} liveId={lives[a.artist_id]} onOpen={() => setViewing(a)} />
          </li>
        ))}
      </ul>
      {viewing && (
        <StatusViewer
          artist={{ id: viewing.artist_id, name: viewing.display_name, avatarUrl: viewing.avatar_url, verified: viewing.is_verified }}
          onClose={() => setViewing(null)}
        />
      )}
    </section>
  );
}

function Bubble({ artist: a, statusIds, liveId, onOpen }: { artist: BubbleArtist; statusIds: string[]; liveId?: string; onOpen: () => void }) {
  const hasStatus = statusIds.length > 0 && !liveId;
  const seen = useSeenFlags(statusIds);

  const circle = (
    <>
      {/* Bòdi a: vèt si gen stati pou wè, gri si l deja wè yo, gradyan UpMizik la si pa gen stati */}
      <span
        className={`relative rounded-full transition group-hover:scale-105 ${
          liveId ? "bg-red-600 p-[3px] shadow-[0_0_18px_rgba(220,38,38,0.65)] motion-safe:animate-pulse" : hasStatus ? "p-[5px]" : "bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[3px]"
        }`}
      >
        {/* Wonn stati a: yon moso pou chak stati (tankou WhatsApp) */}
        {hasStatus && <SegmentedRing seen={seen} />}
        <span className={`relative block rounded-full bg-zinc-950 ${hasStatus ? "p-[1px]" : "p-[3px]"}`}>
          <span className="block h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
            {a.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xl font-extrabold text-white">{a.display_name.charAt(0).toUpperCase()}</span>
            )}
          </span>
        </span>
        {/* Tchèk ble a sou kwen sèk la, pou l toujou parèt menm si non an long */}
        <VerifiedCorner show={a.is_verified} size="md" />
        {/* An live kounye a */}
        {liveId && <LiveBadge className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" />}
      </span>
      <span className="w-full truncate text-center text-xs text-zinc-300 group-hover:text-white">{a.display_name}</span>
    </>
  );

  if (liveId) {
    return (
      <Link href={`/live/${liveId}`} className="group flex w-20 flex-col items-center gap-2" title={`${a.display_name} an live`}>
        {circle}
      </Link>
    );
  }
  return hasStatus ? (
    <button type="button" onClick={onOpen} className="group flex w-20 flex-col items-center gap-2" title={`Wè stati ${a.display_name}`}>
      {circle}
    </button>
  ) : (
    <Link href={`/atis/${a.artist_id}`} className="group flex w-20 flex-col items-center gap-2" title={a.display_name}>
      {circle}
    </Link>
  );
}
