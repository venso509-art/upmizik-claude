"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { normalizeUrl } from "@/lib/links";
import { youtubeId } from "@/lib/youtube";

type Result = { error?: string };

async function adminClient() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (await isAdmin(supabase, user?.id)) ? { supabase, user: user! } : null;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/rpa");
}

export async function createPromo(input: {
  artistId: string;
  title: string;
  kind: "video" | "youtube";
  videoPath: string | null;
  youtubeUrl: string | null;
}): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };

  const title = input.title.trim();
  if (!title || title.length > 120) return { error: "Tit la dwe gen ant 1 ak 120 karaktè." };
  if (!input.artistId) return { error: "Chwazi atis la." };

  let youtubeUrl: string | null = null;
  if (input.kind === "youtube") {
    youtubeUrl = normalizeUrl(input.youtubeUrl ?? "") ?? null;
    if (!youtubeUrl || !youtubeId(youtubeUrl)) return { error: "Mete yon lyen videyo YouTube valid." };
  } else if (!input.videoPath) {
    return { error: "Voye videyo a." };
  }

  // Nouvo RPA a ale nan dènye pozisyon an
  const { data: last } = await ctx.supabase.from("artist_promos").select("position").order("position", { ascending: false }).limit(1).maybeSingle();

  const { error } = await ctx.supabase.from("artist_promos").insert({
    artist_id: input.artistId,
    title,
    kind: input.kind,
    video_path: input.kind === "video" ? input.videoPath : null,
    youtube_url: youtubeUrl,
    position: (last?.position ?? -1) + 1,
    created_by: ctx.user.id,
  });
  if (error) return { error: `RPA a pa sove: ${error.message}` };
  refresh();
  return {};
}

export async function setPromoActive(id: string, active: boolean): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };
  const { error } = await ctx.supabase.from("artist_promos").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// Monte oswa desann yon RPA nan lòd la (nou renimewote tout pozisyon yo 0, 1, 2...)
export async function movePromo(id: string, direction: -1 | 1): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };
  const { data } = await ctx.supabase.from("artist_promos").select("id").order("position").order("created_at", { ascending: false });
  const ids = (data ?? []).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return {};
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let k = 0; k < ids.length; k++) {
    const { error } = await ctx.supabase.from("artist_promos").update({ position: k }).eq("id", ids[k]);
    if (error) return { error: error.message };
  }
  refresh();
  return {};
}

export async function deletePromo(id: string): Promise<Result> {
  const ctx = await adminClient();
  if (!ctx) return { error: "Se sèlman admin ki ka fè sa." };
  const { data, error } = await ctx.supabase.from("artist_promos").delete().eq("id", id).select("video_path").single();
  if (error) return { error: error.message };
  if (data.video_path) await ctx.supabase.storage.from("promo-videos").remove([data.video_path]);
  refresh();
  return {};
}
