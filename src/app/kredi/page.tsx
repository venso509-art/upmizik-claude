import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreditShop } from "@/components/credits/CreditShop";
import { formatHTG } from "@/lib/donations";
import { formatCredits } from "@/lib/credits";

export const metadata: Metadata = { title: "Kredi | UpMizik", description: "Achte kredi pou voye kado bay atis yo nan live yo." };

type Purchase = { id: string; credits: number; amount_htg: number; method: string; status: "pending" | "verified" | "rejected"; admin_note: string | null; created_at: string };
type Tx = { id: string; delta: number; balance_after: number; kind: string; note: string | null; created_at: string };

const STATUS = {
  pending: { label: "⏳ Ap tann validasyon", cls: "text-amber-300" },
  verified: { label: "✅ Kredi yo antre", cls: "text-emerald-300" },
  rejected: { label: "❌ Pa valide", cls: "text-red-300" },
} as const;

const when = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Port-au-Prince" });

// Paj kredi: bous moun nan, achte kredi (MonCash/NatCash), ak istwa yo. Koutè ak atis gen menm paj la.
export default async function CreditsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-5xl">🪙</p>
        <h1 className="mt-4 text-3xl font-extrabold text-white">Kredi UpMizik</h1>
        <p className="mt-2 text-zinc-400">Achte kredi pou voye kado (🌹 🦁 ✈️ 💎) bay atis yo pandan live yo.</p>
        <Link href="/konekte" className="btn-primary mt-6 inline-block rounded-full px-6 py-3">
          Konekte pou achte kredi
        </Link>
      </div>
    );
  }

  const [{ data: wallet }, { data: settingsRow }, { data: purchases }, { data: txs }] = await Promise.all([
    supabase.from("credit_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase.from("settings").select("credit_htg").eq("id", true).maybeSingle(),
    supabase
      .from("credit_purchases")
      .select("id, credits, amount_htg, method, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<Purchase[]>(),
    supabase.from("credit_transactions").select("id, delta, balance_after, kind, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).returns<Tx[]>(),
  ]);
  const balance = wallet?.balance ?? 0;
  const creditHtg = Number(settingsRow?.credit_htg ?? 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-widest text-citron-300">Kado live</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">🪙 Kredi mwen</h1>

      {/* Bous la */}
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-citron-400/40 bg-gradient-to-br from-citron-400/15 via-amber-500/10 to-transparent p-6">
        <div>
          <p className="text-sm text-zinc-300">Balans ou</p>
          <p className="text-4xl font-black text-white tabular-nums">{balance.toLocaleString("fr-HT")}</p>
          <p className="text-sm text-zinc-400">kredi · 1 kredi = {formatHTG(creditHtg)}</p>
        </div>
        <p className="max-w-xs text-sm text-zinc-300">Voye kado bay atis ou renmen yo pandan live yo: 🌹 Woz, 🦁 Lyon, ✈️ Avyon, 💎 Diaman…</p>
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
        <h2 className="mb-5 text-xl font-bold text-white">Achte kredi</h2>
        <CreditShop creditHtg={creditHtg} />
      </section>

      {(purchases ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Acha mwen yo</h2>
          <ul className="mt-3 space-y-2">
            {(purchases ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm">
                <span className="text-white">
                  🪙 {formatCredits(p.credits)} · {formatHTG(Number(p.amount_htg))}
                </span>
                <span className={STATUS[p.status].cls}>{STATUS[p.status].label}</span>
                <span className="w-full text-xs text-zinc-500">
                  {when(p.created_at)}
                  {p.status === "rejected" && p.admin_note ? ` · Rezon: ${p.admin_note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(txs ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Istwa kredi</h2>
          <ul className="mt-3 divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/40">
            {(txs ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-zinc-200">{t.kind === "topup" ? "🪙 Acha kredi" : t.kind === "gift" ? `🎁 Kado: ${t.note ?? ""}` : (t.note ?? t.kind)}</span>
                  <span className="text-xs text-zinc-500">{when(t.created_at)}</span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${t.delta > 0 ? "text-emerald-300" : "text-zinc-300"}`}>
                  {t.delta > 0 ? "+" : ""}
                  {t.delta.toLocaleString("fr-HT")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
