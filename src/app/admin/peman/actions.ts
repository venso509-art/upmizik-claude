"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export type SettingsState = { error?: string; message?: string } | undefined;

function num(formData: FormData, key: string) {
  return Number(String(formData.get(key) ?? "").replace(",", "."));
}

export async function updatePaymentSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user.id))) return { error: "Se sèlman admin ki ka chanje paramèt yo." };

  const htgPerUsd = num(formData, "htg_per_usd");
  const registrationFeeUsd = num(formData, "registration_fee_usd");
  const minDonationUsd = num(formData, "min_donation_usd");
  const monthlyFeeUsd = num(formData, "monthly_fee_usd");
  const moncash = String(formData.get("moncash_number") ?? "").trim();
  const natcash = String(formData.get("natcash_number") ?? "").trim();
  const accountName = String(formData.get("account_name") ?? "").trim().replace(/\s+/g, " ");
  if (accountName.length < 2 || accountName.length > 80) return { error: "Mete non ki sou kont lan (2 a 80 karaktè)." };

  if (!(htgPerUsd > 0 && htgPerUsd < 10000)) return { error: "To a dwe yon chif ant 1 ak 10 000." };
  if (!(registrationFeeUsd >= 0 && registrationFeeUsd <= 1000)) return { error: "Frè enskripsyon an pa valid." };
  if (!(minDonationUsd > 0 && minDonationUsd <= 1000)) return { error: "Don minimòm lan pa valid." };
  if (!(monthlyFeeUsd >= 0 && monthlyFeeUsd <= 100)) return { error: "Frè mansyèl la pa valid." };
  for (const [label, n] of [["MonCash", moncash], ["NatCash", natcash]] as const) {
    if (n.replace(/\D/g, "").length < 8 || n.length > 20) return { error: `Nimewo ${label} la pa valid.` };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      htg_per_usd: htgPerUsd,
      moncash_number: moncash,
      natcash_number: natcash,
      account_name: accountName,
      registration_fee_usd: registrationFeeUsd,
      min_donation_usd: minDonationUsd,
      monthly_fee_usd: monthlyFeeUsd,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) return { error: `Paramèt yo pa sove: ${error.message}` };

  // Tout sit la li paramèt yo nan layout la: rafrechi tout paj yo
  revalidatePath("/", "layout");
  return { message: "Paramèt yo sove! Tout sit la itilize nouvo valè yo kounye a. ✅" };
}
