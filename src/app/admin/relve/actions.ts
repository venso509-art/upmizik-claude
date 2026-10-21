"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Fèmen yon mwa: chif yo vin JELE nan achiv la (fonksyon SQL la verifye dwa admin nan)
export async function closeMonth(month: string): Promise<{ error?: string; count?: number }> {
  const { data, error } = await createClient().rpc("admin_close_month", { p_month: month });
  if (error) return { error: error.message };
  revalidatePath("/admin/relve");
  revalidatePath(`/admin/relve/${month.slice(0, 7)}`);
  return { count: Number(data ?? 0) };
}
