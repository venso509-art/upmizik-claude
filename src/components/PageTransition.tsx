"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// ===== Tranzisyon ant paj yo (CSS sèlman, san Framer Motion: pi lejè pou telefòn yo) =====

// 1. Paj la parèt dousman epi l glise monte yon ti kras (~0,4 s) chak fwa w chanje paj.
//    "key" = chemen paj la: React rekreye anvlòp la, kidonk animasyon an rejwe.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="motion-safe:animate-page-in">
      {children}
    </div>
  );
}

// 2. Ti ba jòn ki kouri anlè ekran an pandan pwochen paj la ap chaje.
//    Li kòmanse lè w klike sou yon lyen sit la, epi l fini lè nouvo paj la parèt.
function TopLoaderInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null); // null = kache
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const route = `${pathname}?${search.toString()}`;
  const startRoute = useRef(route);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Klik sou yon lyen entèn (pa yon nouvo onglè, pa menm paj la, pa yon telechajman)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // menm paj (egz: #ankre)
      clear();
      startRoute.current = `${location.pathname}?${new URLSearchParams(location.search).toString()}`;
      setProgress(8);
      // Li avanse vit an premye, epi pi dousman (pa janm rive 100 % anvan paj la parèt)
      [
        [80, 30],
        [300, 55],
        [700, 72],
        [1500, 85],
        [3000, 92],
      ].forEach(([ms, p]) => timers.current.push(setTimeout(() => setProgress((cur) => (cur === null ? null : Math.max(cur, p))), ms)));
      // Sekirite: si navigasyon an pa janm fèt (erè), kache ba a apre 10 s
      timers.current.push(setTimeout(() => setProgress(null), 10000));
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, []);

  // Nouvo paj la parèt: ba a fini (100 %), epi l disparèt
  useEffect(() => {
    if (route === startRoute.current) return;
    startRoute.current = route;
    clear();
    setProgress((cur) => (cur === null ? null : 100));
    timers.current.push(setTimeout(() => setProgress(null), 350));
  }, [route]);

  if (progress === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden>
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-[#0A5C36] via-[#FFD700] to-[#FFE34D] shadow-[0_0_10px_rgba(255,215,0,0.7)] transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1, transitionDelay: progress >= 100 ? "0ms, 150ms" : undefined }}
      />
    </div>
  );
}

// useSearchParams bezwen yon Suspense nan layout la
export function TopLoader() {
  return (
    <Suspense fallback={null}>
      <TopLoaderInner />
    </Suspense>
  );
}
