import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { CloseMonthButton } from "@/components/admin/CloseMonthButton";
import { formatHTG } from "@/lib/donations";
import { currentMonthIso, monthLabel, monthParam } from "@/lib/accounting";

export const metadata: Metadata = { title: "Admin: Relve mwa yo | UpMizik" };
export const dynamic = "force-dynamic";

type MonthSummary = {
  month: string;
  is_closed: boolean;
  closed_at: string | null;
  artists: number;
  donations_count: number;
  gross_htg: number;
  platform_htg: number;
  artists_net_htg: number;
  featuring_htg: number;
  collaborators_htg: number;
  fee_htg: number;
  paid_htg: number;
  live_gross_htg: number;
  live_htg: number;
};

export default async function AdminMonthlyReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data, error } = await supabase.rpc("admin_months");
  const current = currentMonthIso();
  const months = ((data ?? []) as MonthSummary[]).map((m) => ({
    ...m,
    donations_count: Number(m.donations_count),
    gross_htg: Number(m.gross_htg),
    platform_htg: Number(m.platform_htg),
    artists_net_htg: Number(m.artists_net_htg),
    collaborators_htg: Number(m.collaborators_htg),
    fee_htg: Number(m.fee_htg),
    paid_htg: Number(m.paid_htg),
    live_gross_htg: Number(m.live_gross_htg ?? 0),
    live_htg: Number(m.live_htg ?? 0),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminTabs />
      <Link href="/admin/kont" className="text-sm text-zinc-400 hover:text-white">
        ← Kont atis yo
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">🗂️ Relve mwa yo</h1>
      <p className="mt-1 text-zinc-400">
        Achiv chak mwa. Lè yon mwa fini, peze <strong className="text-zinc-200">🔒 Fèmen mwa a</strong>: chif yo vin jele pou toutan, kidonk ou ka
        toujou tounen wè egzakteman sa ki te fèt.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Relve yo pa chaje: {error.message}</p>
      ) : months.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Poko gen aktivite.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {months.map((m) => {
            const isCurrent = m.month === current;
            return (
              <li key={m.month} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/relve/${monthParam(m.month)}`} className="text-lg font-bold capitalize text-white hover:underline">
                      {monthLabel(m.month)}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {m.is_closed ? (
                        <>🔒 Fèmen {m.closed_at && new Date(m.closed_at).toLocaleDateString("fr-HT", { dateStyle: "medium" })} · chif yo jele</>
                      ) : isCurrent ? (
                        "🟢 Mwa kounye a: chif yo ap chanje toujou"
                      ) : (
                        "🟡 Mwa a fini, men li poko fèmen"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!m.is_closed && !isCurrent && <CloseMonthButton month={m.month} label={monthLabel(m.month)} />}
                    <Link href={`/admin/relve/${monthParam(m.month)}`} className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white">
                      Wè detay →
                    </Link>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                  <div>
                    <dt className="text-xs text-zinc-500">💝 Don ({m.donations_count})</dt>
                    <dd className="font-semibold tabular-nums text-white">{formatHTG(m.gross_htg)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">🔴 Kado live</dt>
                    <dd className="font-semibold tabular-nums text-white">{formatHTG(m.live_gross_htg)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">🏢 UpMizik (15% + live + frè)</dt>
                    <dd className="font-semibold tabular-nums text-citron-300">
                      {formatHTG(m.platform_htg + m.fee_htg + Math.max(0, m.live_gross_htg - m.live_htg))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">🎤 Pou atis yo ({m.artists})</dt>
                    <dd className="font-semibold tabular-nums text-white">{formatHTG(m.artists_net_htg)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">💸 Peye pandan mwa a</dt>
                    <dd className="font-semibold tabular-nums text-white">{formatHTG(m.paid_htg)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
