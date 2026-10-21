import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

// Kliyan Supabase pou kòd ki kouri sou sèvè a (Server Components, Server Actions, Route Handlers).
// Li li/ekri sesyon itilizatè a nan cookies.
export function createClient() {
  const cookieStore = cookies();
  const { url, key } = supabaseEnv();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components pa ka ekri cookies. Sa pa grav:
            // middleware la (src/middleware.ts) ap rafrechi sesyon an.
          }
        },
      },
    },
  );
}
