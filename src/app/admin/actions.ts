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

// Siprime yon kont nèt: baz done a verifye SIPRIME + mo sekrè a, epi l refize si kont lan gen lajan anrejistre
export async function deleteAccount(userId: string, confirm: string, word: string, fakeProofs = false): Promise<{ error?: string; name?: string }> {
  if (confirm.trim().toUpperCase() !== "SIPRIME") return { error: "Ekri SIPRIME pou konfime." };
  if (!word.trim()) return { error: "Ekri mo sekrè a." };
  const { data, error } = await createClient().rpc("admin_delete_account", { p_user: userId, p_confirm: confirm, p_word: word, p_fake_proofs: fakeProofs });
  if (error) return { error: error.message.includes("admin_delete_account") ? "Fonksyon an poko pare (migration)." : error.message };
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return { name: (data as string | null) ?? undefined };
}
