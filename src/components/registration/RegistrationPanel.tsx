import { createClient } from "@/lib/supabase/server";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { formatDate } from "@/lib/finance";
import { RegistrationPaymentForm } from "./RegistrationPaymentForm";

type Registration = {
  status: "pending" | "verified" | "rejected";
  method: DonationMethod;
  amount_htg: number;
  admin_note: string | null;
  created_at: string;
};

// Blòk pou yon atis ki ap tann validasyon: peye frè enskripsyon an, oswa swiv prèv li voye a
export async function RegistrationPanel({ userId }: { userId: string }) {
  const { data: last } = await createClient()
    .from("artist_registrations")
    .select("status, method, amount_htg, admin_note, created_at")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Registration>();

  return (
    <section id="peman" className="scroll-mt-24 overflow-hidden rounded-2xl border border-amber-800/60 bg-zinc-900/60">
      <div className="flex gap-4 border-b border-amber-800/40 bg-amber-950/40 p-5">
        <span className="text-3xl">⏳</span>
        <div>
          <p className="font-bold text-amber-200">Kont ou ap tann validasyon admin</p>
          <p className="mt-1 text-sm text-amber-200/80">
            Pou aktive kont atis ou epi kòmanse pibliye mizik, peye frè enskripsyon an epi voye prèv la. Ekip UpMizik la ap
            verifye l rapid.
          </p>
        </div>
      </div>

      <div className="p-6">
        {last?.status === "pending" ? (
          <div className="py-6 text-center">
            <p className="text-5xl">🔎</p>
            <p className="mt-4 text-lg font-bold text-white">Prèv ou an ap verifye</p>
            <p className="mt-2 text-sm text-zinc-400">
              Ou voye {formatHTG(Number(last.amount_htg))} pa {DONATION_METHODS[last.method].label} le {formatDate(last.created_at)}.
              <br />
              Kont ou ap aktive depi admin nan valide l.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            {last?.status === "rejected" && (
              <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
                <p className="font-semibold">❌ Dènye prèv ou an te rejte</p>
                {last.admin_note && <p className="mt-1">Rezon: {last.admin_note}</p>}
                <p className="mt-1 text-red-200/80">Ou ka voye yon nouvo prèv anba a.</p>
              </div>
            )}
            <RegistrationPaymentForm userId={userId} />
          </div>
        )}
      </div>
    </section>
  );
}
