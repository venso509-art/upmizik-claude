"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { QUOTE_CATEGORIES } from "@/lib/dailyQuotes";

// Admin: jere sitasyon "Mesaj jounen an" yo (RLS: se admin sèlman ki ka ekri nan tab yo)
type Result = { error?: string };
const KEYS = new Set(QUOTE_CATEGORIES.map((c) => c.key));
const labelOf = (key: string) => QUOTE_CATEGORIES.find((c) => c.key === key)?.label ?? key;

function clean(input: { teks: string; kategori: string; sous: string }) {
  const teks = input.teks.trim().replace(/\s+/g, " ");
  const sous = input.sous.trim().slice(0, 80) || null;
  if (teks.length < 2 || teks.length > 140) return { error: "Sitasyon an dwe gen 2 a 140 karaktè." };
  if (!KEYS.has(input.kategori)) return { error: "Chwazi yon kategori." };
  return { row: { teks, kategori: input.kategori, etiket: labelOf(input.kategori), sous } };
}

export async function addQuote(input: { teks: string; kategori: string; sous: string }): Promise<Result> {
  const c = clean(input);
  if (!c.row) return { error: c.error };
  const { error } = await createClient().from("daily_quotes").insert(c.row);
  if (error) return { error: error.message };
  revalidatePath("/admin/sitasyon");
  return {};
}

export async function updateQuote(id: number, input: { teks: string; kategori: string; sous: string }): Promise<Result> {
  const c = clean(input);
  if (!c.row) return { error: c.error };
  const { error } = await createClient().from("daily_quotes").update(c.row).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sitasyon");
  return {};
}

export async function setQuoteActive(id: number, active: boolean): Promise<Result> {
  const { error } = await createClient().from("daily_quotes").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sitasyon");
  return {};
}

// Efase yon sitasyon: kat atis ki te deja resevwa l yo efase avè l (istwa a sèlman)
export async function deleteQuote(id: number): Promise<Result> {
  const { error } = await createClient().from("daily_quotes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sitasyon");
  return {};
}

// Sijè chak jou nan semèn nan (null = melanje)
export async function saveDayTopics(topics: (string | null)[]): Promise<Result> {
  if (topics.length !== 7 || topics.some((t) => t !== null && !KEYS.has(t))) return { error: "Sijè yo pa valid." };
  const { error } = await createClient()
    .from("quote_day_topics")
    .upsert(topics.map((kategori, weekday) => ({ weekday, kategori })));
  if (error) return { error: error.message };
  revalidatePath("/admin/sitasyon");
  return {};
}
