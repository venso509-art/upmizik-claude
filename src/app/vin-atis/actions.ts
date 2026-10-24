"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ArtistSignupResult } from "@/app/auth/actions";

const PROOF_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Yon koutè ki konekte vin atis: telefòn, zòn, PIN + prèv frè enskripsyon an.
// Kont lan rete koutè jiskaske admin apwouve demann nan (fonksyon SQL request_artist_upgrade).
export async function becomeArtist(formData: FormData): Promise<ArtistSignupResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim().slice(0, 100);
  const pin = String(formData.get("pin") ?? "").trim();
  const pinConfirm = String(formData.get("pin_confirm") ?? "").trim();
  const method = formData.get("method") === "natcash" ? "natcash" : "moncash";
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim();
  const proof = formData.get("proof");

  if (displayName.length < 2) return { error: "Mete non atis ou." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Mete yon nimewo telefòn/WhatsApp valid." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN nan dwe gen 4 a 6 chif." };
  if (pin !== pinConfirm) return { error: "2 PIN yo pa menm." };
  if (!(proof instanceof File) || proof.size === 0) return { error: "Ajoute foto prèv peman an." };
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PROOF_TYPES[ext]) return { error: "Prèv la dwe yon foto JPG, PNG oswa WebP." };
  if (proof.size > 5 * 1024 * 1024) return { error: "Foto a twò gwo. Maksimòm: 5 MB." };

  const proofPath = `registration/${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("donation-proofs")
    .upload(proofPath, proof, { contentType: PROOF_TYPES[ext], upsert: false });
  if (uploadError) return { error: `Foto prèv la pa monte: ${uploadError.message}` };

  const { error } = await supabase.rpc("request_artist_upgrade", {
    p_display_name: displayName,
    p_phone: phone,
    p_location: location || null,
    p_pin: pin,
    p_method: method,
    p_transaction_ref: transactionRef,
    p_proof_path: proofPath,
  });
  if (error) {
    await supabase.storage.from("donation-proofs").remove([proofPath]);
    return { error: error.code === "PGRST202" ? "Baz done a poko ajou: kouri migration 20261206000000_listener_to_artist.sql." : error.message };
  }

  revalidatePath("/vin-atis");
  revalidatePath("/pwofil");
  return { ok: true };
}
