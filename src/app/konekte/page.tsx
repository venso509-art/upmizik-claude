import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Konekte | UpMizik" };

export default async function LoginPage({ searchParams }: { searchParams: { konfime?: string; bloke?: string; modpas?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const notice = searchParams.bloke
    ? "⛔ Kont ou bloke pa ekip UpMizik la, e nou dekonekte w. Kontakte nou: upmizikcontact@gmail.com."
    : searchParams.konfime
      ? "Imèl ou konfime! Konekte kounye a."
      : undefined;

  return (
    <AuthCard title="Byenvini ankò" subtitle="Konekte pou w kontinye koute." closable>
      <LoginForm notice={notice} startReset={!!searchParams.modpas} />
    </AuthCard>
  );
}
