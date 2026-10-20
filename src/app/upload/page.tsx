import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { UploadForm } from "@/components/upload/UploadForm";
import { AccountStatusNotice } from "@/components/AccountStatusNotice";

export const metadata: Metadata = { title: "Upload | UpMizik" };

export default async function UploadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();

  if (profile?.role !== "artist") {
    return (
      <AuthCard title="Sèlman pou atis" subtitle="Kont ou se yon kont koutè.">
        <p className="text-zinc-300">
          Se sèlman atis ki ka upload mizik sou UpMizik. Ou ka kontinye koute tout chante yo sou{" "}
          <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300">
            paj akèy la
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  if (profile.status !== "approved") {
    return (
      <AuthCard
        title={profile.status === "blocked" ? "Kont ou bloke" : "Kont ou ap tann validasyon admin"}
        subtitle="Ou poko ka pibliye mizik."
      >
        <AccountStatusNotice status={profile.status} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Pibliye yon chante" subtitle="Pataje mizik ou ak tout kominote UpMizik la.">
      <UploadForm userId={user.id} />
    </AuthCard>
  );
}
