import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { DonationReview, type AdminDonation } from "@/components/admin/DonationReview";

export const metadata: Metadata = { title: "Admin: Don | UpMizik" };

const TABS = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "verified", label: "✅ Valide" },
  { status: "rejected", label: "❌ Rejte" },
] as const;
type Status = (typeof TABS)[number]["status"];

type Row = {
  id: string;
  amount_usd: number;
  amount_htg: number;
  method: DonationMethod;
  donor_name: string | null;
  contact_type: "email" | "whatsapp";
  contact_value: string;
  message: string | null;
  proof_path: string;
  status: Status;
  thanked_at: string | null;
  created_at: string;
  artist: { display_name: string } | null;
  song: { title: string } | null;
};

export default async function AdminDonationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status: Status = TABS.some((t) => t.status === searchParams.status) ? (searchParams.status as Status) : "pending";

  const [{ data: rows }, ...counts] = await Promise.all([
    supabase
      .from("donations")
      .select(
        "id, amount_usd, amount_htg, method, donor_name, contact_type, contact_value, message, proof_path, status, thanked_at, created_at, artist:profiles!donations_artist_id_fkey(display_name), song:songs(title)",
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("donations").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const list = rows ?? [];

  // Lyen tanporè (1 è) pou wè foto prèv yo, paske bucket la prive
  const { data: signed } = list.length
    ? await supabase.storage.from("donation-proofs").createSignedUrls(list.map((r) => r.proof_path), 3600)
    : { data: [] };
  const proofUrls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const donations: AdminDonation[] = list.map((r) => ({
    id: r.id,
    amountUsd: Number(r.amount_usd),
    amountHtg: Number(r.amount_htg),
    method: r.method,
    donorName: r.donor_name,
    contactType: r.contact_type,
    contactValue: r.contact_value,
    message: r.message,
    status: r.status,
    thankedAt: r.thanked_at,
    createdAt: r.created_at,
    artistName: r.artist?.display_name ?? "Atis enkoni",
    songTitle: r.song?.title ?? null,
    proofUrl: proofUrls.get(r.proof_path) ?? null,
  }));

  const verifiedTotal = status === "verified" ? donations.reduce((sum, d) => sum + d.amountUsd, 0) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">🛡️ Admin</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Don yo</h1>
      <p className="mt-1 text-zinc-400">Verifye prèv yo anvan w valide yon don.</p>

      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-zinc-800">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/don?status=${t.status}`}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              status === t.status ? "border-fuchsia-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t.label} <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs">{counts[i].count ?? 0}</span>
          </Link>
        ))}
      </nav>

      {verifiedTotal !== null && donations.length > 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          Total sou paj sa a: <span className="font-semibold text-white">{formatUSD(verifiedTotal)}</span> (
          {formatHTG(donations.reduce((sum, d) => sum + d.amountHtg, 0))})
        </p>
      )}

      <div className="mt-6">
        <DonationReview donations={donations} />
      </div>
    </div>
  );
}
