"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CommentTarget } from "@/lib/comments";

export type CommentResult = { error?: string };

function pathOf(target: CommentTarget) {
  return target.type === "song" ? `/chante/${target.id}` : `/sosyal/${target.id}`;
}

function refresh(target: CommentTarget) {
  revalidatePath(pathOf(target));
  if (target.type === "song") revalidatePath("/dashboard");
  else revalidatePath("/sosyal");
}

// Ekri yon kòmantè (oswa yon repons si parentId la) sou yon chante oswa yon pòs
export async function addComment(target: CommentTarget, body: string, parentId: string | null = null): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { error: "Ekri yon bagay anvan w voye." };
  if (text.length > 1000) return { error: "Kòmantè a twò long (maksimòm 1000 karaktè)." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte pou w kòmante." };

  const row: Record<string, string | null> = { user_id: user.id, body: text, parent_id: parentId };
  row[target.type === "song" ? "song_id" : "post_id"] = target.id;
  const { error } = await supabase.from("comments").insert(row);
  if (error) return { error: `Kòmantè a pa pase: ${error.message}` };

  refresh(target);
  return {};
}

export async function deleteComment(commentId: string, target: CommentTarget): Promise<CommentResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  // RLS la deside si w gen dwa efase l (pwòp kòmantè w, sou pwòp chante/pòs ou, oswa admin)
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");
  if (error) return { error: `Efasman an echwe: ${error.message}` };
  if (!data?.length) return { error: "Ou pa gen dwa efase kòmantè sa a." };

  refresh(target);
  return {};
}
