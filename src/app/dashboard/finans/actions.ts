"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_PAYOUT_HTG } from "@/lib/finance";

export type FormState = { error?: string; message?: string } | undefined;

export async function requestPayout(_prev: FormState, formData: FormData): Promise<FormState> {
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const phone = String(formData.get("phone") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const pin = String(formData.get("pin") ?? "").trim();

  if (phone.replace(/\D/g, "").length < 8) return { error: "Mete yon nimewo telefòn valid." };
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_HTG) return { error: `Montan minimòm lan se ${MIN_PAYOUT_HTG} goud.` };
  if (!/^\d{4,6}$/.test(pin)) return { error: "Mete PIN retrè ou (4 a 6 chif)." };

  const supabase = createClient();
  // Fonksyon SQL la verifye PIN nan, règ 3 mwa a ak balans lan; li retounen { ok, error }
  const { data, error } = await supabase.rpc("request_payout", {
    p_method: method,
    p_phone: phone,
    p_amount_htg: amount,
    p_pin: pin,
  });
  if (error) return { error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { error: result.error ?? "Demann lan echwe." };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return { message: "Demann retrè a voye! Ekip UpMizik la ap trete l byento." };
}

export async function setWithdrawalPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const confirmPin = String(formData.get("confirm") ?? "").trim();
  const current = String(formData.get("current") ?? "").trim() || null;

  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN nan dwe gen 4 a 6 chif." };
  if (pin !== confirmPin) return { error: "2 PIN yo pa menm." };

  const { error } = await createClient().rpc("set_withdrawal_pin", { p_new_pin: pin, p_current_pin: current });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/finans");
  return { message: "PIN retrè ou sove! 🔐" };
}
