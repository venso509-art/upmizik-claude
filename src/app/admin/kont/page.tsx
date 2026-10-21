import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatHTG } from "@/lib/donations";
import { currentMonthIso, monthLabel } from "@/lib/accounting";

export const metadata: Metadata = { title: "Admin: Kont atis | UpMizik" };
export const dynamic = "force-dynamic";

type Row = {
  artist_id: string;
  display_name: string;
  avatar_url: string | null;
  status: "pending" | "approved" | "blocked";
  is_verified: boolean;
  songs: number;
  plays: number;
  month_gross_htg: number;
  month_net_htg: number;
  available_htg: number;
  pending_htg: number;
  paid_htg: number;
  eligible_from: string | null;
};

const STATUS: Record<Row["status"], string> = { pending: "⏳ An atant", approved: "", blocked: "⛔ Bloke" };

export default async function AdminArtistAccountsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data, error } = await supabase.rpc("admin_artist_accounts");
  const rows = ((data ?? []) as Row[]).map((r) => ({
    ...r,
    plays: Number(r.plays),
    month_gross_htg: Number(r.month_gross_htg),
    month_net_htg: Number(r.month_net_htg),
    available_htg: Number(r.available_htg),
    pending_htg: Number(r.pending_htg),
    paid_htg: Number(r.paid_htg),
  }));
  const totals = rows.reduce(
    (t, r) => ({ available: t.available + r.available_htg, pending: t.pending + r.pending_htg, month: t.month + r.month_gross_htg }),
    { available: 0, pending: 0, month: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">💼 Kont atis yo</h1>
          <p className="mt-1 text-zinc-400">Klike sou yon atis pou w wè chante li yo ak kalkil chak mwa.</p>
        </div>
        <Link href="/admin/relve" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-citron-400 hover:text-white">
          🗂️ Relve mwa yo (achiv) →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-citron-400/30 bg-citron-400/5 p-5">
          <p className="text-sm text-zinc-400">💵 Total disponib pou peye</p>
          <p className="mt-2 text-3xl font-extrabold text-citron-300">{formatHTG(totals.available)}</p>
          <p className="mt-1 text-xs text-zinc-500">Mwa ki fini yo, apre frè, mwens sa ki deja peye/mande</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">⏳ Retrè ki an atant</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{formatHTG(totals.pending)}</p>
          <Link href="/admin/retre" className="mt-1 inline-block text-xs text-fuchsia-300 hover:underline">
            Trete yo nan 💸 Retrè →
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-400">💝 Don mwa sa a ({monthLabel(currentMonthIso())})</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{formatHTG(totals.month)}</p>
          <p className="mt-1 text-xs text-zinc-500">Pa disponib toutotan mwa a pa fini</p>
        </div>
      </div>

      {error ? (
        <p className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Kont yo pa chaje: {error.message}</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((r) => (
            <li key={r.artist_id}>
              <Link
                href={`/admin/kont/${r.artist_id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-citron-400/40 hover:bg-zinc-900"
              >
                <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center font-bold text-white">{r.display_name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-white">
                    <span className="truncate">{r.display_name}</span>
                    {r.is_verified && <VerifiedBadge />}
                    {STATUS[r.status] && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">{STATUS[r.status]}</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    🎵 {r.songs} chante · 🎧 {r.plays.toLocaleString("fr-HT")} ekout · 💝 mwa sa a: {formatHTG(r.month_gross_htg)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-right sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-zinc-500">Disponib</p>
                    <p className={`font-bold tabular-nums ${r.available_htg > 0 ? "text-citron-300" : "text-zinc-400"}`}>{formatHTG(r.available_htg)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">An atant</p>
                    <p className="font-semibold tabular-nums text-zinc-300">{formatHTG(r.pending_htg)}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[11px] text-zinc-500">Deja peye</p>
                    <p className="font-semibold tabular-nums text-zinc-300">{formatHTG(r.paid_htg)}</p>
                  </div>
                </div>
                <span className="text-zinc-500" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
