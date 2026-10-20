import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { formatHTG, type DonationMethod } from "@/lib/donations";
import type { PayoutStatus } from "@/lib/finance";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PayoutReview, type AdminPayout } from "@/components/admin/PayoutReview";
import { CollaboratorDues, type CollaboratorDue } from "@/components/admin/CollaboratorDues";

export const metadata: Metadata = { title: "Admin: Retrè | UpMizik" };

const TABS: { status: PayoutStatus; label: string }[] = [
  { status: "pending", label: "⏳ An atant" },
  { status: "paid", label: "✅ Peye" },
  { status: "rejected", label: "❌ Rejte" },
];

type Row = {
  id: string;
  artist_id: string;
  method: DonationMethod;
  phone: string;
  amount_htg: number;
  status: PayoutStatus;
  reference: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  artist: { display_name: string } | null;
};

type DueRow = {
  artist_id: string;
  artist_name: string;
  collaborator_name: string;
  collaborator_role: string | null;
  collaborator_phone: string | null;
  collaborator_method: DonationMethod | null;
  amount_htg: number;
  earning_count: number;
  oldest: string;
};

export default async function AdminPayoutsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";

  const [{ data: rows }, ...counts] = await Promise.all([
    supabase
      .from("payouts")
      .select("id, artist_id, method, phone, amount_htg, status, reference, admin_note, created_at, processed_at, artist:profiles!payouts_artist_id_fkey(display_name)")
      .eq("status", status)
      // An atant: pi ansyen an premye (premye vini, premye sèvi). Lòt yo: pi resan an premye.
      .order(status === "pending" ? "created_at" : "processed_at", { ascending: status === "pending" })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const payouts: AdminPayout[] = (rows ?? []).map((r) => ({
    id: r.id,
    artistId: r.artist_id,
    artistName: r.artist?.display_name ?? "Atis enkoni",
    method: r.method,
    phone: r.phone,
    amountHtg: Number(r.amount_htg),
    status: r.status,
    reference: r.reference,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    processedAt: r.processed_at,
  }));
  const total = payouts.reduce((sum, p) => sum + p.amountHtg, 0);

  // Sa UpMizik dwe kolaboratè yo (splits), pou mwa ki fini yo
  const { data: dueRows } = await supabase.rpc("admin_collaborator_dues");
  const dues: CollaboratorDue[] = ((dueRows ?? []) as DueRow[]).map((r) => ({
    artistId: r.artist_id,
    artistName: r.artist_name,
    name: r.collaborator_name,
    role: r.collaborator_role,
    phone: r.collaborator_phone,
    method: r.collaborator_method,
    amountHtg: Number(r.amount_htg),
    count: Number(r.earning_count),
    oldest: r.oldest,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">💸 Peman & Retrè atis yo</h1>
      <p className="mt-1 text-zinc-400">Voye lajan an sou MonCash/NatCash atis la, epi make retrè a kòm peye ak referans transfè a.</p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/retre?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === t.status ? "bg-fuchsia-500 font-semibold text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      {payouts.length > 0 && (
        <p className="mt-5 text-sm text-zinc-400">
          Total: <span className="font-semibold text-white">{formatHTG(total)}</span> ({payouts.length} retrè)
        </p>
      )}

      <div className="mt-5">
        <PayoutReview payouts={payouts} />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white">🤝 Peye kolaboratè yo</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pa kolaboratè yo (splits) sou don mwa ki fini yo. Voye lajan an sou nimewo yo, epi make l kòm peye ak referans lan.
        </p>
        <div className="mt-5">
          <CollaboratorDues dues={dues} />
        </div>
      </section>
    </div>
  );
}
