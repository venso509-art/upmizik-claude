import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { DonationMethod } from "@/lib/donations";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { RegistrationReview, type AdminRegistration } from "@/components/admin/RegistrationReview";

export const metadata: Metadata = { title: "Admin: Enskripsyon | UpMizik" };

type Status = AdminRegistration["status"];

const TABS: { status: Status; label: string }[] = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "verified", label: "✅ Apwouve" },
  { status: "rejected", label: "❌ Rejte" },
];

type Row = {
  id: string;
  artist_id: string;
  method: DonationMethod;
  amount_usd: number;
  amount_htg: number;
  transaction_ref: string | null;
  proof_path: string;
  status: Status;
  admin_note: string | null;
  created_at: string;
  artist: { display_name: string } | null;
};

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";

  const [{ data: rows }, { data: users }, ...counts] = await Promise.all([
    supabase
      .from("artist_registrations")
      .select(
        "id, artist_id, method, amount_usd, amount_htg, transaction_ref, proof_path, status, admin_note, created_at, artist:profiles!artist_registrations_artist_id_fkey(display_name)",
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100)
      .returns<Row[]>(),
    supabase.rpc("admin_list_users"),
    ...TABS.map((t) => supabase.from("artist_registrations").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const list = rows ?? [];
  const emails = new Map(((users ?? []) as { id: string; email: string }[]).map((u) => [u.id, u.email]));

  // Lyen tanporè (1 è) pou wè foto prèv yo, paske bucket la prive
  const { data: signed } = list.length
    ? await supabase.storage.from("donation-proofs").createSignedUrls(list.map((r) => r.proof_path), 3600)
    : { data: [] };
  const proofUrls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const registrations: AdminRegistration[] = list.map((r) => ({
    id: r.id,
    artistId: r.artist_id,
    artistName: r.artist?.display_name ?? "Atis enkoni",
    email: emails.get(r.artist_id) ?? null,
    method: r.method,
    amountUsd: Number(r.amount_usd),
    amountHtg: Number(r.amount_htg),
    transactionRef: r.transaction_ref,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    proofUrl: proofUrls.get(r.proof_path) ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🎤 Enskripsyon atis yo</h1>
      <p className="mt-1 text-zinc-400">
        Verifye prèv peman frè enskripsyon an. Lè w apwouve, kont atis la aktive otomatikman e li ka pibliye mizik.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/enskripsyon?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === t.status ? "bg-fuchsia-500 font-semibold text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i].count ?? 0})</span>
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <RegistrationReview registrations={registrations} />
      </div>
    </div>
  );
}
