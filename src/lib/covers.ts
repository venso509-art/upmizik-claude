import type { SupabaseClient } from "@supabase/supabase-js";

// Yon pwojè (album, EP...) gen yon sèl pochèt pou tout chante li yo:
// efase fichye a sèlman lè okenn chante pa sèvi avè l ankò.
export async function removeCoverIfUnused(supabase: SupabaseClient, path: string) {
  const { count, error } = await supabase.from("songs").select("id", { count: "exact", head: true }).eq("cover_path", path);
  if (error || (count ?? 0) > 0) return;
  await supabase.storage.from("covers").remove([path]);
}
