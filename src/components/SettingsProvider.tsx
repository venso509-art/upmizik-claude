"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

const SettingsContext = createContext<AppSettings>(DEFAULT_SETTINGS);

// Layout la chaje paramèt yo sou sèvè a, epi li ba yo tout konpozan navigatè yo
export function SettingsProvider({ settings, children }: { settings: AppSettings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
