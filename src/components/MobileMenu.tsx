"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/auth/actions";
import { InstallAppButton } from "@/components/InstallAppPrompt";
import { Portal } from "@/components/Portal";
import { LineIcon, type LineIconName } from "@/components/LineIcon";

export type MenuItem = {
  href: string;
  label: string;
  icon: LineIconName;
  hint?: string; // ti tèks gri anba non an
  badge?: string; // egz: kantite mesaj, "LIVE"
  tone?: "admin" | "primary" | "live";
};

// Meni ☰ pou telefòn: kat pwofil, gwo bouton aksyon, epi yon griy bouton ak ikòn (menm stil ak footer a)
export function MobileMenu({
  items,
  name,
  loggedIn,
  role,
  avatarUrl,
}: {
  items: MenuItem[];
  name: string | null;
  loggedIn: boolean;
  role?: "artist" | "listener";
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const close = () => setOpen(false);

  // Fèmen meni an lè w chanje paj, oswa ak bouton Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Meni an louvri: paj la dèyè a BLOKE (pa woule menm si w pase dwèt sou li).
  // NB: SÈLMAN sou <html>. Si <body> gen overflow:hidden tou, li vin bwat header "sticky" a,
  // epi header a (ak meni an) monte anlè paj la e disparèt lè w te deja desann nan paj la.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const block = (e: TouchEvent | WheelEvent) => {
      const nav = navRef.current;
      if (
        nav &&
        nav.contains(e.target as Node) &&
        nav.scrollHeight > nav.clientHeight
      )
        return; // meni an li menm ka woule
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("wheel", block, { passive: false });
    return () => {
      html.style.overflow = prev;
      document.removeEventListener("touchmove", block);
      document.removeEventListener("wheel", block);
    };
  }, [open]);

  const primary = items.filter((i) => i.tone === "primary");
  const grid = items.filter((i) => i.tone !== "primary");
  // Stagger: chak eleman antre youn apre lòt (45 ms ant yo), tankou yon lis k ap dewoule
  const step = (i: number) => ({ animationDelay: `${50 + i * 45}ms` });
  const ITEM = "motion-safe:animate-menu-item";
  const firstGrid = (name ? 1 : 0) + primary.length + 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${open ? "bg-citron-400 text-zinc-950" : "text-zinc-200 hover:bg-white/10"}`}
        aria-label={open ? "Fèmen meni an" : "Louvri meni an"}
        aria-expanded={open}
      >
        {/* 3 ba ki tounen yon X */}
        <span className="relative block h-3.5 w-5" aria-hidden>
          <span
            className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
          />
          <span
            className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
          />
        </span>
      </button>

      {open && (
        <>
          {/* Meni an ak fon fonse a mete dirèkteman sou <body>, jis anba header a:
              konsa okenn kouch nan paj la (blur header a, fon paj akèy la...) pa ka kouvri yo */}
          <Portal>
            <div
              className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-[55] touch-none bg-black/55 backdrop-blur-[2px]"
              onClick={close}
              aria-hidden
            />
            <nav
              ref={navRef}
              className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-[60] max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain rounded-b-3xl border-b border-white/10 bg-zinc-950/95 px-4 pb-5 pt-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl motion-safe:animate-menu-drop lg:hidden"
            >
              {/* ===== Kat pwofil ===== */}
              {name && (
                <div style={step(0)} className={`${ITEM} flex items-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-700/80 to-fuchsia-900/60 p-3 ring-1 ring-white/10`}>
                  <span className="relative h-12 w-12 shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-[#FFD700]"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD700] text-lg font-black text-[#0B132B]">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-fuchsia-800" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-white">
                      {name}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                      <LineIcon
                        name={role === "artist" ? "mic" : "user"}
                        className="h-3 w-3"
                      />
                      {role === "artist" ? "Atis" : "Fanatik"} · Anliy
                    </span>
                  </span>
                </div>
              )}

              {/* ===== Gwo bouton aksyon (jòn) ===== */}
              {primary.length > 0 && (
                <div className="mt-3 space-y-2">
                  {primary.map((item, i) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      style={step((name ? 1 : 0) + i)}
                      className={`${ITEM} btn-primary flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-bold transition active:scale-[0.98]`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B132B] text-[#FFD700]">
                        <LineIcon name={item.icon} />
                      </span>
                      {item.label}
                      <span className="ml-auto" aria-hidden>
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* ===== Griy bouton yo ===== */}
              <p style={step(firstGrid - 1)} className={`${ITEM} mb-2.5 mt-5 flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-[0.22em] text-white`}>
                <span
                  className="h-3.5 w-1 rounded-full bg-citron-400"
                  aria-hidden
                />
                Meni
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {grid.map((item, gi) => {
                  const active = pathname === item.href;
                  const tile =
                    item.tone === "admin"
                      ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
                      : item.tone === "live"
                        ? "bg-red-600/15 text-red-400 ring-red-500/30"
                        : active
                          ? "bg-citron-400 text-zinc-950 ring-citron-300"
                          : "bg-white/[0.06] text-zinc-300 ring-white/10";
                  return (
                    <li key={item.href} style={step(firstGrid + gi)} className={ITEM}>
                      <Link
                        href={item.href}
                        onClick={close}
                        className={`group relative flex h-full items-center gap-2.5 rounded-2xl p-2.5 ring-1 transition active:scale-[0.97] ${
                          active
                            ? "bg-white/[0.08] ring-citron-400/50"
                            : "bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-200 group-hover:scale-105 ${tile}`}
                        >
                          <LineIcon name={item.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-semibold leading-tight text-white">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                              {item.hint}
                            </span>
                          )}
                        </span>
                        {item.badge && (
                          <span
                            className={`absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-none ${
                              item.tone === "live"
                                ? "bg-red-600 text-white"
                                : "bg-[#FFD700] text-[#0B132B]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* ===== Enstale app la + dekonekte ===== */}
              <div style={step(firstGrid + grid.length)} className={`${ITEM} mt-4 space-y-2 border-t border-white/10 pt-4`}>
                <InstallAppButton />
                {loggedIn && (
                  <form action={logout}>
                    <button className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-semibold text-zinc-300 transition hover:bg-white/[0.05] hover:text-white">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                        <LineIcon name="logout" />
                      </span>
                      Dekonekte
                    </button>
                  </form>
                )}
              </div>
            </nav>
          </Portal>
        </>
      )}
    </>
  );
}
