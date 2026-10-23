import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ProReview, type AdminProRequest } from "@/components/admin/ProReview";

export const metadata: Metadata = { title: "Admin: Pro | UpMizik" };

const TABS = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "active", label: "⭐ Aktif" },
  { status: "rejected", label: "❌ Rejte" },
  { status: "revoked", label: "🚫 Retire" },
] as const;

type Row = {
  id: string;
  artist_id: string;
  method: "moncash" | "natcash";
  transaction_ref: string | null;
  proof_path: string;
  amount_usd: number;
  amount_htg: number;
  months: number;
  status: AdminProRequest["status"];
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  artist: { display_name: string; pro_until: string | null } | { display_name: string; pro_until: string | null }[] | null;
};

// Atis yo voye prèv peman Pro a; yo vin Pro SÈLMAN lè admin apwouve demann nan isit la
export default async function AdminProPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";
  const [{ data, error }, ...counts] = await Promise.all([
    supabase
      .from("pro_requests")
      .select(
        "id, artist_id, method, transaction_ref, proof_path, amount_usd, amount_htg, months, status, admin_note, created_at, reviewed_at, artist:profiles!pro_requests_artist_id_fkey(display_name, pro_until)",
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("pro_requests").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const rows = data ?? [];
  const { data: signed } = rows.length
    ? await supabase.storage.from("donation-proofs").createSignedUrls(rows.map((r) => r.proof_path), 3600)
    : { data: [] };
  const proofUrls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const requests: AdminProRequest[] = rows.map((r) => {
    const a = Array.isArray(r.artist) ? r.artist[0] : r.artist;
    return {
      id: r.id,
      artistId: r.artist_id,
      artistName: a?.display_name ?? "Atis",
      proUntil: a?.pro_until ?? null,
      method: r.method,
      transactionRef: r.transaction_ref,
      proofUrl: proofUrls.get(r.proof_path) ?? null,
      amountUsd: Number(r.amount_usd),
      amountHtg: Number(r.amount_htg),
      months: r.months,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">⭐ Atis Pro yo</h1>
      <p className="mt-1 text-zinc-400">
        Verifye prèv peman an (montan, non, nimewo tranzaksyon) anvan w apwouve. Badj PRO a parèt sou pwofil atis la sèlman apre w apwouve l.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/pro?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === t.status ? "bg-citron-400 font-semibold text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Paj la pa ka chaje demann Pro yo. Kouri migration 20261130000000_pro_profiles.sql nan Supabase.
        </p>
      ) : (
        <div className="mt-6">
          <ProReview requests={requests} />
        </div>
      )}
    </div>
  );
}
