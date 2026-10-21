import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { missingSupabaseEnv, supabaseEnv } from "./env";

// Rafrechi sesyon Supabase la anvan chak paj, epi mete nouvo cookies yo nan repons lan.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Si varyab Supabase yo manke (egz: pa make "Build Variable" nan Coolify), pa fè TOUT sit la
  // tonbe an 500: ekri yon avètisman klè nan jounal la, epi kite paj la montre paj erè a.
  const missing = missingSupabaseEnv();
  if (missing.length) {
    console.error(`[UpMizik] Varyab anviwònman ki manke: ${missing.join(", ")}. Gade /sante pou dyagnostik.`);
    return response;
  }
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Pa mete okenn kòd ant createServerClient ak getUser():
  // se apèl sa a ki renouvle tikè a si l prèske ekspire.
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Kont BLOKE: dekonekte l touswit, menm si li te deja konekte anvan admin nan bloke l
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
      if (profile?.status === "blocked") {
        await supabase.auth.signOut();
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/konekte";
        loginUrl.search = "?bloke=1";
        const redirect = NextResponse.redirect(loginUrl);
        // Pote cookies ki efase sesyon an yo sou redireksyon an
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
        return redirect;
      }
    }
  } catch (err) {
    // Supabase pa reponn (rezo, DNS...): pa bloke paj la pou sa
    console.error("[UpMizik] Middleware: Supabase pa reponn:", err);
  }

  return response;
}
