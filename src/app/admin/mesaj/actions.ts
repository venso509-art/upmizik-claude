"use server";

import { createClient } from "@/lib/supabase/server";

export type SendState = { error?: string; message?: string } | undefined;

export async function sendAdminMessage(_prev: SendState, formData: FormData): Promise<SendState> {
  const to = String(formData.get("to") ?? "all");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || title.length > 120) return { error: "Tit la dwe gen ant 1 ak 120 karaktè." };
  if (!body || body.length > 2000) return { error: "Mesaj la dwe gen ant 1 ak 2000 karaktè." };

  // Fonksyon SQL la verifye dwa admin nan
  const { data, error } = await createClient().rpc("send_admin_message", {
    p_user_id: to === "all" ? null : to,
    p_title: title,
    p_body: body,
  });
  if (error) return { error: error.message };

  const count = Number(data ?? 0);
  return { message: `Mesaj la voye bay ${count} ${count > 1 ? "atis" : "moun"}. ✅` };
}
