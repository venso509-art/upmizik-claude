import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { DayTopicsEditor, NewQuoteBox, QuoteList, type AdminQuote } from "@/components/admin/QuoteAdmin";
import { QUOTE_CATEGORIES } from "@/lib/dailyQuotes";

export const metadata: Metadata = { title: "Admin: Sitasyon | UpMizik" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

// Mesaj jounen an: sitasyon yo (ajoute, modifye, dezaktive, efase) + sijè chak jou
export default async function AdminQuotesPage({ searchParams }: { searchParams: { q?: string; kat?: string; paj?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const kat = QUOTE_CATEGORIES.some((c) => c.key === searchParams.kat) ? searchParams.kat! : "";
  const page = Math.max(1, Number(searchParams.paj) || 1);

  let query = supabase
    .from("daily_quotes")
    .select("id, teks, kategori, sous, active", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (q) query = query.ilike("teks", `%${q.replace(/[%_]/g, "")}%`);
  if (kat) query = query.eq("kategori", kat);

  const [{ data, count, error }, { data: topicRows }, ...catCounts] = await Promise.all([
    query.returns<AdminQuote[]>(),
    supabase.from("quote_day_topics").select("weekday, kategori"),
    ...QUOTE_CATEGORIES.map((c) => supabase.from("daily_quotes").select("id", { count: "exact", head: true }).eq("kategori", c.key).eq("active", true)),
  ]);
  const topics: (string | null)[] = Array.from({ length: 7 }, (_, d) => (topicRows ?? []).find((t) => t.weekday === d)?.kategori ?? null);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));
  const href = (p: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const all = { q, kat, ...p };
    for (const [k, v] of Object.entries(all)) if (v && !(k === "paj" && String(v) === "1")) sp.set(k, String(v));
    return `/admin/sitasyon${sp.size ? `?${sp}` : ""}`;
  };
  const activeTotal = catCounts.reduce((s, c) => s + (c.count ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminTabs />
      <h1 className="text-3xl font-extrabold tracking-tight text-white">💬 Sitasyon · Mesaj jounen an</h1>
      <p className="mt-1 text-zinc-400">
        Chak jou, chak atis resevwa yon kat ak yon sitasyon diferan nan espas li. {activeTotal.toLocaleString("fr-HT")} sitasyon aktif.
      </p>

      {error ? (
        <p className="mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          ⚠️ Sitasyon yo poko pare: kouri migration <span className="font-mono">20270101000000_daily_quotes.sql</span> ak{" "}
          <span className="font-mono">20270101000001_daily_quotes_seed.sql</span> nan Supabase.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          <DayTopicsEditor initial={topics} />
          <NewQuoteBox />

          {/* Filtè kategori + rechèch */}
          <div className="flex flex-wrap gap-2">
            <Link href={href({ kat: "", paj: 1 })} className={`rounded-full px-3 py-1.5 text-sm ${!kat ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
              Tout
            </Link>
            {QUOTE_CATEGORIES.map((c, i) => (
              <Link
                key={c.key}
                href={href({ kat: c.key, paj: 1 })}
                className={`rounded-full px-3 py-1.5 text-sm ${kat === c.key ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
              >
                {c.icon} {c.label} <span className="opacity-70">({catCounts[i].count ?? 0})</span>
              </Link>
            ))}
          </div>
          <form action="/admin/sitasyon" className="flex gap-2">
            {kat && <input type="hidden" name="kat" value={kat} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="🔍 Chache yon mo nan sitasyon yo…"
              className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-citron-400 focus:outline-none"
            />
            <button className="rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:text-white">Chache</button>
          </form>

          <p className="text-sm text-zinc-400">
            {(count ?? 0).toLocaleString("fr-HT")} sitasyon · paj {page}/{pages}
          </p>
          <QuoteList quotes={data ?? []} />

          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={href({ paj: page - 1 })} className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:text-white">
                  ← Anvan
                </Link>
              )}
              <span className="text-sm text-zinc-500">
                {page} / {pages}
              </span>
              {page < pages && (
                <Link href={href({ paj: page + 1 })} className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:text-white">
                  Apre →
                </Link>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
