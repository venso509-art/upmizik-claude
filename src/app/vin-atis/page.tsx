import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { BecomeArtistForm } from "@/components/registration/BecomeArtistForm";

export const metadata: Metadata = { title: "Vin atis | UpMizik" };

const PERKS = [
  "🎵 Pibliye chante w, EP, Mixtape ak Album",
  "💝 Resevwa don fanatik yo sou MonCash/NatCash",
  "📊 Wè estatistik ekout ou ak revni w",
  "🏆 Trofe, disk sètifye ak plak fizik",
];

// Yon koutè ki konekte vin atis (san li pa kreye yon nouvo kont)
export default async function BecomeArtistPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/enskri?wol=atis");

  const { data: profile } = await supabase.from("profiles").select("display_name, role, location").eq("id", user.id).single();
  if (profile?.role === "artist") redirect("/dashboard");

  const { data: last } = await supabase
    .from("artist_registrations")
    .select("status, admin_note, created_at")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.status === "pending") {
    return (
      <AuthCard title="⏳ Demann ou an ap tann" subtitle="Ekip UpMizik la ap verifye prèv peman an.">
        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            Depi admin nan valide l, kont ou ap vin yon <strong className="text-white">kont atis</strong> e w ap resevwa yon notifikasyon. Pandan tan
            sa a, ou ka kontinye koute mizik nòmalman.
          </p>
          <Link href="/" className="btn-primary block rounded-xl px-4 py-3 text-center font-semibold">
            Kontinye koute mizik
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="🎤 Vin atis sou UpMizik" subtitle="Ranpli rès enfòmasyon yo. Kont ou a rete menm jan an: menm imèl, menm modpas.">
      <ul className="mb-6 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
        {PERKS.map((p) => (
          <li key={p} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
            {p}
          </li>
        ))}
      </ul>
      {last?.status === "rejected" && (
        <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          ❌ Dènye prèv ou a te rejte{last.admin_note ? `: ${last.admin_note}` : "."} Ou ka voye yon nouvo demann.
        </p>
      )}
      <BecomeArtistForm name={profile?.display_name ?? ""} location={profile?.location ?? null} />
    </AuthCard>
  );
}
