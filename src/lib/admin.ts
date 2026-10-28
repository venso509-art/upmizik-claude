import type { SupabaseClient } from "@supabase/supabase-js";

// Tcheke si moun ki konekte a se admin. Kolòn is_admin lan kache (pèsonn pa ka li l):
// se fonksyon is_admin() baz done a ki reponn, pou moun ki konekte a sèlman.
// userId: moun ki konekte a (si l vid, repons lan se non).
export async function isAdmin(supabase: SupabaseClient, userId: string | undefined) {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
