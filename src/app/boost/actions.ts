"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PROOF_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type BoostResult = { error?: string };

// Atis la mande yon boost: foto prèv peman an monte nan folder li, epi demann nan ap tann admin nan.
export async function requestBoost(formData: FormData): Promise<BoostResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const type = formData.get("type") === "profil" ? "profil" : "mizik";
  const target = type === "profil" ? user.id : String(formData.get("target") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim().slice(0, 60);
  const proof = formData.get("proof");
  if (!target) return { error: "Chwazi mizik ou vle boost la." };
  if (!(proof instanceof File) || proof.size === 0) return { error: "Ajoute foto prèv peman an." };
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PROOF_TYPES[ext]) return { error: "Prèv la dwe yon foto JPG, PNG oswa WebP." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Foto a twò gwo. Maksimòm: 5 MB." };

  const proofPath = `boost/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("donation-proofs").upload(proofPath, proof, { contentType: PROOF_TYPES[ext], upsert: false });
  if (uploadError) return { error: `Foto prèv la pa monte: ${uploadError.message}` };

  const { error } = await supabase.rpc("request_boost", {
    p_type: type,
    p_target: target,
    p_plan: plan,
    p_method: method,
    p_transaction_ref: transactionRef,
    p_proof_path: proofPath,
  });
  if (error) {
    await supabase.storage.from("donation-proofs").remove([proofPath]);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return {};
}

// Admin: aktive boost la (jodi a + jou yo) oswa refize l
export async function reviewBoost(id: string, approve: boolean, note: string): Promise<BoostResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("review_boost", { p_id: id, p_approve: approve, p_note: note.trim().slice(0, 500) });
  if (error) return { error: error.message };
  revalidatePath("/admin/boost");
  revalidatePath("/");
  revalidatePath("/atis");
  revalidatePath("/atis/[id]", "page");
  return {};
}
