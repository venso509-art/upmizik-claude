import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Service worker a rele sa lè yon push rive: dènye notifikasyon moun nan (RLS: pwòp notifikasyon li sèlman)
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, created_at")
    .eq("user_id", user.id)
    .gt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json(data ?? {}, { headers: { "Cache-Control": "no-store" } });
}
