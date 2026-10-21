"use server";

import { createClient } from "@/lib/supabase/server";

export type SendState = { error?: string; message?: string } | undefined;

export async function sendAdminMessage(_prev: SendState, formData: FormData): Promise<SendState> {
  const raw = String(formData.get("to") ?? "artists");
  const to = raw === "all" ? "artists" : raw;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || title.length > 120) return { error: "Tit la dwe gen ant 1 ak 120 karaktè." };
  if (!body || body.length > 2000) return { error: "Mesaj la dwe gen ant 1 ak 2000 karaktè." };

  // Fonksyon SQL yo verifye dwa admin nan
  const groups: Record<string, string> = { artists: "atis", listeners: "koutè", everyone: "moun" };
  const supabase = createClient();
  const { data, error } =
    to in groups
      ? await supabase.rpc("send_admin_broadcast", { p_audience: to, p_title: title, p_body: body })
      : await supabase.rpc("send_admin_message", { p_user_id: to, p_title: title, p_body: body });
  if (error) return { error: error.message };

  const count = Number(data ?? 0);
  return { message: `Mesaj la voye bay ${count} ${groups[to] ?? "moun"}. ✅` };
}

// Voye yon mesaj dirèk bay yon sèl atis (nan bwat mesaj li sou sit la)
export async function sendDirectMessage(userId: string, title: string, body: string): Promise<SendState> {
  if (!title.trim() || !body.trim()) return { error: "Mesaj la bezwen yon tit ak yon kontni." };
  const { error } = await createClient().rpc("send_admin_message", { p_user_id: userId, p_title: title.trim(), p_body: body.trim() });
  if (error) return { error: error.message };
  return { message: "Mesaj la voye nan bwat atis la. ✅" };
}
