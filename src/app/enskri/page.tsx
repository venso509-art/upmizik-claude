import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/ui";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Enskri | UpMizik" };

export default async function SignupPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <AuthCard title="Kreye kont ou" subtitle="Rantre nan kominote UpMizik la." closable>
      <SignupForm />
    </AuthCard>
  );
}
