"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { decidePro, type ProDecision } from "@/app/pro/actions";
import { DONATION_METHODS, formatHTG, formatUSD } from "@/lib/donations";
import { isPro } from "@/lib/pro";

export type AdminProRequest = {
  id: string;
  artistId: string;
  artistName: string;
  proUntil: string | null;
  method: "moncash" | "natcash";
  transactionRef: string | null;
  proofUrl: string | null;
  amountUsd: number;
  amountHtg: number;
  months: number;
  status: "pending" | "active" | "rejected" | "revoked";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const date = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short" });

export function ProReview({ requests }: { requests: AdminProRequest[] }) {
  if (requests.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen anyen isit la pou kounye a.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {requests.map((r) => (
        <ProCard key={r.id} r={r} />
      ))}
    </ul>
  );
}

function ProCard({ r }: { r: AdminProRequest }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const CONFIRM: Record<ProDecision, string> = {
    approve: `Apwouve peman an? ${r.artistName} ap vin Pro pou ${r.months} mwa.`,
    reject: `Rejte demann Pro ${r.artistName}?`,
    revoke: `Retire pwofil Pro ${r.artistName}?`,
  };

  function act(action: ProDecision) {
    if (!confirm(CONFIRM[action])) return;
    setError(undefined);
    startTransition(async () => {
      const res = await decidePro(r.id, action, note);
      if (res.error) setError(res.error);
    });
  }

  return (
    <li className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      {r.proofUrl ? (
        <a href={r.proofUrl} target="_blank" rel="noopener noreferrer" className="block h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-950" title="Wè prèv la">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.proofUrl} alt="Prèv peman" className="h-full w-full object-cover" />
        </a>
      ) : (
        <span className="flex h-36 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-xs text-zinc-500">Pa gen foto</span>
      )}
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <Link href={`/atis/${r.artistId}`} className="block truncate font-bold text-white hover:underline">
          {r.artistName}
        </Link>
        <p className="text-zinc-300">
          {formatUSD(r.amountUsd)} = <span className="font-semibold text-white">{formatHTG(r.amountHtg)}</span> · {DONATION_METHODS[r.method].label}
        </p>
        {r.transactionRef && <p className="truncate text-zinc-400">Tranzaksyon: {r.transactionRef}</p>}
        <p className="text-xs text-zinc-500">Voye {date(r.createdAt)} · {r.months} mwa</p>
        <p className="text-xs text-zinc-500">
          {isPro(r.proUntil) ? `⭐ Pro jiska ${new Date(r.proUntil!).toLocaleDateString("fr-HT")}` : "Pa Pro kounye a"}
        </p>
        {r.adminNote && <p className="rounded-lg bg-zinc-950 px-2 py-1 text-xs text-zinc-400">Nòt: {r.adminNote}</p>}

        {r.status !== "rejected" && r.status !== "revoked" && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={r.status === "pending" ? "Mesaj pou atis la (opsyonèl, egz: rezon rejè a)" : "Rezon (opsyonèl, atis la ap wè l)"}
            className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-citron-400"
          />
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {r.status !== "active" && (
            <button type="button" disabled={pending} onClick={() => act("approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
              {pending ? "…" : r.status === "pending" ? "✅ Apwouve" : "✅ Apwouve kanmenm"}
            </button>
          )}
          {r.status === "pending" && (
            <button type="button" disabled={pending} onClick={() => act("reject")} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
              {pending ? "…" : "❌ Rejte"}
            </button>
          )}
          {r.status === "active" && (
            <button type="button" disabled={pending} onClick={() => act("revoke")} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
              {pending ? "…" : "🚫 Retire Pro a"}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </li>
  );
}
