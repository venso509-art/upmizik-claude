"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PROOF_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type ProResult = { error?: string; proUntil?: string };

// Atis la voye prèv peman Pro a: foto a monte nan folder li, epi demann nan ap tann.
// Li vin Pro SÈLMAN lè admin apwouve l sou /admin/pro.
export async function requestPro(formData: FormData): Promise<ProResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim().slice(0, 60);
  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) return { error: "Ajoute foto prèv peman an." };
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PROOF_TYPES[ext]) return { error: "Prèv la dwe yon foto JPG, PNG oswa WebP." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Foto a twò gwo. Maksimòm: 5 MB." };

  const proofPath = `pro/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("donation-proofs")
    .upload(proofPath, proof, { contentType: PROOF_TYPES[ext], upsert: false });
  if (uploadError) return { error: `Foto prèv la pa monte: ${uploadError.message}` };

  const { error } = await supabase.rpc("request_pro", {
    p_method: method,
    p_transaction_ref: transactionRef,
    p_proof_path: proofPath,
  });
  if (error) {
    await supabase.storage.from("donation-proofs").remove([proofPath]);
    return { error: error.message };
  }

  revalidatePath("/pwofil");
  revalidatePath("/dashboard");
  revalidatePath(`/atis/${user.id}`);
  revalidatePath("/atis");
  revalidatePath("/");
  return {};
}

// Chante an vedèt sou CV a (atis Pro sèlman; baz done a verifye l)
export async function setFeaturedSong(songId: string | null): Promise<ProResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };
  const { error } = await supabase.from("profiles").update({ featured_song_id: songId }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/pwofil");
  revalidatePath(`/atis/${user.id}`);
  return {};
}

export type ProDecision = "approve" | "reject" | "revoke";

// Admin: apwouve (atis la vin Pro), rejte (peman pa vre), oswa retire yon Pro aktif
export async function decidePro(requestId: string, action: ProDecision, note: string): Promise<ProResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("decide_pro", { p_request_id: requestId, p_action: action, p_note: note.trim().slice(0, 500) });
  if (error) return { error: error.message };
  revalidatePath("/admin/pro");
  revalidatePath("/atis");
  revalidatePath("/atis/[id]", "page");
  revalidatePath("/");
  return {};
}
