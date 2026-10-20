"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markPlaqueShipped, setVerified } from "@/app/admin/nivo/actions";
import { formatPlays, levelName, progressFor } from "@/lib/levels";
import { formatDate } from "@/lib/finance";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export type AdminArtistLevel = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  status: string;
  donationsUsd: number;
  plays: number;
};

export type PlaqueItem = { eventId: string; artistId: string; artistName: string; threshold: number; reachedAt: string };

function VerifyToggle({ a }: { a: AdminArtistLevel }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        onClick={() => startTransition(async () => setError((await setVerified(a.id, !a.verified)).error))}
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          a.verified ? "border border-zinc-700 text-zinc-300 hover:border-red-800 hover:text-red-300" : "bg-sky-600 text-white hover:bg-sky-500"
        }`}
      >
        {pending ? "..." : a.verified ? "Retire ✓" : "✓ Verifye"}
      </button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function ArtistLevelsTable({ artists }: { artists: AdminArtistLevel[] }) {
  const [onlyQualified, setOnlyQualified] = useState(false);
  const shown = onlyQualified ? artists.filter((a) => a.plays >= 500 && !a.verified) : artists;

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={onlyQualified} onChange={(e) => setOnlyQualified(e.target.checked)} className="accent-fuchsia-500" />
        Montre sèlman atis ki kalifye pou ✓ (500+ ekout, poko verifye)
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="py-2 pr-3 font-medium">Atis</th>
              <th className="py-2 pr-3 font-medium">🎧 Nivo ekout</th>
              <th className="py-2 pr-3 font-medium">💝 Nivo don</th>
              <th className="py-2 text-right font-medium">Badj ✓</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {shown.map((a) => {
              const p = progressFor("plays", a.plays);
              const d = progressFor("donations", a.donationsUsd);
              return (
                <tr key={a.id}>
                  <td className="py-3 pr-3">
                    <Link href={`/atis/${a.id}`} className="font-semibold text-white hover:underline">
                      {a.name}
                    </Link>
                    {a.verified && <VerifiedBadge />}
                    {!a.verified && a.plays >= 500 && (
                      <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">🎯 Kalifye</span>
                    )}
                    {a.status !== "approved" && <span className="ml-2 text-xs text-zinc-500">({a.status})</span>}
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-white">
                      {p.current.emoji} {p.current.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatPlays(a.plays)} ekout{p.next ? ` · ${Math.round(p.progress * 100)}% → ${p.next.name}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="text-white">
                      {d.current.emoji} {d.current.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      ${a.donationsUsd.toLocaleString("en-US")}
                      {d.next ? ` · ${Math.round(d.progress * 100)}% → ${d.next.name}` : ""}
                    </p>
                  </td>
                  <td className="py-3 text-right">
                    <VerifyToggle a={a} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Pa gen atis nan lis sa a.</p>}
      </div>
    </div>
  );
}

function PlaqueCard({ p }: { p: PlaqueItem }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
      <p className="text-lg font-bold text-white">{levelName("plays", p.threshold)}</p>
      <p className="text-sm text-zinc-300">
        <Link href={`/atis/${p.artistId}`} className="font-semibold hover:underline">
          {p.artistName}
        </Link>{" "}
        · {formatPlays(p.threshold)} ekout · le {formatDate(p.reachedAt)}
      </p>
      <FormMessage error={error} />
      {open ? (
        <div className="mt-3 space-y-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            autoFocus
            placeholder="Nòt pou atis la (egz: nimewo swivi kolis la)"
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
              Anile
            </button>
            <button
              onClick={() => startTransition(async () => setError((await markPlaqueShipped(p.eventId, note)).error))}
              disabled={pending}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {pending ? "Ap sove..." : "Konfime"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 transition hover:bg-amber-400">
          📦 Make plak la voye
        </button>
      )}
    </li>
  );
}

export function PlaqueQueue({ items }: { items: PlaqueItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">Pa gen plak pou voye kounye a.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((p) => (
        <PlaqueCard key={p.eventId} p={p} />
      ))}
    </ul>
  );
}
