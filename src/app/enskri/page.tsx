import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Enskri | UpMizik" };

export default async function SignupPage({ searchParams }: { searchParams: { wol?: string } }) {
  const wantsArtist = searchParams.wol === "atis";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Deja konekte: yon koutè ki vle vin atis ale ranpli rès kondisyon yo
  if (user) redirect(wantsArtist ? "/vin-atis" : "/");

  return (
    <AuthCard title={wantsArtist ? "🎤 Kreye kont atis ou" : "Kreye kont ou"} subtitle="Rantre nan kominote UpMizik la." closable>
      <SignupForm initialRole={wantsArtist ? "artist" : "listener"} />
    </AuthCard>
  );
}
