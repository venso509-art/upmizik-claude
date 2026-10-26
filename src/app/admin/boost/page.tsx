import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { BoostReview, type AdminBoostRequest } from "@/components/admin/BoostReview";
import type { BoostStatus, BoostType } from "@/lib/boost";

export const metadata: Metadata = { title: "Admin: Demann Boost | UpMizik" };
export const dynamic = "force-dynamic";

const TABS = [
  { status: "pending", label: "⏳ Ap tann" },
  { status: "active", label: "🔥 Aktive" },
  { status: "rejected", label: "❌ Refize" },
] as const;

type Row = {
  id: string;
  artist_id: string;
  boost_type: BoostType;
  target_id: string;
  amount: number;
  duration_days: number;
  method: "moncash" | "natcash";
  transaction_ref: string | null;
  proof_path: string;
  status: BoostStatus;
  admin_note: string | null;
  created_at: string;
  expires_at: string | null;
  artist: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null;
};

// Demann boost yo: verifye prèv peman an, epi "Aktive" (is_boosted + jodi a + jou yo) oswa "Refize"
export default async function AdminBoostPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const status = TABS.find((t) => t.status === searchParams.status)?.status ?? "pending";
  const [{ data, error }, ...counts] = await Promise.all([
    supabase
      .from("boost_purchases")
      .select(
        "id, artist_id, boost_type, target_id, amount, duration_days, method, transaction_ref, proof_path, status, admin_note, created_at, expires_at, artist:profiles!boost_purchases_artist_id_fkey(display_name, avatar_url)",
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Row[]>(),
    ...TABS.map((t) => supabase.from("boost_purchases").select("id", { count: "exact", head: true }).eq("status", t.status)),
  ]);

  const rows = data ?? [];
  const songIds = rows.filter((r) => r.boost_type === "mizik").map((r) => r.target_id);
  const [{ data: signed }, { data: songRows }] = await Promise.all([
    rows.length ? supabase.storage.from("donation-proofs").createSignedUrls(rows.map((r) => r.proof_path), 3600) : Promise.resolve({ data: [] }),
    songIds.length
      ? supabase.from("songs").select("id, title, cover_path").in("id", songIds)
      : Promise.resolve({ data: [] as { id: string; title: string; cover_path: string | null }[] }),
  ]);
  const proofUrls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const songsById = new Map(((songRows ?? []) as { id: string; title: string; cover_path: string | null }[]).map((s) => [s.id, s]));

  const requests: AdminBoostRequest[] = rows.map((r) => {
    const a = Array.isArray(r.artist) ? r.artist[0] : r.artist;
    const song = songsById.get(r.target_id);
    return {
      id: r.id,
      artistId: r.artist_id,
      artistName: a?.display_name ?? "Atis",
      type: r.boost_type,
      targetId: r.target_id,
      targetLabel: r.boost_type === "mizik" ? `« ${song?.title ?? "Chante efase"} »` : `Pwofil ${a?.display_name ?? ""}`,
      targetImage:
        r.boost_type === "mizik"
          ? song?.cover_path
            ? supabase.storage.from("covers").getPublicUrl(song.cover_path).data.publicUrl
            : null
          : (a?.avatar_url ?? null),
      amount: Number(r.amount),
      days: r.duration_days,
      method: r.method,
      transactionRef: r.transaction_ref,
      proofUrl: proofUrls.get(r.proof_path) ?? null,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🔥 Demann Boost</h1>
      <p className="mt-1 text-zinc-400">
        Verifye prèv peman an (montan, non, nimewo tranzaksyon) anvan w aktive. Lè w klike « Aktive », mizik la oswa pwofil la parèt an premye sou sit la
        pandan kantite jou atis la peye a.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <Link
            key={t.status}
            href={`/admin/boost?status=${t.status}`}
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
          Paj la pa ka chaje demann boost yo. Kouri migration 20261214000000_boost_system.sql nan Supabase.
        </p>
      ) : (
        <div className="mt-6">
          <BoostReview requests={requests} />
        </div>
      )}
    </div>
  );
}
