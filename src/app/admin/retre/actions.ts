"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

async function processPayout(id: string, update: Record<string, string>): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user.id))) return { error: "Se sèlman admin ki ka fè sa." };

  // .eq("status", "pending") anpeche trete menm retrè a 2 fwa
  const { data, error } = await supabase
    .from("payouts")
    .update({ ...update, processed_by: user.id, processed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: `Aksyon an echwe: ${error.message}` };
  if (!data?.length) return { error: "Retrè sa a deja trete." };

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard/finans");
  return {};
}

export async function markPayoutPaid(id: string, reference: string) {
  const ref = reference.trim();
  if (!ref) return { error: "Mete nimewo referans transfè a." };
  if (ref.length > 100) return { error: "Referans lan twò long." };
  return processPayout(id, { status: "paid", reference: ref });
}

export async function rejectPayout(id: string, note: string) {
  const reason = note.trim();
  if (!reason) return { error: "Eksplike poukisa w rejte retrè a." };
  if (reason.length > 500) return { error: "Rezon an twò long." };
  return processPayout(id, { status: "rejected", admin_note: reason });
}

// Make tout sa UpMizik dwe yon kolaboratè (pou yon atis) kòm peye
export async function markCollaboratorPaid(artistId: string, name: string, phone: string | null, reference: string) {
  const ref = reference.trim();
  if (!ref) return { error: "Mete nimewo referans transfè a." };

  const supabase = createClient();
  // Fonksyon SQL la verifye dwa admin nan
  const { error } = await supabase.rpc("mark_collaborator_paid", {
    p_artist_id: artistId,
    p_name: name,
    p_phone: phone,
    p_reference: ref,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/retre");
  return {};
}
