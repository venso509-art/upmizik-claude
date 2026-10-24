import { NextResponse } from "next/server";
import { missingSupabaseEnv } from "@/lib/supabase/env";

// /sante: dyagnostik sèvè a. Pa janm montre valè sekrè yo, sèlman ✅/❌.
// Middleware la pa kouri sou paj sa a (gade src/middleware.ts), kidonk li mache menm si rès sit la kraze.
export const dynamic = "force-dynamic";

export async function GET() {
  const missing = missingSupabaseEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Èske sèvè a ka jwenn Supabase?
  let supabase: { ok: boolean; status?: number; ms?: number; error?: string } = { ok: false, error: "Pa teste (varyab ki manke)" };
  if (url && key) {
    const start = Date.now();
    try {
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      supabase = { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch (err) {
      supabase = { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const ok = missing.length === 0 && supabase.ok;
  return NextResponse.json(
    {
      ok,
      mesaj: ok
        ? "✅ Tout bagay anfòm."
        : missing.length
          ? `❌ Varyab ki manke: ${missing.join(", ")}. Nan Coolify, ajoute yo kòm "Build Variable" epi refè deploy la.`
          : "❌ Sèvè a pa ka jwenn Supabase. Tcheke URL la ak koneksyon VPS la.",
      varyab: {
        NEXT_PUBLIC_SUPABASE_URL: url ? `✅ (${new URL(url).host})` : "❌ manke",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key ? `✅ (${key.slice(0, 15)}...)` : "❌ manke",
      },
      // Live yo (LiveKit): nou di sèlman si kle yo la, JAMÈ valè yo
      live: {
        LIVEKIT_URL: process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL ? "✅" : "❌ manke (LIVEKIT_URL oswa NEXT_PUBLIC_LIVEKIT_URL)",
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? "✅" : "❌ manke",
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? "✅" : "❌ manke",
      },
      supabase,
      node: process.version,
      lè: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
