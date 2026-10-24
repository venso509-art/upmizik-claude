"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_CREDITS, MIN_CREDITS } from "@/lib/credits";

const PROOF_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type CreditResult = { error?: string; ok?: boolean };

// Achte kredi: foto prèv la monte nan donation-proofs/credits/<id>/, epi demann nan ap tann validasyon admin
export async function requestCreditPurchase(formData: FormData): Promise<CreditResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const credits = Math.floor(Number(formData.get("credits")));
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim().slice(0, 60);
  const proof = formData.get("proof");
  if (!Number.isFinite(credits) || credits < MIN_CREDITS || credits > MAX_CREDITS) return { error: `Chwazi ant ${MIN_CREDITS} ak ${MAX_CREDITS.toLocaleString("fr-HT")} kredi.` };
  if (!(proof instanceof File) || proof.size === 0) return { error: "Ajoute foto prèv peman an." };
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PROOF_TYPES[ext]) return { error: "Prèv la dwe yon foto JPG, PNG oswa WebP." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Foto a twò gwo. Maksimòm: 5 MB." };

  const proofPath = `credits/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("donation-proofs").upload(proofPath, proof, { contentType: PROOF_TYPES[ext], upsert: false });
  if (uploadError) return { error: `Foto prèv la pa monte: ${uploadError.message}` };

  const { error } = await supabase.rpc("request_credit_purchase", {
    p_credits: credits,
    p_method: method,
    p_transaction_ref: transactionRef,
    p_proof_path: proofPath,
  });
  if (error) {
    await supabase.storage.from("donation-proofs").remove([proofPath]);
    return { error: error.message };
  }
  revalidatePath("/kredi");
  return { ok: true };
}
