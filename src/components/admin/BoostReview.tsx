"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reviewBoost } from "@/app/boost/actions";
import { DONATION_METHODS, formatHTG } from "@/lib/donations";
import type { BoostStatus, BoostType } from "@/lib/boost";

export type AdminBoostRequest = {
  id: string;
  artistId: string;
  artistName: string;
  type: BoostType;
  targetId: string;
  targetLabel: string;
  targetImage: string | null;
  amount: number;
  days: number;
  method: "moncash" | "natcash";
  transactionRef: string | null;
  proofUrl: string | null;
  status: BoostStatus;
  adminNote: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const date = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short" });

export function BoostReview({ requests }: { requests: AdminBoostRequest[] }) {
  if (requests.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen anyen isit la pou kounye a.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {requests.map((r) => (
        <BoostCard key={r.id} r={r} />
      ))}
    </ul>
  );
}

function BoostCard({ r }: { r: AdminBoostRequest }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function act(approve: boolean) {
    const msg = approve
      ? `Aktive boost ${r.targetLabel} pou ${r.days} jou? Li ap parèt an premye sou sit la depi kounye a.`
      : `Refize demann boost ${r.artistName}?`;
    if (!confirm(msg)) return;
    setError(undefined);
    startTransition(async () => {
      const res = await reviewBoost(r.id, approve, note);
      if (res.error) setError(res.error);
    });
  }

  return (
    <li className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      {r.proofUrl ? (
        <a href={r.proofUrl} target="_blank" rel="noopener noreferrer" className="block h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-950" title="Wè prèv la">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.proofUrl} alt="Prèv peman" className="h-full w-full object-cover" />
        </a>
      ) : (
        <span className="flex h-40 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-xs text-zinc-500">Pa gen foto</span>
      )}
      <div className="min-w-0 flex-1 space-y-1.5 text-sm">
        <Link href={`/atis/${r.artistId}`} className="block truncate font-bold text-white hover:underline">
          {r.artistName}
        </Link>
        {/* Sa l vle boost la */}
        <Link
          href={r.type === "mizik" ? `/chante/${r.targetId}` : `/atis/${r.targetId}`}
          className="flex items-center gap-2 rounded-xl bg-zinc-950/70 p-1.5 pr-2.5 hover:bg-zinc-950"
        >
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
            {r.targetImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.targetImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center">{r.type === "mizik" ? "🎵" : "👤"}</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-300">{r.type === "mizik" ? "Boost mizik" : "Boost pwofil"}</span>
            <span className="block truncate text-white">{r.targetLabel}</span>
          </span>
        </Link>
        <p className="text-zinc-300">
          <span className="font-semibold text-white">{formatHTG(r.amount)}</span> · {r.days} jou · {DONATION_METHODS[r.method].label}
        </p>
        {r.transactionRef && <p className="truncate text-zinc-400">Tranzaksyon: {r.transactionRef}</p>}
        <p className="text-xs text-zinc-500">Voye {date(r.createdAt)}</p>
        {r.status === "active" && r.expiresAt && <p className="text-xs font-semibold text-orange-300">🔥 Aktif jiska {date(r.expiresAt)}</p>}
        {r.adminNote && <p className="rounded-lg bg-zinc-950 px-2 py-1 text-xs text-zinc-400">Nòt: {r.adminNote}</p>}

        {r.status === "pending" && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Mesaj pou atis la (opsyonèl, egz: rezon refi a)"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => act(true)}
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? "…" : "🔥 Aktive"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(false)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {pending ? "…" : "❌ Refize"}
              </button>
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </li>
  );
}
