"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setUserStatus, type AccountStatus } from "@/app/admin/actions";
import { FormMessage } from "@/components/auth/ui";
import { VerifyToggle } from "@/components/admin/VerifyToggle";
import { DeleteAccountButton } from "@/components/admin/DeleteAccountButton";

export type AdminArtist = {
  id: string;
  displayName: string;
  email: string;
  status: AccountStatus;
  isAdmin: boolean;
  verified?: boolean;
  createdAt: string;
  songCount: number;
};

const STATUS_BADGE: Record<AccountStatus, { label: string; cls: string }> = {
  pending: { label: "⏳ Ap tann", cls: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  approved: { label: "✅ Apwouve", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  blocked: { label: "🚫 Bloke", cls: "bg-red-500/15 text-red-300 ring-red-500/30" },
};

const FILTERS: { key: AccountStatus | "all"; label: string }[] = [
  { key: "pending", label: "Ap tann" },
  { key: "approved", label: "Apwouve" },
  { key: "blocked", label: "Bloke" },
  { key: "all", label: "Tout" },
];

function Actions({ artist, currentUserId }: { artist: AdminArtist; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const isSelf = artist.id === currentUserId;

  function change(status: AccountStatus) {
    if (status === "blocked" && !confirm(`Bloke ${artist.displayName}? Li p ap ka pibliye mizik ankò.`)) return;
    startTransition(async () => setError((await setUserStatus(artist.id, status)).error));
  }

  const approve = (label: string) => (
    <button
      onClick={() => change("approved")}
      disabled={pending}
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
    >
      {label}
    </button>
  );
  const block = (
    <button
      onClick={() => change("blocked")}
      disabled={pending || isSelf}
      title={isSelf ? "Ou pa ka bloke pwòp kont ou" : undefined}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-800 hover:text-red-300 disabled:opacity-40"
    >
      🚫 Block
    </button>
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-end gap-2">
        {artist.status === "pending" && (
          <>
            {approve("✅ Approve")}
            {block}
          </>
        )}
        {artist.status === "approved" && block}
        {artist.status === "blocked" && approve("✅ Debloke")}
        {/* Siprime nèt (pa pou pwòp kont ou ni pou yon admin) */}
        {!isSelf && !artist.isAdmin && <DeleteAccountButton userId={artist.id} name={artist.displayName} />}
      </div>
      {error && <FormMessage error={error} />}
    </div>
  );
}

export function ArtistTable({ artists, currentUserId }: { artists: AdminArtist[]; currentUserId: string }) {
  const pendingCount = artists.filter((a) => a.status === "pending").length;
  const [filter, setFilter] = useState<AccountStatus | "all">(pendingCount > 0 ? "pending" : "all");
  const shown = filter === "all" ? artists : artists.filter((a) => a.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all" ? artists.length : artists.filter((a) => a.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                filter === f.key ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {f.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">
          Pa gen atis nan kategori sa a.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Atis</th>
                <th className="px-4 py-3 font-medium">Chante</th>
                <th className="px-4 py-3 font-medium">Enskri</th>
                <th className="px-4 py-3 font-medium">Estati</th>
                <th className="px-4 py-3 text-right font-medium">Aksyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {shown.map((a) => (
                <tr key={a.id} className="grid grid-cols-2 gap-2 p-4 md:table-row md:p-0">
                  <td className="col-span-2 md:px-4 md:py-3">
                    <Link href={`/atis/${a.id}`} className="font-semibold text-white hover:underline">
                      {a.displayName}
                    </Link>
                    {a.isAdmin && <span className="ml-2 text-xs text-amber-300">🛡️ admin</span>}
                    {a.status === "approved" && (
                      <span className="ml-2 inline-block align-middle">
                        <VerifyToggle artistId={a.id} name={a.displayName} verified={!!a.verified} />
                      </span>
                    )}
                    <p className="truncate text-xs text-zinc-500">{a.email}</p>
                  </td>
                  <td className="text-zinc-300 md:px-4 md:py-3">
                    <span className="md:hidden text-zinc-500">Chante: </span>
                    {a.songCount}
                  </td>
                  <td className="text-zinc-400 md:px-4 md:py-3">
                    {new Date(a.createdAt).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="md:px-4 md:py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_BADGE[a.status].cls}`}>
                      {STATUS_BADGE[a.status].label}
                    </span>
                  </td>
                  <td className="md:px-4 md:py-3">
                    <Actions artist={a} currentUserId={currentUserId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
