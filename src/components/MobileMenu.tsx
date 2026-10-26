"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/auth/actions";
import { InstallAppButton } from "@/components/InstallAppPrompt";

export type MenuItem = { href: string; label: string; tone?: "admin" | "primary" };

// Meni ☰ pou telefòn: tout lyen header a nan yon panèl ki louvri anba l
export function MobileMenu({ items, name, loggedIn }: { items: MenuItem[]; name: string | null; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Fèmen meni an lè w chanje paj, oswa ak bouton Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Meni an louvri: paj la dèyè a BLOKE (pa woule menm si w pase dwèt sou li).
  // overflow:hidden pa ase sou iPhone, kidonk nou bloke glisman dwèt la tou, sòf andedan meni an.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const block = (e: TouchEvent | WheelEvent) => {
      const nav = navRef.current;
      if (nav && nav.contains(e.target as Node) && nav.scrollHeight > nav.clientHeight) return; // meni an li menm ka woule
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("wheel", block, { passive: false });
    return () => {
      [html.style.overflow, document.body.style.overflow] = prev;
      document.removeEventListener("touchmove", block);
      document.removeEventListener("wheel", block);
    };
  }, [open]);

  const tone = (t?: MenuItem["tone"]) =>
    t === "primary"
      ? "btn-primary font-semibold"
      : t === "admin"
        ? "text-amber-300 hover:bg-zinc-800"
        : "text-zinc-200 hover:bg-zinc-800";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-zinc-200 transition hover:bg-zinc-800"
        aria-label={open ? "Fèmen meni an" : "Louvri meni an"}
        aria-expanded={open}
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <>
          {/* Klike deyò panèl la pou fèmen l */}
          <div className="fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 touch-none bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <nav ref={navRef} className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-b border-zinc-800 bg-zinc-950 px-4 pb-5 pt-3 shadow-2xl">
            {name && <p className="px-3 pb-3 text-sm text-zinc-400">{name}</p>}
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`block rounded-xl px-3 py-3 text-base transition ${tone(item.tone)}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            {/* Enstale UpMizik sou ekran akèy la (Android: dirèkteman; iPhone: etap yo) */}
            <div className="mt-3 border-t border-zinc-800 pt-3">
              <InstallAppButton />
            </div>
            {loggedIn && (
              <form action={logout} className="mt-3 border-t border-zinc-800 pt-3">
                <button className="w-full rounded-xl border border-zinc-700 px-3 py-3 text-left text-base text-zinc-200 transition hover:border-zinc-500 hover:text-white">
                  ⎋ Dekonekte
                </button>
              </form>
            )}
          </nav>
        </>
      )}
    </>
  );
}
