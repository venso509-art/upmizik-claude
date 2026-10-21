import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, SETTINGS_SELECT, toSettings, type AppSettings, type SettingsRow } from "@/lib/settings";

// Li paramèt yo yon sèl fwa pa demann (cache React), pou tout paj yo ak layout la
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const { data } = await createClient().from("settings").select(SETTINGS_SELECT).eq("id", true).maybeSingle<SettingsRow>();
    return toSettings(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
});
