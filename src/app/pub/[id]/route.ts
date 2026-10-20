import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// /pub/<id>: konte yon klik sou piblisite a, epi voye moun nan sou lyen piblisite a
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data } = await createClient().rpc("register_ad_click", { p_ad_id: params.id });
  const link = typeof data === "string" && data.startsWith("https://") ? data : null;
  return NextResponse.redirect(link ?? new URL("/", request.url));
}
