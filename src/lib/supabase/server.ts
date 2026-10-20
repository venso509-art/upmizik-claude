import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Kliyan Supabase pou kòd ki kouri sou sèvè a (Server Components, Server Actions, Route Handlers).
// Li li/ekri sesyon itilizatè a nan cookies.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
            // middleware la (n ap ajoute l nan etap otantifikasyon an) ap rafrechi sesyon an.
          }
        },
      },
    },
  );
}
