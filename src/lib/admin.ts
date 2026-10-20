import type { SupabaseClient } from "@supabase/supabase-js";

// Tcheke si yon itilizatè se admin. Si kolòn is_admin lan poko egziste
// (migration poko kouri), li retounen false san l pa kase paj la.
export async function isAdmin(supabase: SupabaseClient, userId: string | undefined) {
  if (!userId) return false;
  const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return !error && data?.is_admin === true;
}
