import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { livekitConfig, liveRoomName, liveToken } from "@/lib/livekit";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bay yon "tikè" LiveKit pou yon live:
//  - atis k ap fè live la, oswa yon envite atis la aksepte → ka voye videyo/son
//  - tout lòt moun (menm san kont) → ka gade/tande sèlman
export async function POST(req: NextRequest) {
  const cfg = livekitConfig();
  if (!cfg) return NextResponse.json({ error: "Live yo poko konfigire sou sèvè a (kle LiveKit yo manke)." }, { status: 503 });

  const { liveId } = (await req.json().catch(() => ({}))) as { liveId?: string };
  if (!liveId || !UUID_RE.test(liveId)) return NextResponse.json({ error: "Live sa a pa valid." }, { status: 400 });

  const supabase = createClient();
  const [{ data: { user } }, { data: live }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("lives").select("id, artist_id, status, last_seen_at").eq("id", liveId).maybeSingle(),
  ]);
  if (!live || live.status !== "live") return NextResponse.json({ error: "Live sa a fini." }, { status: 404 });

  let canPublish = false;
  let name = "Fanatik";
  let identity = `anon-${crypto.randomUUID().slice(0, 12)}`;
  if (user) {
    identity = user.id;
    const [{ data: profile }, { data: guest }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("live_guests").select("id").eq("live_id", liveId).eq("user_id", user.id).eq("status", "accepted").maybeSingle(),
    ]);
    name = profile?.display_name ?? name;
    canPublish = live.artist_id === user.id || !!guest;
  }

  const token = liveToken({ apiKey: cfg.apiKey, apiSecret: cfg.apiSecret, room: liveRoomName(liveId), identity, name, canPublish });
  return NextResponse.json({ token, url: cfg.url, canPublish, identity, isHost: !!user && live.artist_id === user.id });
}
