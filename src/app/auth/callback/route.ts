import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lyen konfimasyon imèl la mennen isit la ak yon "code".
// Nou echanje code sa a kont yon sesyon, epi itilizatè a konekte.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  // Sa rive sitou si moun nan louvri lyen an nan yon lòt navigatè.
  // Imèl la konfime kanmenm: li jis bezwen konekte.
  return NextResponse.redirect(new URL("/konekte?konfime=1", request.url));
}
