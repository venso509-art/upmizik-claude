import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { formatHTG } from "@/lib/donations";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { RevenueReport } from "@/components/admin/RevenueReport";
import { PrintButton } from "@/components/admin/PrintButton";
import { EMPTY_EXTRAS, fullDate, summarize, type ArchivedReport } from "@/lib/revenue";

export const metadata: Metadata = { title: "Admin: Rapò achive | UpMizik" };
export const dynamic = "force-dynamic";

// Achiv rapò revni yo: chak reset kreye yon rapò jele (pa ka modifye ni efase).
// Klike sou yon rapò pou l dewoule epi montre tout detay yo jan yo te ye a.
export default async function ArchivedReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data, error } = await supabase
    .from("revenue_reports")
    .select("id, number, title, period_from, period_to, created_at, data")
    .order("number", { ascending: false })
    .returns<ArchivedReport[]>();
  const reports = data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />
      <Link href="/admin/achiv" className="text-sm text-zinc-400 hover:text-white">
        ← Achiv
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">📄 Rapò revni achive yo</h1>
      <p className="mt-1 text-zinc-400">
        Chak fwa ou fè <strong className="text-zinc-200">♻️ Reset</strong> nan Rapò, rapò a anrejistre isit la jan l te ye a. Li pa ka modifye ni efase:
        si gen yon erè, n ap wè l pou n ka diskite sou li.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          ⚠️ Achiv la poko pare: kouri migration <span className="font-mono">20261226000000_live_statements_report_archive.sql</span> nan Supabase.
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="text-5xl">🗄️</p>
          <p className="mt-4 font-semibold text-white">Poko gen rapò achive</p>
          <p className="mt-1 text-sm text-zinc-400">Premye rapò a ap parèt isit la lè w fè yon reset nan 📈 Rapò.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {reports.map((r, i) => {
            const rows = r.data?.rows ?? [];
            const extras = r.data?.extras ?? EMPTY_EXTRAS;
            const s = summarize(rows, extras);
            return (
              <li key={r.id} id={`r-${r.id}`} className="scroll-mt-24 motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                <details className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 open:border-citron-400/40">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-5 transition hover:bg-zinc-900/80 sm:p-6">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-citron-400/15 text-lg font-black text-citron-300">
                      #{r.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold text-white">{r.title}</span>
                      <span className="block text-xs text-zinc-400">
                        {fullDate(r.period_from)} → {fullDate(r.period_to)}
                      </span>
                    </span>
                    <span className="grid grid-cols-3 gap-4 text-right text-xs">
                      <span>
                        <span className="block text-zinc-500">Total</span>
                        <span className="font-black tabular-nums text-white">{formatHTG(Math.round(s.total))}</span>
                      </span>
                      <span>
                        <span className="block text-zinc-500">Sit la</span>
                        <span className="font-black tabular-nums text-citron-300">{formatHTG(Math.round(s.site))}</span>
                      </span>
                      <span>
                        <span className="block text-zinc-500">Pataje</span>
                        <span className="font-black tabular-nums text-emerald-300">{formatHTG(Math.round(s.shared))}</span>
                      </span>
                    </span>
                    <span className="text-zinc-400 transition-transform group-open:rotate-180" aria-hidden>
                      ▾
                    </span>
                  </summary>
                  <div className="border-t border-zinc-800 p-5 sm:p-6">
                    <div className="mb-4 flex justify-end print:hidden">
                      <PrintButton />
                    </div>
                    <RevenueReport
                      rows={rows}
                      extras={extras}
                      rangeLabel={`${fullDate(r.period_from)} → ${fullDate(r.period_to)}`}
                      fileTag={`rapo-${r.number}`}
                      frozen={{ number: r.number, title: r.title, savedAt: fullDate(r.created_at) }}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
