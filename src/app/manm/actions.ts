"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MemberResult = { error?: string; ok?: boolean; code?: string | null };

// Yon moun ki konekte voye demann pou vin manm afilye (admin nan apwouve l)
export async function requestMembership(formData: FormData): Promise<MemberResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };
  const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const motivation = String(formData.get("motivation") ?? "").trim().slice(0, 500);
  if (fullName.length < 2 || fullName.length > 80) return { error: "Mete non konplè ou." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Mete yon imèl valid." };
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 20) return { error: "Mete yon nimewo telefòn/WhatsApp valid." };

  const { error } = await supabase.rpc("request_membership", {
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_city: city,
    p_motivation: motivation,
  });
  if (error) return { error: error.message };
  revalidatePath("/manm");
  return { ok: true };
}

// Admin: apwouve (pseudo otomatik) oswa bloke yon manm
export async function reviewMember(memberId: string, action: "approve" | "block", note: string): Promise<MemberResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_review_member", { p_member: memberId, p_action: action, p_note: note.trim().slice(0, 500) });
  if (error) return { error: error.message };
  revalidatePath("/admin/manm");
  return { ok: true, code: (data as string | null) ?? null };
}

// Admin: anrejistre peman yon mwa (MonCash/NatCash)
export async function payMember(memberId: string, period: string, method: "moncash" | "natcash", reference: string): Promise<MemberResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_pay_member", {
    p_member: memberId,
    p_period: `${period}-01`,
    p_method: method,
    p_reference: reference.trim().slice(0, 80),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/manm");
  return { ok: true };
}
