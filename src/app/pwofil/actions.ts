"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/links";

export type ProfileState = { error?: string; message?: string } | undefined;

const LIMITS = { display_name: 80, location: 100, bio: 1000, influences: 500, vision: 1000 } as const;
const LINKS = { youtube_url: "YouTube", instagram_url: "Instagram", tiktok_url: "TikTok" } as const;

// "3891 2317", "+509 3891-2317" oswa "wa.me/50938912317" → "https://wa.me/50938912317"
// Retounen null si chan an vid, oswa undefined si nimewo a pa valid.
function normalizeWhatsapp(raw: string): string | null | undefined {
  const value = raw.trim();
  if (!value) return null;
  let digits = value.replace(/^https?:\/\/(api\.)?wa\.me\//i, "").replace(/\D/g, "");
  if (digits.length === 8) digits = `509${digits}`; // nimewo Ayiti san kòd peyi a
  if (digits.length < 8 || digits.length > 15) return undefined;
  return `https://wa.me/${digits}`;
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Ou dwe konekte." };

  const update: Record<string, string | null> = {};

  for (const [field, max] of Object.entries(LIMITS)) {
    const value = String(formData.get(field) ?? "").trim();
    if (value.length > max) return { error: `Chan "${field}" la twò long (maksimòm ${max} karaktè).` };
    update[field] = value || null;
  }
  if (!update.display_name) return { error: "Non ou pa ka vid." };

  for (const [field, label] of Object.entries(LINKS)) {
    const url = normalizeUrl(String(formData.get(field) ?? ""));
    if (url === undefined) return { error: `Lyen ${label} la pa valid.` };
    update[field] = url;
  }
  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp_url") ?? ""));
  if (whatsapp === undefined) return { error: "Nimewo WhatsApp la pa valid. Egz: +509 3891 2317" };
  update.whatsapp_url = whatsapp;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: `Pwofil la pa sove: ${error.message}` };

  revalidatePath("/", "layout");
  return { message: "Pwofil ou sove! ✅" };
}
