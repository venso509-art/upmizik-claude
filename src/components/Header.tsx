import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { isAdmin } from "@/lib/admin";
import { MobileMenu, type MenuItem } from "@/components/MobileMenu";

function Bell({ unread }: { unread: number }) {
  return (
    <Link
      href="/mesaj"
      className="relative rounded-lg px-2 py-1.5 text-lg transition hover:bg-zinc-800"
      aria-label={unread ? `Mesaj (${unread} nouvo)` : "Mesaj"}
    >
      🔔
      {unread ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function SearchLink() {
  return (
    <Link href="/chache" className="rounded-lg px-2 py-1.5 text-lg transition hover:bg-zinc-800" aria-label="Chache" title="Chache">
      🔍
    </Link>
  );
}

export async function Header() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, role, status").eq("id", user.id).single()
    : { data: null };
  const admin = await isAdmin(supabase, user?.id);
  // Kantite mesaj ki poko li (RLS la limite l a pwòp mesaj itilizatè a)
  const { count: unread } = user
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
    : { count: 0 };

  const isArtist = profile?.role === "artist";
  const canUpload = isArtist && profile?.status === "approved";
  const displayName = profile?.display_name ?? user?.email ?? null;

  // Lyen yo pou meni ☰ telefòn nan (menm lyen ak header òdinatè a)
  const menuItems: MenuItem[] = [
    ...(canUpload ? [{ href: "/upload", label: "+ Pibliye yon chante", tone: "primary" as const }] : []),
    ...(admin ? [{ href: "/admin", label: "🛡️ Admin", tone: "admin" as const }] : []),
    ...(isArtist ? [{ href: "/dashboard", label: "📊 Dashboard" }] : []),
    { href: "/telechaje", label: "📥 Mizik offline" },
    { href: "/mesaj", label: `🔔 Mesaj${unread ? ` (${unread})` : ""}` },
    isArtist && user ? { href: `/atis/${user.id}`, label: "🎤 Paj atis mwen" } : { href: "/pwofil", label: "🎧 Pwofil mwen" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">Up</span>
          <span className="text-white">Mizik</span>
        </Link>

        {user ? (
          <>
            {/* ===== ÒDINATÈ (1024px+) ===== */}
            <div className="hidden items-center gap-3 lg:flex">
              {admin && (
                <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-300 transition hover:bg-zinc-800">
                  🛡️ Admin
                </Link>
              )}
              {isArtist && (
                <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-white">
                  📊 Dashboard
                </Link>
              )}
              {canUpload && (
                <Link
                  href="/upload"
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  + Upload
                </Link>
              )}
              <SearchLink />
              <Link href="/telechaje" className="rounded-lg px-2 py-1.5 text-lg transition hover:bg-zinc-800" aria-label="Mizik offline" title="Mizik offline">
                📥
              </Link>
              <Bell unread={unread ?? 0} />
              <Link
                href={isArtist ? `/atis/${user.id}` : "/pwofil"}
                className="max-w-[10rem] truncate text-sm text-zinc-300 transition hover:text-white"
              >
                {isArtist ? "🎤" : "🎧"} {displayName}
              </Link>
              <form action={logout}>
                <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white">
                  Dekonekte
                </button>
              </form>
            </div>

            {/* ===== TELEFÒN: 🔔 + meni ☰ ===== */}
            <div className="flex items-center gap-1 lg:hidden">
              <SearchLink />
              <Bell unread={unread ?? 0} />
              <MobileMenu items={menuItems} name={displayName} loggedIn />
            </div>
          </>
        ) : (
          <nav className="flex items-center gap-1 sm:gap-2">
            <SearchLink />
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
