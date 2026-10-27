import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmptyPush } from "@/lib/webpush";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Baz done a rele wout sa a lè yon notifikasyon kreye (trigger notifications_push + pg_net), ak sekrè pa l.
// Sit la pa konnen sekrè a: se push_targets (nan baz done a) ki verifye l. Move sekrè = lis vid = anyen pa pati.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-push-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return NextResponse.json({ error: "Pa otorize" }, { status: 401 });
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "id pa valid" }, { status: 400 });

  const supabase = createClient();
  const { data } = await supabase.rpc("push_targets", { p_notification: id, p_secret: secret });
  const endpoints = ((data ?? []) as { endpoint: string }[]).map((r) => r.endpoint);
  const results = await Promise.all(endpoints.map((e) => sendEmptyPush(e)));
  // Telefòn ki pa aksepte push ankò: efase yo
  await Promise.all(endpoints.filter((_, i) => results[i] === "gone").map((e) => supabase.rpc("push_remove", { p_endpoint: e, p_secret: secret })));
  return NextResponse.json({ sent: results.filter((r) => r === "ok").length, total: endpoints.length, results });
}
