"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Bwat rechèch la: rezilta yo chanje pandan w ap tape (apre yon ti poz)
export function SearchInput({ initial, autoFocus = false }: { initial: string; autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const q = value.trim();
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [value, pathname, router]);

  return (
    <form action="/chache" role="search" onSubmit={(e) => e.preventDefault()} className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Chache yon chante, yon atis, yon jan…"
        aria-label="Chache"
        className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 py-4 pl-12 pr-4 text-base text-white placeholder:text-zinc-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
      />
    </form>
  );
}
