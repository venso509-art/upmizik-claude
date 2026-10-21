import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, SETTINGS_SELECT, SETTINGS_SELECT_BASE, toSettings, type AppSettings, type SettingsRow } from "@/lib/settings";

// Li paramèt yo yon sèl fwa pa demann (cache React), pou tout paj yo ak layout la
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const supabase = createClient();
    const full = await supabase.from("settings").select(SETTINGS_SELECT).eq("id", true).maybeSingle<SettingsRow>();
    if (!full.error) return toSettings(full.data);
    // Si migration non kont lan poko kouri, li rès paramèt yo kanmenm
    const base = await supabase.from("settings").select(SETTINGS_SELECT_BASE).eq("id", true).maybeSingle<SettingsRow>();
    return toSettings(base.data);
  } catch {
    return DEFAULT_SETTINGS;
  }
});
