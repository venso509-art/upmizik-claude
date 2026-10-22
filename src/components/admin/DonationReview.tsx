"use client";

import { useState, useTransition } from "react";
import { markThanked, reviewDonation } from "@/app/admin/don/actions";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { REJECT_REASONS, donationRejectedTemplates, donationThanksTemplates } from "@/lib/adminTemplates";
import { ReasonChips, SendMessageBox } from "./SendMessageBox";
import { FormMessage } from "@/components/auth/ui";
import { Portal } from "@/components/Portal";

export type AdminDonation = {
  id: string;
  amountUsd: number;
  amountHtg: number;
  method: DonationMethod;
  donorName: string | null;
  contactType: "email" | "whatsapp";
  contactValue: string;
  message: string | null;
  status: "pending" | "verified" | "rejected";
  thankedAt: string | null;
  adminNote?: string | null;
  createdAt: string;
  artistName: string;
  songTitle: string | null;
  proofUrl: string | null;
};

function DonationCard({ d }: { d: AdminDonation }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [zoom, setZoom] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [messaging, setMessaging] = useState(false);
  const ctx = { donorName: d.donorName, amountUsd: d.amountUsd, amountHtg: d.amountHtg, artistName: d.artistName, songTitle: d.songTitle };

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await action();
      setError(res.error);
    });
  }

  return (
    <li className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:grid-cols-[9rem_1fr]">
      <button
        type="button"
        onClick={() => d.proofUrl && setZoom(true)}
        className="h-36 overflow-hidden rounded-xl bg-zinc-950 sm:h-auto"
        aria-label="Wè prèv la an gwo"
      >
        {d.proofUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.proofUrl} alt="Prèv tranzaksyon" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-zinc-500">Pa gen foto</span>
        )}
      </button>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-extrabold text-white">{formatUSD(d.amountUsd)}</span>
          <span className="text-fuchsia-300">{formatHTG(d.amountHtg)}</span>
          <span className={`rounded-md bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${DONATION_METHODS[d.method].color}`}>
            {DONATION_METHODS[d.method].label}
          </span>
        </div>

        <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-zinc-500">Pou atis</dt>
          <dd className="truncate text-white">{d.artistName}</dd>
          <dt className="text-zinc-500">Chante</dt>
          <dd className="truncate text-zinc-300">{d.songTitle ?? "—"}</dd>
          <dt className="text-zinc-500">Donatè</dt>
          <dd className="truncate text-zinc-300">{d.donorName ?? "Anonim"}</dd>
          <dt className="text-zinc-500">{d.contactType === "whatsapp" ? "WhatsApp" : "Imèl"}</dt>
          <dd className="truncate text-zinc-300">{d.contactValue}</dd>
          <dt className="text-zinc-500">Dat</dt>
          <dd className="text-zinc-300">
            {new Date(d.createdAt).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Port-au-Prince" })}
          </dd>
        </dl>

        {d.message && <p className="rounded-lg bg-zinc-950 px-3 py-2 text-sm italic text-zinc-300">« {d.message} »</p>}

        <FormMessage error={error} />

        <div className="flex flex-wrap gap-2 pt-1">
          {d.status === "pending" && !rejecting && (
            <>
              <button
                onClick={() => run(() => reviewDonation(d.id, "verified"))}
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                ✅ Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={pending}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-red-300 disabled:opacity-60"
              >
                ❌ Reject
              </button>
            </>
          )}

          {/* Rezon refi a (li sove, epi li antre nan mesaj pou donatè a) */}
          {d.status === "pending" && rejecting && (
            <div className="w-full space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder="Poukisa w rejte don sa a?"
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500"
              />
              <ReasonChips reasons={REJECT_REASONS.donation} onPick={setNote} />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejecting(false)} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
                  Anile
                </button>
                <button
                  onClick={() => run(() => reviewDonation(d.id, "rejected", note))}
                  disabled={pending || !note.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {pending ? "Ap sove..." : "Konfime rejè a"}
                </button>
              </div>
            </div>
          )}

          {d.status === "rejected" && (
            <>
              {d.adminNote && <p className="w-full text-sm text-red-300">Rezon: {d.adminNote}</p>}
              <button
                onClick={() => setMessaging((v) => !v)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:text-white"
              >
                ✉️ Voye rezon an bay donatè a
              </button>
            </>
          )}

          {d.status === "verified" && (
            <>
              <button
                onClick={() => setMessaging((v) => !v)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 ${
                  d.contactType === "whatsapp" ? "bg-[#25D366] text-zinc-950" : "bg-sky-600 text-white"
                }`}
              >
                {d.contactType === "whatsapp" ? "💬 Voye mèsi sou WhatsApp" : "✉️ Voye mèsi pa imèl"}
              </button>
              {d.thankedAt ? (
                <span className="self-center text-sm text-emerald-400">✓ Mèsi voye</span>
              ) : (
                <button
                  onClick={() => run(() => markThanked(d.id))}
                  disabled={pending}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:text-white disabled:opacity-60"
                >
                  Make mèsi a voye
                </button>
              )}
            </>
          )}
        </div>

        {/* Mesaj pou donatè a: mèsi (valide) oswa rezon an (rejte), ak plizyè modèl */}
        {messaging && d.status !== "pending" && (
          <SendMessageBox
            title={d.status === "verified" ? "🙏 Mesaj remèsiman" : "❌ Mesaj refi"}
            templates={d.status === "verified" ? donationThanksTemplates(ctx) : donationRejectedTemplates(ctx, d.adminNote ?? null)}
            whatsapp={d.contactType === "whatsapp" ? d.contactValue : null}
            email={d.contactType === "email" ? d.contactValue : null}
            subject={d.status === "verified" ? "Mèsi pou don ou an sou UpMizik 🙏" : "UpMizik: don ou an"}
            onSent={() => {
              if (d.status === "verified" && !d.thankedAt) run(() => markThanked(d.id));
            }}
          />
        )}
      </div>

      {zoom && d.proofUrl && (
        <Portal>
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.proofUrl} alt="Prèv tranzaksyon" className="max-h-full max-w-full rounded-lg" />
        </div>
        </Portal>
      )}
    </li>
  );
}

export function DonationReview({ donations }: { donations: AdminDonation[] }) {
  if (donations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
        <p className="text-4xl">📭</p>
        <p className="mt-3 text-zinc-400">Pa gen don nan kategori sa a.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {donations.map((d) => (
        <DonationCard key={d.id} d={d} />
      ))}
    </ul>
  );
}
