"use server";

import { createClient } from "@/lib/supabase/server";

export type NewsletterState = { ok?: boolean; error?: string } | undefined;

export async function subscribeNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return { error: "Mete yon imèl valid." };

  // Fonksyon SQL la pa bay erè si imèl la deja enskri (pou pèsonn pa ka devine ki imèl ki la)
  const { error } = await createClient().rpc("subscribe_newsletter", { p_email: email });
  if (error) return { error: "Enskripsyon an pa pase. Eseye ankò pita." };
  return { ok: true };
}
