"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { LineIcon, type LineIconName } from "@/components/LineIcon";

// ===== Ba navigasyon sou bò gòch (òdinatè sèlman, 1024px+) =====
// Fèmen: yon kolòn ikòn (76px). Lè w pase sourit la sou li: li louvri (248px) sou paj la, non chak bouton parèt.
// Telefòn yo kontinye itilize ba anba a + meni ☰ a.

export type RailItem = {
  href: string;
  label: string;
  icon: LineIconName;
  hint?: string;
  badge?: string;
  tone?: "primary" | "live" | "admin";
};

export function SideRail({
  groups,
  user,
}: {
  groups: { title: string; items: RailItem[] }[];
  user: { name: string; avatarUrl: string | null; href: string } | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside
      aria-label="Navigasyon prensipal"
      className="group/rail fixed inset-y-0 left-0 z-[45] hidden w-[76px] flex-col overflow-hidden border-r border-white/10 bg-zinc-950/95 pt-[env(safe-area-inset-top)] shadow-[8px_0_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-[width,box-shadow] duration-300 ease-out hover:w-[248px] hover:shadow-[16px_0_60px_-10px_rgba(0,0,0,0.75)] focus-within:w-[248px] lg:flex"
    >
      {/* Ti limyè dekorasyon */}
      <span className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-citron-400/10 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

      {/* Logo + non sit la */}
      <Link href="/" className="relative flex h-16 shrink-0 items-center gap-3 px-[18px]" aria-label="UpMizik: paj akèy">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-white object-cover shadow-lg shadow-black/40 ring-2 ring-citron-400/40" />
        <span className="whitespace-nowrap text-xl font-black tracking-tight opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
          <span className="bg-gradient-to-r from-citron-300 to-citron-500 bg-clip-text text-transparent">Up</span>
          <span className="text-white">Mizik</span>
        </span>
      </Link>

      <nav className="relative flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-width:none]">
        {groups.map((g) => (
          <div key={g.title}>
            {/* Tit gwoup la: yon ti liy lè ba a fèmen, tèks la lè l louvri */}
            <p className="relative mb-1.5 flex h-4 items-center px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              <span className="absolute left-3 h-px w-6 bg-white/10 transition-opacity duration-200 group-hover/rail:opacity-0 group-focus-within/rail:opacity-0" aria-hidden />
              <span className="whitespace-nowrap opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">{g.title}</span>
            </p>
            <ul className="space-y-1">
              {g.items.map((it) => {
                const active = isActive(it.href);
                const primary = it.tone === "primary";
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      title={it.label}
                      aria-current={active ? "page" : undefined}
                      className={`group/item relative flex h-12 items-center gap-3 rounded-2xl px-[11px] transition duration-200 ${
                        primary
                          ? "bg-gradient-to-br from-citron-300 to-citron-500 text-zinc-950 shadow-lg shadow-citron-400/20 hover:brightness-105"
                          : active
                            ? "bg-white/[0.09] text-white"
                            : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {/* Ba jòn sou bò gòch paj kote w ye a */}
                      {active && !primary && <span className="absolute -left-3 top-2 h-8 w-1 rounded-r-full bg-citron-400 shadow-[0_0_12px_rgba(255,215,0,0.7)]" aria-hidden />}
                      <span
                        className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover/item:scale-110 ${
                          primary
                            ? "bg-zinc-950 text-citron-300"
                            : active
                              ? "bg-citron-400 text-zinc-950"
                              : it.tone === "live"
                                ? "text-red-400"
                                : it.tone === "admin"
                                  ? "text-amber-300"
                                  : ""
                        }`}
                      >
                        <LineIcon name={it.icon} className="h-[19px] w-[19px]" />
                        {it.tone === "live" && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" aria-hidden />}
                        {it.badge && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-zinc-950">
                            {it.badge}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 -translate-x-1 whitespace-nowrap opacity-0 transition duration-300 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
                        <span className={`block text-sm font-bold leading-tight ${it.tone === "admin" && !active ? "text-amber-300" : ""}`}>{it.label}</span>
                        {it.hint && <span className={`block text-[11px] leading-tight ${primary ? "text-zinc-950/70" : "text-zinc-500"}`}>{it.hint}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Anba: kont moun nan (oswa Konekte / Enskri) */}
      <div className="relative border-t border-white/10 p-3">
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl px-[7px] py-1.5">
            <Link href={user.href} title={user.name} className="relative shrink-0">
              <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-citron-300 to-emerald-400" aria-hidden />
              <span className="relative block h-9 w-9 overflow-hidden rounded-full border-2 border-zinc-950 bg-zinc-800">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-sm font-black text-white">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
            </Link>
            <Link href={user.href} className="min-w-0 flex-1 whitespace-nowrap opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              <span className="block truncate text-sm font-bold text-white">{user.name}</span>
              <span className="block text-[11px] text-zinc-500">Wè pwofil mwen</span>
            </Link>
            <form action={logout} className="opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              <button
                type="submit"
                title="Dekonekte"
                aria-label="Dekonekte"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 ring-1 ring-white/10 transition hover:bg-red-500/15 hover:text-red-300 hover:ring-red-400/40"
              >
                <LineIcon name="logout" className="h-[18px] w-[18px]" />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-2">
            <Link href="/enskri" title="Enskri" className="flex h-11 items-center gap-3 rounded-2xl bg-gradient-to-br from-citron-300 to-citron-500 px-[11px] font-black text-zinc-950 shadow-lg shadow-citron-400/20">
              <LineIcon name="star" className="h-[19px] w-[19px] shrink-0" />
              <span className="whitespace-nowrap text-sm opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">Enskri gratis</span>
            </Link>
            <Link href="/konekte" title="Konekte" className="flex h-11 items-center gap-3 rounded-2xl px-[11px] font-bold text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-white">
              <LineIcon name="user" className="h-[19px] w-[19px] shrink-0" />
              <span className="whitespace-nowrap text-sm opacity-0 transition duration-300 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">Konekte</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
