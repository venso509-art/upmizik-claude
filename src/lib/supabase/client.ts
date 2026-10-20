import { createBrowserClient } from "@supabase/ssr";

// Kliyan Supabase pou kòd ki kouri nan navigatè a ("use client")
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
