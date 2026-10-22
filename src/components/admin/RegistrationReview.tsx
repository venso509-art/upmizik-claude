"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reviewRegistration } from "@/app/admin/enskripsyon/actions";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { formatDate } from "@/lib/finance";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { Portal } from "@/components/Portal";
import { ArtistContactBox } from "./ArtistContactBox";
import { ReasonChips } from "./SendMessageBox";
import { REJECT_REASONS, registrationApprovedTemplates, registrationRejectedTemplates } from "@/lib/adminTemplates";
import { messageForStatus } from "@/lib/artistMessages";

export type AdminRegistration = {
  id: string;
  artistId: string;
  artistName: string;
  email: string | null;
  phone: string | null;
  method: DonationMethod;
  amountUsd: number;
  amountHtg: number;
  transactionRef: string | null;
  status: "pending" | "verified" | "rejected";
  adminNote: string | null;
  createdAt: string;
  proofUrl: string | null;
};

const BADGE = {
  pending: { label: "⏳ Ap tann", cls: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  verified: { label: "✅ Apwouve", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  rejected: { label: "❌ Rejte", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
};

// Desizyon admin nan sot pran: pou n louvri pop-up mesaj la (WhatsApp/imèl)
type FollowUp = { r: AdminRegistration; decision: "verified" | "rejected"; reason: string | null };

function RegistrationCard({ r, onReviewed }: { r: AdminRegistration; onReviewed: (f: FollowUp) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(approve: boolean) {
    startTransition(async () => {
      const res = await reviewRegistration(r.id, approve, note);
      setError(res.error);
      if (!res.error) onReviewed({ r, decision: approve ? "verified" : "rejected", reason: approve ? null : note.trim() });
    });
  }

  return (
    <li className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:grid-cols-[10rem_1fr]">
      <button type="button" onClick={() => r.proofUrl && setZoom(true)} className="h-40 overflow-hidden rounded-xl bg-zinc-950 sm:h-auto" aria-label="Wè prèv la an gwo">
        {r.proofUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.proofUrl} alt="Prèv peman" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-zinc-500">Pa gen foto</span>
        )}
      </button>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/atis/${r.artistId}`} className="text-lg font-bold text-white hover:underline">
              {r.artistName}
            </Link>
            {r.email && <p className="truncate text-sm text-zinc-500">{r.email}</p>}
          </div>
          <StatusBadge {...BADGE[r.status]} />
        </div>

        <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-zinc-500">Montan</dt>
          <dd className="text-white">
            {formatUSD(r.amountUsd)} · {formatHTG(r.amountHtg)}
          </dd>
          <dt className="text-zinc-500">Metòd</dt>
          <dd>
            <span className={`rounded-md bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${DONATION_METHODS[r.method].color}`}>
              {DONATION_METHODS[r.method].label}
            </span>
          </dd>
          <dt className="text-zinc-500">No. tranzaksyon</dt>
          <dd className="truncate text-zinc-300">{r.transactionRef ?? "—"}</dd>
          <dt className="text-zinc-500">Dat</dt>
          <dd className="text-zinc-300">{formatDate(r.createdAt)}</dd>
        </dl>

        {r.status === "rejected" && r.adminNote && <p className="text-sm text-red-300">Rezon: {r.adminNote}</p>}

        <FormMessage error={error} />

        {r.status === "pending" && !rejecting && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => run(true)}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? "Ap aktive..." : "✅ Approve epi aktive kont lan"}
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={pending}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-800 hover:text-red-300"
            >
              ❌ Reject
            </button>
          </div>
        )}

        {r.status === "pending" && rejecting && (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              autoFocus
              placeholder="Poukisa w rejte l? (egz: montan an pa kòrèk, foto a pa lizib...)"
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-zinc-500">Rezon tou pare (klike pou chwazi, ou ka modifye l apre):</p>
            <ReasonChips reasons={REJECT_REASONS.registration} onPick={setNote} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejecting(false)} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
                Anile
              </button>
              <button
                onClick={() => run(false)}
                disabled={pending || !note.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {pending ? "Ap sove..." : "Konfime rejè a"}
              </button>
            </div>
          </div>
        )}

        {/* Kontak manyèl: imèl, WhatsApp oswa mesaj sou sit la */}
        <div className="pt-1">
          <ArtistContactBox
            artistId={r.artistId}
            name={r.artistName}
            email={r.email}
            phone={r.phone}
            reason={r.adminNote}
            defaultBody={messageForStatus(r.status, r.artistName, r.adminNote)}
          />
        </div>
      </div>

      {zoom && r.proofUrl && (
        <Portal>
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.proofUrl} alt="Prèv peman" className="max-h-full max-w-full rounded-lg" />
        </div>
        </Portal>
      )}
    </li>
  );
}

// Pop-up apre yon desizyon: mesaj la deja ekri dapre chwa a, admin nan jis voye l sou WhatsApp oswa imèl
function FollowUpModal({ followUp, onClose }: { followUp: FollowUp; onClose: () => void }) {
  const { r, decision, reason } = followUp;
  const approved = decision === "verified";
  // Plizyè modèl pou desizyon sa a: remèsiman si l apwouve, rezon an si l rejte
  const followTemplates = approved ? registrationApprovedTemplates(r.artistName) : registrationRejectedTemplates(r.artistName, reason);
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`px-6 py-5 ${approved ? "bg-gradient-to-br from-emerald-600 to-emerald-800" : "bg-gradient-to-br from-red-600 to-red-800"}`}>
            <p className="text-3xl">{approved ? "✅" : "❌"}</p>
            <h2 className="mt-1 text-xl font-extrabold text-white">
              {approved ? `Kont ${r.artistName} apwouve!` : `Prèv ${r.artistName} rejte`}
            </h2>
            <p className="mt-1 text-sm text-white/80">🔔 Mesaj la deja voye otomatikman nan bwat mesaj atis la sou sit la.</p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-zinc-300">Voye l tou sou WhatsApp oswa imèl, pou atis la wè l touswit:</p>
            <ArtistContactBox
              artistId={r.artistId}
              name={r.artistName}
              email={r.email}
              phone={r.phone}
              reason={reason}
              defaultBody={followTemplates[0].text}
              templates={followTemplates}
              initiallyOpen
              showInApp={false}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function RegistrationReview({ registrations }: { registrations: AdminRegistration[] }) {
  // Kenbe desizyon an isit (pa nan kat la): apre l apwouve/rejte, kat la soti nan lis "Ap tann" lan
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);

  return (
    <>
      {registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 text-zinc-400">Pa gen enskripsyon nan kategori sa a.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {registrations.map((r) => (
            <RegistrationCard key={r.id} r={r} onReviewed={setFollowUp} />
          ))}
        </ul>
      )}
      {followUp && <FollowUpModal followUp={followUp} onClose={() => setFollowUp(null)} />}
    </>
  );
}
