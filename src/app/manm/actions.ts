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
  const nickname = String(formData.get("nickname") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const motivation = String(formData.get("motivation") ?? "").trim().slice(0, 500);
  const sex = String(formData.get("sex") ?? "");
  if (sex !== "fi" && sex !== "gason") return { error: "Chwazi si w se fi oswa gason." };
  if (fullName.length < 2 || fullName.length > 80) return { error: "Mete vrè non ak siyati ou." };
  if (nickname.length < 2 || nickname.length > 40) return { error: "Mete non jwèt ou oswa non atis ou." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Mete yon imèl valid." };
  if (phone.replace(/\D/g, "").length < 8 || phone.length > 20) return { error: "Mete yon nimewo telefòn/WhatsApp valid." };

  // Verifikasyon idantite: foto figi (selfie) + foto pyès (paspò oswa kat idantite nasyonal)
  const idType = String(formData.get("id_type") ?? "");
  if (idType !== "paspo" && idType !== "kat_idantite") return { error: "Chwazi kalite pyès la: paspò oswa kat idantite nasyonal." };
  const selfie = formData.get("selfie");
  const idDoc = formData.get("id_doc");
  for (const [file, label] of [
    [selfie, "foto figi ou"],
    [idDoc, "foto pyès idantite ou"],
  ] as const) {
    if (!(file instanceof File) || file.size === 0) return { error: `Ajoute ${label}.` };
    if (!ID_TYPES[file.type]) return { error: `${label[0].toUpperCase()}${label.slice(1)} dwe yon foto (JPG, PNG oswa WebP).` };
    if (file.size > 3 * 1024 * 1024) return { error: `${label[0].toUpperCase()}${label.slice(1)} twò lou. Eseye ankò.` };
  }
  const s = selfie as File;
  const d = idDoc as File;
  const selfiePath = `${user.id}/selfie-${crypto.randomUUID()}.${ID_TYPES[s.type]}`;
  const idPath = `${user.id}/${idType}-${crypto.randomUUID()}.${ID_TYPES[d.type]}`;
  const bucket = supabase.storage.from("member-ids");
  const up1 = await bucket.upload(selfiePath, s, { contentType: s.type, upsert: false });
  if (up1.error) return { error: `Foto figi ou a pa monte: ${up1.error.message}` };
  const up2 = await bucket.upload(idPath, d, { contentType: d.type, upsert: false });
  if (up2.error) {
    await bucket.remove([selfiePath]);
    return { error: `Foto pyès la pa monte: ${up2.error.message}` };
  }

  const { error } = await supabase.rpc("request_membership", {
    p_full_name: fullName,
    p_nickname: nickname,
    p_email: email,
    p_phone: phone,
    p_city: city,
    p_motivation: motivation,
    p_sex: sex,
    p_selfie_path: selfiePath,
    p_id_path: idPath,
    p_id_type: idType,
  });
  if (error) {
    await bucket.remove([selfiePath, idPath]);
    return { error: error.message };
  }
  revalidatePath("/manm");
  return { ok: true };
}

const ID_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Manm nan chanje pseudo li (3 fwa maksimòm chak 30 jou; baz done a verifye l)
export async function changePseudo(code: string): Promise<MemberResult> {
  const supabase = createClient();
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 4 || clean.length > 20) return { error: "Pseudo a dwe gen 4 a 20 lèt oswa chif." };
  const { data, error } = await supabase.rpc("change_member_pseudo", { p_code: clean });
  if (error) return { error: error.message };
  revalidatePath("/manm/dashboard");
  return { ok: true, code: (data as string | null) ?? clean };
}

// Admin: apwouve (pseudo otomatik), rejte (ak rezon) oswa bloke yon manm
export async function reviewMember(memberId: string, action: "approve" | "reject" | "block", note: string): Promise<MemberResult> {
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

// Manm nan voye yon tuto bay youn nan atis li fè enskri yo (li rive nan bwat mesaj atis la)
export async function sendTutorial(artistId: string, tutorialId: string): Promise<MemberResult & { artist?: string }> {
  const { data, error } = await createClient().rpc("member_send_tutorial", { p_artist: artistId, p_tutorial: tutorialId });
  if (error) return { error: error.message.includes("member_send_tutorial") ? "Fonksyon an poko pare. Eseye ankò pita." : error.message };
  return { ok: true, artist: (data as string | null) ?? undefined };
}
