"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export type AdminResult = { error?: string };

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!(await isAdmin(supabase, user?.id))) return { supabase, user: null };
  return { supabase, user };
}

export async function reviewDonation(id: string, status: "verified" | "rejected"): Promise<AdminResult> {
  const { supabase, user } = await requireAdmin();
  if (!user) return { error: "Se sèlman admin ki ka fè sa." };

  const { error } = await supabase
    .from("donations")
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Aksyon an echwe: ${error.message}` };

  revalidatePath("/admin/don");
  revalidatePath("/admin");
  return {};
}

export async function markThanked(id: string): Promise<AdminResult> {
  const { supabase, user } = await requireAdmin();
  if (!user) return { error: "Se sèlman admin ki ka fè sa." };

  const { error } = await supabase.from("donations").update({ thanked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: `Aksyon an echwe: ${error.message}` };

  revalidatePath("/admin/don");
  revalidatePath("/admin");
  return {};
}
