import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

// Kliyan Supabase pou kòd ki kouri nan navigatè a ("use client")
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
