import { NextResponse } from "next/server";
import { vapidConfig } from "@/lib/webpush";

export const dynamic = "force-dynamic";

// Kle PIBLIK VAPID la (navigatè a bezwen l pou l aktive push). Kle prive a pa janm kite sèvè a.
export function GET() {
  const cfg = vapidConfig();
  return NextResponse.json({ key: cfg?.publicKey ?? null }, { headers: { "Cache-Control": "no-store" } });
}
