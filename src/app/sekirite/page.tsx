import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { ChangePasswordForm } from "@/components/security/ChangePasswordForm";

// Paj sa a pa nan okenn meni, e motè rechèch yo pa dwe endekse l
export const metadata: Metadata = { title: "Sekirite | UpMizik", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data } = await supabase.rpc("security_status");
  const status = (data as { has_code: boolean; locked_until: string | null; failed_attempts: number }[] | null)?.[0];

  return (
    <AuthCard title="🔐 Chanje modpas" subtitle="Pou sekirite, ou bezwen ansyen modpas ou AK kòd sekrè ou.">
      {!status?.has_code ? (
        <p className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
          Kont ou pa gen kòd sekrè. Chanjman modpas la pa disponib pou kont sa a.
        </p>
      ) : status.locked_until ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold">⛔ Paj sa a bloke.</p>
          <p className="mt-1">
            Gen 3 tantativ ki echwe. Eseye ankò apre{" "}
            <strong>{new Date(status.locked_until).toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit", timeZone: "America/Port-au-Prince" })}</strong>.
          </p>
        </div>
      ) : (
        <>
          {status.failed_attempts > 0 && (
            <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              ⚠️ {status.failed_attempts} tantativ ki echwe deja. Apre 3, kont lan ap dekonekte sou tout aparèy yo.
            </p>
          )}
          <ChangePasswordForm />
          <p className="mt-6 text-xs text-zinc-500">
            Apre 3 tantativ ki echwe (modpas oswa kòd), nou dekonekte kont lan sou tout aparèy yo epi nou bloke paj la 30 minit.
          </p>
        </>
      )}
    </AuthCard>
  );
}
