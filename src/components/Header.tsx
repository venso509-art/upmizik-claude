import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, role").eq("id", user.id).single()
    : { data: null };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">Up</span>
          <span className="text-white">Mizik</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            {profile?.role === "artist" && (
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-white">
                📊 <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            {profile?.role === "artist" && (
              <Link
                href="/upload"
                className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                + Upload
              </Link>
            )}
            {profile?.role === "artist" ? (
              <Link href={`/atis/${user.id}`} className="hidden text-sm text-zinc-300 transition hover:text-white sm:inline">
                🎤 {profile.display_name}
              </Link>
            ) : (
              <span className="hidden text-sm text-zinc-300 sm:inline">🎧 {profile?.display_name ?? user.email}</span>
            )}
            <form action={logout}>
              <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white">
                Dekonekte
              </button>
            </form>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/konekte" className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:text-white">
              Konekte
            </Link>
            <Link
              href="/enskri"
              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Enskri
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
