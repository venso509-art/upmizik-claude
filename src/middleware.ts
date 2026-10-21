import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Kouri sou tout paj yo, eksepte fichye estatik (imaj, CSS, JS, favicon)
  matcher: [
    // "sante": paj dyagnostik la dwe mache menm si gen yon pwoblèm ak Supabase
    "/((?!_next/static|_next/image|favicon.ico|sante|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|flac)$).*)",
  ],
};
