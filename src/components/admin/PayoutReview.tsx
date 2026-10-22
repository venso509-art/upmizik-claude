"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markPayoutPaid, rejectPayout } from "@/app/admin/retre/actions";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { PAYOUT_BADGE, formatDate, type PayoutStatus } from "@/lib/finance";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { REJECT_REASONS, payoutPaidTemplates, payoutRejectedTemplates } from "@/lib/adminTemplates";
import { ReasonChips, SendMessageBox } from "./SendMessageBox";

export type AdminPayout = {
  id: string;
  artistId: string;
  artistName: string;
  method: DonationMethod;
  phone: string;
  amountHtg: number;
  status: PayoutStatus;
  reference: string | null;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
};

function PayoutCard({ p }: { p: AdminPayout }) {
  const [mode, setMode] = useState<"idle" | "pay" | "reject">("idle");
  const [messaging, setMessaging] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = mode === "pay" ? await markPayoutPaid(p.id, text) : await rejectPayout(p.id, text);
      setError(res.error);
      if (!res.error) setMode("idle");
    });
  }

  async function copyPhone() {
    await navigator.clipboard.writeText(p.phone.replace(/\D/g, ""));
  }

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-white">{formatHTG(p.amountHtg)}</p>
          <p className="mt-1 text-sm text-zinc-400">
            pou{" "}
            <Link href={`/atis/${p.artistId}`} className="font-semibold text-white hover:underline">
              {p.artistName}
            </Link>{" "}
            · {formatDate(p.createdAt)}
          </p>
        </div>
        <StatusBadge {...PAYOUT_BADGE[p.status]} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-950 px-4 py-3">
        <span className={`rounded-md bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${DONATION_METHODS[p.method].color}`}>
          {DONATION_METHODS[p.method].label}
        </span>
        <span className="text-lg font-bold tracking-wider text-white tabular-nums">{p.phone}</span>
        {p.status === "pending" && (
          <button onClick={copyPhone} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
            Kopye
          </button>
        )}
      </div>

      {p.status === "paid" && p.reference && <p className="mt-3 text-sm text-emerald-300">Referans: {p.reference}</p>}
      {p.status === "rejected" && p.adminNote && <p className="mt-3 text-sm text-red-300">Rezon: {p.adminNote}</p>}

      {p.status === "pending" && mode === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setMode("pay");
              setText("");
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            ✅ Make kòm Peye
          </button>
          <button
            onClick={() => {
              setMode("reject");
              setText("");
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-red-300"
          >
            ❌ Rejte
          </button>
        </div>
      )}

      {mode !== "idle" && (
        <div className="mt-4 space-y-3">
          {mode === "pay" ? (
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={100}
              placeholder="Nimewo referans transfè a (egz: MC-123456789)"
              className={inputClass}
              autoFocus
            />
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Poukisa w rejte retrè a? (atis la ap wè rezon sa a)"
              className={`${inputClass} resize-none`}
              autoFocus
            />
          )}
          {mode === "reject" && <ReasonChips reasons={REJECT_REASONS.payout} onPick={setText} />}
          <FormMessage error={error} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setMode("idle")} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
              Anile
            </button>
            <button
              onClick={submit}
              disabled={pending || !text.trim()}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                mode === "pay" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {pending ? "Ap sove..." : mode === "pay" ? "Konfime peman an" : "Konfime rejè a"}
            </button>
          </div>
        </div>
      )}

      {/* Apre desizyon an: voye yon mesaj bay atis la (resi peman an oswa rezon refi a) */}
      {p.status !== "pending" && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setMessaging((v) => !v)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white"
          >
            {p.status === "paid" ? "💬 Voye resi a bay atis la" : "✉️ Voye rezon an bay atis la"}
          </button>
          {messaging && (
            <SendMessageBox
              title={p.status === "paid" ? "💸 Mesaj peman" : "❌ Mesaj refi"}
              templates={
                p.status === "paid"
                  ? payoutPaidTemplates({ artistName: p.artistName, amountHtg: p.amountHtg, method: DONATION_METHODS[p.method].label, reference: p.reference })
                  : payoutRejectedTemplates({ artistName: p.artistName, amountHtg: p.amountHtg, method: DONATION_METHODS[p.method].label }, p.adminNote)
              }
              whatsapp={p.phone}
              subject="UpMizik: retrè ou a"
            />
          )}
        </div>
      )}
    </li>
  );
}

export function PayoutReview({ payouts }: { payouts: AdminPayout[] }) {
  if (payouts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
        <p className="text-4xl">📭</p>
        <p className="mt-3 text-zinc-400">Pa gen retrè nan kategori sa a.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {payouts.map((p) => (
        <PayoutCard key={p.id} p={p} />
      ))}
    </ul>
  );
}
