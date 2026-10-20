"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markCollaboratorPaid } from "@/app/admin/retre/actions";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { formatDate } from "@/lib/finance";
import { FormMessage, inputClass } from "@/components/auth/ui";

export type CollaboratorDue = {
  artistId: string;
  artistName: string;
  name: string;
  role: string | null;
  phone: string | null;
  method: DonationMethod | null;
  amountHtg: number;
  count: number;
  oldest: string;
};

function DueCard({ d }: { d: CollaboratorDue }) {
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await markCollaboratorPaid(d.artistId, d.name, d.phone, reference);
      setError(res.error);
      if (!res.error) setPaying(false);
    });
  }

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <p className="text-2xl font-extrabold text-white">{formatHTG(d.amountHtg)}</p>
      <p className="mt-1 text-sm text-zinc-400">
        <span className="font-semibold text-white">{d.name}</span>
        {d.role && ` (${d.role})`} · kolaboratè{" "}
        <Link href={`/atis/${d.artistId}`} className="text-zinc-300 hover:underline">
          {d.artistName}
        </Link>
      </p>
      <p className="text-xs text-zinc-500">
        {d.count} don · depi {formatDate(d.oldest)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-950 px-4 py-3">
        {d.method ? (
          <span className={`rounded-md bg-gradient-to-r px-2 py-0.5 text-xs font-bold text-white ${DONATION_METHODS[d.method].color}`}>
            {DONATION_METHODS[d.method].label}
          </span>
        ) : (
          <span className="text-xs text-amber-300">⚠️ Metòd pa presize</span>
        )}
        <span className="text-lg font-bold tracking-wider text-white tabular-nums">{d.phone ?? "Pa gen nimewo"}</span>
      </div>

      <FormMessage error={error} />

      {paying ? (
        <div className="mt-4 space-y-2">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={100}
            autoFocus
            placeholder="Nimewo referans transfè a"
            className={inputClass}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setPaying(false)} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
              Anile
            </button>
            <button
              onClick={submit}
              disabled={pending || !reference.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? "Ap sove..." : "Konfime peman an"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setPaying(true)}
          disabled={!d.phone}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
        >
          ✅ Make kòm peye
        </button>
      )}
    </li>
  );
}

export function CollaboratorDues({ dues }: { dues: CollaboratorDue[] }) {
  if (dues.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">UpMizik pa dwe okenn kolaboratè kounye a.</p>;
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {dues.map((d) => (
        <DueCard key={`${d.artistId}-${d.name}-${d.phone}`} d={d} />
      ))}
    </ul>
  );
}
