import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { isAdmin } from "@/lib/admin";
import { MobileMenu, type MenuItem } from "@/components/MobileMenu";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { NotificationListener } from "@/components/inbox/NotificationListener";

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
    // pt safe-area: sou iPhone (app enstale), header a desann anba zòn kamera/lè a olye l kache anba l
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/55 pt-[env(safe-area-inset-top)] shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150">
      {/* Nouvo mesaj an dirèk: son + ti kat (pou tout moun ki konekte) */}
      {user && <NotificationListener userId={user.id} />}
      {/* Ti liy limyè anba header a: vèt → jòn sitwon → vèt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-citron-400/40 to-transparent" aria-hidden />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight" aria-label="UpMizik: paj akèy">
          {/* Logo won UpMizik la */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white object-cover shadow-md shadow-fuchsia-900/40 ring-2 ring-white/10" />
          <span>
            <span className="bg-gradient-to-r from-citron-300 to-citron-500 bg-clip-text text-transparent">Up</span>
            <span className="text-white">Mizik</span>
          </span>
        </Link>

        {/* Lyen prensipal yo sou òdinatè (sou telefòn yo nan ba anba a) */}
        <nav className="ml-4 hidden shrink-0 items-center gap-1 lg:flex">
          <Link href="/atis" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
            Atis
          </Link>
          <Link href="/sosyal" className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
            Sosyal
          </Link>
        </nav>

        {/* Ba rechèch la nan mitan (òdinatè), oswa bouton 🔍 (telefòn) */}
        <div className="flex min-w-0 flex-1 justify-end md:justify-center md:px-4 lg:px-6">
          <HeaderSearch />
        </div>

        {user ? (
          <>
            {/* ===== ÒDINATÈ (1024px+) ===== */}
            <div className="hidden shrink-0 items-center gap-2 xl:gap-3 lg:flex">
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
                  className="rounded-lg btn-primary px-3 py-1.5 text-sm font-semibold transition"
                >
                  + Upload
                </Link>
              )}
              <Link href="/telechaje" className="rounded-lg px-2 py-1.5 text-lg transition hover:bg-zinc-800" aria-label="Mizik offline" title="Mizik offline">
                📥
              </Link>
              <Bell unread={unread ?? 0} />
              <Link
                href={isArtist ? `/atis/${user.id}` : "/pwofil"}
                className="max-w-[8rem] truncate text-sm text-zinc-300 transition hover:text-white"
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
            <div className="flex shrink-0 items-center gap-1 lg:hidden">
              <Bell unread={unread ?? 0} />
              <MobileMenu items={menuItems} name={displayName} loggedIn />
            </div>
          </>
        ) : (
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/konekte" className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:text-white">
              Konekte
            </Link>
            <Link
              href="/enskri"
              className="rounded-lg btn-primary px-3 py-1.5 text-sm font-semibold transition"
            >
              Enskri
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
