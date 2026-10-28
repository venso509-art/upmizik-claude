"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Reset rapò revni an: baz done a anrejistre rapò a nan achiv (jele), epi kontè a rekòmanse a zewo.
// Se baz done a ki verifye "RESET" ak mo sekrè a (hash), pa sit la.
export async function resetRevenueReport(confirm: string, word: string, title: string): Promise<{ error?: string; id?: string }> {
  if (confirm.trim().toUpperCase() !== "RESET") return { error: "Ekri RESET pou konfime." };
  if (!word.trim()) return { error: "Ekri mo sekrè a." };
  const { data, error } = await createClient().rpc("admin_reset_revenue_report", {
    p_confirm: confirm,
    p_word: word,
    p_title: title.trim() || null,
  });
  if (error) return { error: error.message.includes("admin_reset_revenue_report") ? "Fonksyon reset la poko pare (migration)." : error.message };
  revalidatePath("/admin/rapo");
  revalidatePath("/admin/achiv/rapo");
  return { id: data as string };
}
