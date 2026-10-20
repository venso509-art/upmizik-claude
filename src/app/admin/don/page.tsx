import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { countDonations, loadAdminDonations, type DonationStatus } from "@/lib/adminDonations";
import { formatHTG, formatUSD } from "@/lib/donations";
import { DonationReview } from "@/components/admin/DonationReview";
import { AdminTabs } from "@/components/admin/AdminTabs";

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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">Tout don yo</h1>
      <p className="mt-1 text-zinc-400">Verifye prèv yo anvan w apwouve yon don.</p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/don?status=${t.status}`}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === t.status ? "bg-fuchsia-500 font-semibold text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[i]})</span>
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
