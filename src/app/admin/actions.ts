"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export type AccountStatus = "pending" | "approved" | "blocked";

export async function setUserStatus(userId: string, status: AccountStatus): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user.id))) return { error: "Se sèlman admin ki ka fè sa." };
  if (userId === user.id && status !== "approved") return { error: "Ou pa ka bloke pwòp kont ou." };

  const { data, error } = await supabase.from("profiles").update({ status }).eq("id", userId).select("id");
  if (error) return { error: `Aksyon an echwe: ${error.message}` };
  if (!data?.length) return { error: "Itilizatè sa a pa jwenn." };

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return {};
}

// Demann "Mwen bliye modpas mwen": admin nan make kòd la "voye" oswa li anile demann lan
export async function setPasswordResetStatus(id: string, status: "sent" | "cancelled"): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_set_password_reset", { p_id: id, p_status: status });
  if (error) return { error: `Aksyon an echwe: ${error.message}` };
  revalidatePath("/admin/modpas");
  return {};
}
