"use client";

import { useState, useTransition } from "react";
import { reviewCreditPurchase } from "@/app/admin/kredi/actions";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";

export type AdminCreditPurchase = {
  id: string;
  userName: string;
  credits: number;
  amountHtg: number;
  method: DonationMethod;
  transactionRef: string | null;
  proofUrl: string | null;
  status: "pending" | "verified" | "rejected";
  adminNote: string | null;
  createdAt: string;
};

const when = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Port-au-Prince" });

export function CreditPurchaseReview({ purchases }: { purchases: AdminCreditPurchase[] }) {
  if (purchases.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Pa gen anyen isit la pou kounye a.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {purchases.map((p) => (
        <Card key={p.id} p={p} />
      ))}
    </ul>
  );
}

function Card({ p }: { p: AdminCreditPurchase }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function act(approve: boolean) {
    if (approve && !confirm(`Valide ${p.credits} kredi pou ${p.userName}?`)) return;
    if (!approve && !note.trim()) return setError("Ekri rezon an anvan w rejte l.");
    setError(undefined);
    startTransition(async () => {
      const res = await reviewCreditPurchase(p.id, approve, note);
      if (res.error) setError(res.error);
    });
  }

  return (
    <li className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      {p.proofUrl ? (
        <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="block h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-950" title="Wè prèv la">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.proofUrl} alt="Prèv peman" className="h-full w-full object-cover" />
        </a>
      ) : (
        <span className="flex h-36 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-xs text-zinc-500">Pa gen foto</span>
      )}
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="truncate font-bold text-white">{p.userName}</p>
        <p className="text-zinc-300">
          🪙 <span className="font-semibold text-white">{p.credits.toLocaleString("fr-HT")} kredi</span> = {formatHTG(p.amountHtg)} · {DONATION_METHODS[p.method].label}
        </p>
        {p.transactionRef && <p className="truncate text-zinc-400">Tranzaksyon: {p.transactionRef}</p>}
        <p className="text-xs text-zinc-500">{when(p.createdAt)}</p>
        {p.adminNote && <p className="rounded-lg bg-zinc-950 px-2 py-1 text-xs text-zinc-400">Nòt: {p.adminNote}</p>}
        {p.status === "pending" && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Rezon (si w rejte l)"
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-citron-400"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={pending} onClick={() => act(true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
                {pending ? "…" : "✅ Valide"}
              </button>
              <button type="button" disabled={pending} onClick={() => act(false)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                {pending ? "…" : "❌ Rejte"}
              </button>
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </li>
  );
}
