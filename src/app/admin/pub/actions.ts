"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { normalizeUrl } from "@/lib/links";

type Result = { error?: string };

async function adminClient() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (await isAdmin(supabase, user?.id)) ? { supabase, user: user! } : null;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/pub");
}

export async function createAd(input: {
  title: string;
  imagePath: string;
  linkUrl: string;
  startsAt: string | null;
  expiresAt: string | null;
}): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };

  const title = input.title.trim();
  if (!title || title.length > 120) return { error: "Tit la dwe gen ant 1 ak 120 karaktè." };
  const link = normalizeUrl(input.linkUrl);
  if (!link) return { error: "Mete yon lyen valid (egz: https://...)." };
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= startsAt) return { error: "Dat ekspirasyon an dwe apre dat kòmansman an." };

  const { error } = await ctx.supabase.from("ads").insert({
    title,
    image_path: input.imagePath,
    link_url: link,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
    created_by: ctx.user.id,
  });
  if (error) return { error: `Piblisite a pa sove: ${error.message}` };
  refresh();
  return {};
}

export async function setAdActive(id: string, active: boolean): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };
  const { error } = await ctx.supabase.from("ads").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteAd(id: string): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };
  const { data, error } = await ctx.supabase.from("ads").delete().eq("id", id).select("image_path").single();
  if (error) return { error: error.message };
  await ctx.supabase.storage.from("ads").remove([data.image_path]);
  refresh();
  return {};
}
