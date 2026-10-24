import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { CreditPurchaseReview, type AdminCreditPurchase } from "@/components/admin/CreditPurchaseReview";
import { formatHTG } from "@/lib/donations";

export const metadata: Metadata = { title: "Admin: Kredi | UpMizik" };

const TABS = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "verified", label: "✅ Valide" },
  { status: "rejected", label: "❌ Rejte" },
] as const;

type Row = {
  id: string;
  credits: number;
  amount_htg: number;
  method: AdminCreditPurchase["method"];
  transaction_ref: string | null;
  proof_path: string;
  status: AdminCreditPurchase["status"];
  admin_note: string | null;
  created_at: string;
  buyer: { display_name: string } | { display_name: string }[] | null;
};

// Acha kredi yo: verifye prèv la, epi valide l pou kredi yo antre nan bous moun nan
export default async function AdminCreditsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";
  const [{ data }, ...counts] = await Promise.all([
    supabase
      .from("credit_purchases")
      .select("id, credits, amount_htg, method, transaction_ref, proof_path, status, admin_note, created_at, buyer:profiles!credit_purchases_user_id_fkey(display_name)")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("credit_purchases").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const rows = data ?? [];
  const { data: signed } = rows.length ? await supabase.storage.from("donation-proofs").createSignedUrls(rows.map((r) => r.proof_path), 3600) : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const purchases: AdminCreditPurchase[] = rows.map((r) => {
    const b = Array.isArray(r.buyer) ? r.buyer[0] : r.buyer;
    return {
      id: r.id,
      userName: b?.display_name ?? "Moun",
      credits: r.credits,
      amountHtg: Number(r.amount_htg),
      method: r.method,
      transactionRef: r.transaction_ref,
      proofUrl: urls.get(r.proof_path) ?? null,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />
      <h1 className="text-3xl font-extrabold tracking-tight text-white">🪙 Acha kredi</h1>
      <p className="mt-1 text-zinc-400">Verifye montan an ak non an sou prèv la anvan w valide. Kredi yo antre nan bous moun nan touswit.</p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/kredi?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${status === t.status ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {status === "verified" && purchases.length > 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          Total sou paj sa a: <span className="font-semibold text-white">{formatHTG(purchases.reduce((s, p) => s + p.amountHtg, 0))}</span>
        </p>
      )}

      <div className="mt-6">
        <CreditPurchaseReview purchases={purchases} />
      </div>
    </div>
  );
}
