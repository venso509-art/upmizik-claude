"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { POST_MAX_LENGTH } from "@/lib/posts";

export type PostFormState = { error?: string; message?: string; ok?: number } | undefined;

function refresh() {
  revalidatePath("/sosyal");
  revalidatePath("/dashboard");
  revalidatePath("/admin/pos");
}

// Atis la pibliye yon nouvo pòs (dire 30 jou, kalkile pa baz done a)
export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Ekri yon bagay anvan w pibliye." };
  if (content.length > POST_MAX_LENGTH) return { error: `Pòs la twò long (maksimòm ${POST_MAX_LENGTH} karaktè).` };

  const { error } = await supabase.from("posts").insert({ artist_id: user.id, content });
  if (error) {
    if (error.code === "42501") return { error: "Se sèlman atis ki apwouve ki ka pibliye." };
    return { error: error.message };
  }

  refresh();
  return { message: "Pòs ou pibliye! Li parèt sou paj Sosyal la pou 30 jou. 🎉", ok: Date.now() };
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

  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Pòs sa a pa jwenn." };
  refresh();
  return {};
}
