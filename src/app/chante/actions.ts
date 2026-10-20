"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CommentResult = { error?: string };

export async function addComment(songId: string, body: string): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { error: "Ekri yon bagay anvan w voye." };
  if (text.length > 1000) return { error: "Kòmantè a twò long (maksimòm 1000 karaktè)." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte pou w kòmante." };

  const { error } = await supabase.from("comments").insert({ song_id: songId, user_id: user.id, body: text });
  if (error) return { error: `Kòmantè a pa pase: ${error.message}` };

  revalidatePath(`/chante/${songId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteComment(commentId: string, songId: string): Promise<CommentResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  // RLS la deside si w gen dwa efase l (pwòp kòmantè w, oswa sou pwòp chante w)
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");
  if (error) return { error: `Efasman an echwe: ${error.message}` };
  if (!data?.length) return { error: "Ou pa gen dwa efase kòmantè sa a." };

  revalidatePath(`/chante/${songId}`);
  revalidatePath("/dashboard");
  return {};
}
