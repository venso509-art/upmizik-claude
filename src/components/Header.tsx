import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { MobileMenu, type MenuItem } from "@/components/MobileMenu";
import { BecomeArtistPrompt } from "@/components/registration/BecomeArtistPrompt";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { NotificationListener } from "@/components/inbox/NotificationListener";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SideRail, type RailItem } from "@/components/SideRail";

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
    ? await supabase.from("profiles").select("display_name, role, status, avatar_url").eq("id", user.id).single()
    : { data: null };
  const admin = await isAdmin(supabase, user?.id);
  // Kantite mesaj ki poko li (RLS la limite l a pwòp mesaj itilizatè a)
  const { count: unread } = user
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
    : { count: 0 };

  // Manm afilye apwouve: lyen "Espas manm" nan meni an (erè = migration manm yo poko kouri)
  const { data: member } = user ? await supabase.from("members").select("status").eq("user_id", user.id).maybeSingle() : { data: null };
  const isArtist = profile?.role === "artist";
  const canUpload = isArtist && profile?.status === "approved";
  const displayName = profile?.display_name ?? user?.email ?? null;

  // Lyen yo pou meni ☰ telefòn nan (menm lyen ak header òdinatè a)
  const menuItems: MenuItem[] = [
    ...(canUpload ? [{ href: "/upload", label: "Pibliye yon chante", icon: "upload" as const, tone: "primary" as const }] : []),
    ...(user && !isArtist ? [{ href: "/vin-atis", label: "Vin atis: pibliye mizik ou", icon: "mic" as const, tone: "primary" as const }] : []),
    ...(isArtist ? [{ href: "/dashboard", label: "Dashboard", icon: "grid" as const, hint: "Statistik, revni" }] : []),
    { href: "/konkou", label: "Konkou Nwèl 🎄", icon: "gift" as const, hint: "Vote pou lekòl ou" },
    { href: "/live", label: "Live yo", icon: "live" as const, hint: "An dirèk kounye a", tone: "live" as const },
    ...(isArtist ? [{ href: "/live/nouvo", label: "Fè yon live", icon: "mic" as const, hint: "Atis Pro" }] : []),
    { href: "/mesaj", label: "Mesaj", icon: "bell" as const, hint: "Notifikasyon", badge: unread ? String(unread > 99 ? "99+" : unread) : undefined },
    isArtist && user
      ? { href: `/atis/${user.id}`, label: "Paj atis mwen", icon: "user" as const, hint: "Pwofil piblik" }
      : { href: "/pwofil", label: "Pwofil mwen", icon: "user" as const, hint: "Foto, non" },
    { href: "/kredi", label: "Kredi mwen", icon: "coin" as const, hint: "Pou voye kado" },
    { href: "/telechaje", label: "Mizik offline", icon: "download" as const, hint: "San entènèt" },
    { href: "/sosyal", label: "Sosyal", icon: "chat" as const, hint: "Nouvèl atis yo" },
    member?.status === "approved"
      ? { href: "/manm/dashboard", label: "Espas manm", icon: "star" as const, hint: "Pseudo, kòb" }
      : { href: "/manm", label: "Vin manm afilye", icon: "star" as const, hint: "Touche chak mwa" },
    ...(admin ? [{ href: "/admin", label: "Admin", icon: "shield" as const, hint: "Jesyon sit la", tone: "admin" as const }] : []),
  ];

  // Ba gòch la sou òdinatè: menm lyen yo, an 2 gwoup
  const railGroups: { title: string; items: RailItem[] }[] = [
    {
      title: "Dekouvri",
      items: [
        { href: "/", label: "Akèy", icon: "home", hint: "Nouvo mizik" },
        { href: "/atis", label: "Atis", icon: "mic", hint: "Tout atis yo" },
        { href: "/sosyal", label: "Sosyal", icon: "chat", hint: "Nouvèl atis yo" },
        { href: "/konkou", label: "Konkou Nwèl", icon: "gift", hint: "Vote pou lekòl ou 🎄" },
        { href: "/live", label: "Live", icon: "live", hint: "An dirèk kounye a", tone: "live" },
        { href: "/telechaje", label: "Mizik offline", icon: "download", hint: "San entènèt" },
      ],
    },
    ...(user
      ? [
          {
            title: "Espas mwen",
            items: [
              ...(canUpload ? [{ href: "/upload", label: "Pibliye yon chante", icon: "upload" as const, hint: "Nouvo mizik", tone: "primary" as const }] : []),
              ...(!isArtist ? [{ href: "/vin-atis", label: "Vin atis", icon: "sparkle" as const, hint: "Pibliye mizik ou", tone: "primary" as const }] : []),
              ...(isArtist ? [{ href: "/dashboard", label: "Espas atis", icon: "grid" as const, hint: "Statistik, revni" }] : []),
              { href: "/mesaj", label: "Mesaj", icon: "bell" as const, hint: "Notifikasyon", badge: unread ? String(unread > 99 ? "99+" : unread) : undefined },
              member?.status === "approved"
                ? { href: "/manm/dashboard", label: "Espas manm", icon: "star" as const, hint: "Pseudo, kòb" }
                : { href: "/manm", label: "Vin manm afilye", icon: "star" as const, hint: "Touche chak mwa" },
              { href: "/kredi", label: "Kredi mwen", icon: "coin" as const, hint: "Pou voye kado" },
              ...(admin ? [{ href: "/admin", label: "Admin", icon: "shield" as const, hint: "Jesyon sit la", tone: "admin" as const }] : []),
            ] as RailItem[],
          },
        ]
      : []),
  ];

  return (
    <>
    {/* Ba gòch (òdinatè): bouton yo ak ikòn, li louvri lè w pase sourit la */}
    <SideRail
      groups={railGroups}
      user={user ? { name: displayName ?? "Mwen", avatarUrl: profile?.avatar_url ?? null, href: isArtist ? `/atis/${user.id}` : "/pwofil" } : null}
    />
    {/* pt safe-area: sou iPhone (app enstale), header a desann anba zòn kamera/lè a olye l kache anba l.
        Opak nèt (pa transparan, pa gen blur): paj la pa parèt dèyè l lè w ap woule, epi l rete estab
        (blur la te oblije rekalkile tout sa ki dèyè l chak fwa paj la bouje, sa te fè l tranble sou telefòn).
        translateZ(0): navigatè a mete header a sou pwòp kouch li, konsa li pa souke pandan scroll la. */}
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950 pt-[env(safe-area-inset-top)] shadow-[0_6px_24px_rgba(0,0,0,0.35)] [transform:translateZ(0)]">
      {/* Nouvo mesaj an dirèk: son + ti kat (pou tout moun ki konekte) */}
      {user && <NotificationListener userId={user.id} />}
      {/* Koutè yo: ti kat "Ou se atis? Vin atis" */}
      {user && !isArtist && <BecomeArtistPrompt />}
      {/* Ti liy limyè anba header a: vèt → jòn sitwon → vèt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-citron-400/40 to-transparent" aria-hidden />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight lg:hidden" aria-label="UpMizik: paj akèy">
          {/* Logo won UpMizik la */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white object-cover shadow-md shadow-fuchsia-900/40 ring-2 ring-white/10" />
          <span>
            <span className="bg-gradient-to-r from-citron-300 to-citron-500 bg-clip-text text-transparent">Up</span>
            <span className="text-white">Mizik</span>
          </span>
        </Link>

        {/* Ba rechèch la nan mitan (òdinatè), oswa bouton 🔍 (telefòn) */}
        <div className="flex min-w-0 flex-1 justify-end md:justify-center md:px-4 lg:px-6">
          <HeaderSearch />
        </div>

        {/* ☀️ / 🌙 Mòd klè oswa sonb */}
        <ThemeToggle />

        {user ? (
          <>
            {/* ===== ÒDINATÈ (1024px+): rès bouton yo nan ba gòch la ===== */}
            <div className="hidden shrink-0 items-center lg:flex">
              <Bell unread={unread ?? 0} />
            </div>

            {/* ===== TELEFÒN: 🔔 + meni ☰ ===== */}
            <div className="flex shrink-0 items-center gap-1 lg:hidden">
              <Bell unread={unread ?? 0} />
              <MobileMenu items={menuItems} name={displayName} loggedIn role={isArtist ? "artist" : "listener"} avatarUrl={profile?.avatar_url ?? null} />
            </div>
          </>
        ) : (
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2 lg:hidden">
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
    </>
  );
}
