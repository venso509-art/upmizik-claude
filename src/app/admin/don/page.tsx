import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { countDonations, loadAdminDonations, type DonationStatus } from "@/lib/adminDonations";
import { formatHTG, formatUSD } from "@/lib/donations";
import { DonationReview } from "@/components/admin/DonationReview";

export const metadata: Metadata = { title: "Admin: Don | UpMizik" };

const TABS: { status: DonationStatus; label: string }[] = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "verified", label: "✅ Apwouve" },
  { status: "rejected", label: "❌ Rejte" },
];

export default async function AdminDonationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";
  const [donations, ...counts] = await Promise.all([
    loadAdminDonations(supabase, status),
    ...TABS.map((t) => countDonations(supabase, t.status)),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/admin" className="text-sm text-zinc-400 hover:text-white">
        ← Retounen nan admin
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">Tout don yo</h1>
      <p className="mt-1 text-zinc-400">Verifye prèv yo anvan w apwouve yon don.</p>

      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-zinc-800">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/don?status=${t.status}`}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              status === t.status ? "border-fuchsia-500 text-white" : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t.label} <span className="ml-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs">{counts[i]}</span>
          </Link>
        ))}
      </nav>

      {status === "verified" && donations.length > 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          Total sou paj sa a: <span className="font-semibold text-white">{formatUSD(donations.reduce((s, d) => s + d.amountUsd, 0))}</span> (
          {formatHTG(donations.reduce((s, d) => s + d.amountHtg, 0))})
        </p>
      )}

      <div className="mt-6">
        <DonationReview donations={donations} />
      </div>
    </div>
  );
}
