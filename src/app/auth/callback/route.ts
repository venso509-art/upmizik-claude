import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lyen imèl yo (konfimasyon, "magic link") ak koneksyon Google mennen isit la ak yon "code".
// Nou echanje code sa a kont yon sesyon, epi itilizatè a konekte.
// "next" = paj moun nan te ye a (egz: chante l t ap koute a), pou n mennen l tounen la.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  // Sèlman yon chemen sou sit la (pa yon lòt sit)
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }

  // Sa rive sitou si moun nan louvri lyen an nan yon lòt navigatè.
  // Imèl la konfime kanmenm: li jis bezwen konekte.
  return NextResponse.redirect(new URL("/konekte?konfime=1", request.url));
}
