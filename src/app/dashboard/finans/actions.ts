"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_PAYOUT_HTG } from "@/lib/finance";

export type PayoutState = { error?: string; message?: string } | undefined;

export async function requestPayout(_prev: PayoutState, formData: FormData): Promise<PayoutState> {
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const phone = String(formData.get("phone") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));

  if (phone.replace(/\D/g, "").length < 8) return { error: "Mete yon nimewo telefòn valid." };
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_HTG) return { error: `Montan minimòm lan se ${MIN_PAYOUT_HTG} goud.` };

  const supabase = createClient();
  const { error } = await supabase.rpc("request_payout", { p_method: method, p_phone: phone, p_amount_htg: amount });
  // Mesaj erè fonksyon SQL la deja an Kreyòl (egz: "Montan an depase balans disponib ou")
  if (error) return { error: error.message };

  revalidatePath("/dashboard/finans");
  revalidatePath("/dashboard");
  revalidatePath("/admin", "layout");
  return { message: "Demann retrè a voye! Ekip UpMizik la ap trete l byento." };
}
