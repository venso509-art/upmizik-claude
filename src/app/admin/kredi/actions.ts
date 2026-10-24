"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Admin: valide (kredi yo antre) oswa rejte yon acha kredi
export async function reviewCreditPurchase(id: string, approve: boolean, note: string): Promise<{ error?: string }> {
  const { error } = await createClient().rpc("review_credit_purchase", { p_id: id, p_approve: approve, p_note: note.trim() || null });
  if (error) return { error: error.message };
  revalidatePath("/admin/kredi");
  return {};
}
