"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ArchiveEntity = "songs" | "profiles" | "donations" | "payouts";

// Fonksyon SQL set_archived la verifye dwa admin nan epi anrejistre aksyon an nan jounal la
export async function setArchived(entity: ArchiveEntity, id: string, archived: boolean): Promise<{ error?: string }> {
  const { error } = await createClient().rpc("set_archived", { p_entity: entity, p_id: id, p_archived: archived });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
