import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Enskri | UpMizik" };

export default async function SignupPage({ searchParams }: { searchParams: { wol?: string; ref?: string } }) {
  const wantsArtist = searchParams.wol === "atis";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Deja konekte: yon koutè ki vle vin atis ale ranpli rès kondisyon yo
  // (lyen ?ref= yon manm: pseudo a swiv li sou /vin-atis)
  if (user) {
    const ref = searchParams.ref?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
    redirect(ref ? `/vin-atis?ref=${ref}` : wantsArtist ? "/vin-atis" : "/");
  }

  return (
    <AuthCard title={wantsArtist ? "🎤 Kreye kont atis ou" : "Kreye kont ou"} subtitle="Rantre nan kominote UpMizik la." closable>
      <SignupForm initialRole={wantsArtist || searchParams.ref ? "artist" : "listener"} referral={searchParams.ref ?? ""} />
    </AuthCard>
  );
}
