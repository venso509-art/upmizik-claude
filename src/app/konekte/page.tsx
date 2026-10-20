import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Konekte | UpMizik" };

export default async function LoginPage({ searchParams }: { searchParams: { konfime?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const notice = searchParams.konfime ? "Imèl ou konfime! Konekte kounye a." : undefined;

  return (
    <AuthCard title="Byenvini ankò" subtitle="Konekte pou w kontinye koute.">
      <LoginForm notice={notice} />
    </AuthCard>
  );
}
