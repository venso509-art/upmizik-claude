"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { POST_MAX_LENGTH } from "@/lib/posts";
import { normalizeUrl } from "@/lib/links";

export type PostResult = { error?: string; message?: string };

function refresh() {
  revalidatePath("/sosyal");
  revalidatePath("/dashboard");
  revalidatePath("/admin/pos");
}

// Atis la pibliye yon nouvo pòs (dire 30 jou, 60 pou atis Pro; kalkile pa baz done a).
// Pòs la dwe gen yon imaj (deja monte nan post-images/<atis>/...) OSWA yon lyen, plis tèks la.
export async function createPost(input: { content: string; imagePath: string | null; linkUrl: string | null }): Promise<PostResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const content = input.content.trim();
  if (!content) return { error: "Ekri yon ti tèks pou akonpaye pòs la." };
  if (content.length > POST_MAX_LENGTH) return { error: `Pòs la twò long (maksimòm ${POST_MAX_LENGTH} karaktè).` };

  const imagePath = input.imagePath?.trim() || null;
  if (imagePath && !imagePath.startsWith(`${user.id}/`)) return { error: "Imaj la pa valid." };
  let linkUrl: string | null = null;
  if (input.linkUrl?.trim()) {
    const normalized = normalizeUrl(input.linkUrl);
    if (!normalized) return { error: "Lyen an pa valid. Egz: https://youtube.com/..." };
    linkUrl = normalized;
  }
  if (!imagePath && !linkUrl) return { error: "Mete yon imaj oswa yon lyen avèk tèks ou a." };

  const { error } = await supabase.from("posts").insert({ artist_id: user.id, content, image_path: imagePath, link_url: linkUrl });
  if (error) {
    if (error.code === "42501") return { error: "Se sèlman atis ki apwouve ki ka pibliye." };
    return { error: error.message };
  }

  refresh();
  return { message: "Pòs ou pibliye! Li parèt sou paj Sosyal la. 🎉" };
}

// Atis la retire pwòp pòs li
export async function removeMyPost(postId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const { data, error } = await supabase.from("posts").update({ status: "deleted" }).eq("id", postId).eq("artist_id", user.id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Pòs sa a pa jwenn." };
  refresh();
  return {};
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ok = !!user && (await isAdmin(supabase, user.id));
  return { supabase, ok };
}

// Admin: bloke (kache san efase) oswa debloke
export async function setPostStatus(postId: string, status: "active" | "blocked"): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Se sèlman admin ki ka fè sa." };

  const { data, error } = await supabase.from("posts").update({ status }).eq("id", postId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Pòs sa a pa jwenn." };
  refresh();
  return {};
}

// Admin: efase nèt (pa ka retabli)
export async function deletePost(postId: string): Promise<{ error?: string }> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { error: "Se sèlman admin ki ka fè sa." };

  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id, image_path");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Pòs sa a pa jwenn." };
  // Efase imaj la tou, pou l pa rete nan stockage la
  if (data[0].image_path) await supabase.storage.from("post-images").remove([data[0].image_path]);
  refresh();
  return {};
}
