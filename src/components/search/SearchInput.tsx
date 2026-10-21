"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Bwat rechèch la: rezilta yo chanje pandan w ap tape (apre yon ti poz)
export function SearchInput({
  initial,
  autoFocus = false,
  placeholder = "Chache yon chante, yon atis, yon jan…",
}: {
  initial: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
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
      // Kenbe lòt filtè yo (egz: ?f=bloke), men rekòmanse paj yo (?avan)
      const params = new URLSearchParams(window.location.search);
      params.delete("avan");
      const q = value.trim();
      if (q) params.set("q", q);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [value, pathname, router]);

  return (
    <form action={pathname} role="search" onSubmit={(e) => e.preventDefault()} className="relative flex-1">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Chache"
        className="w-full rounded-full border border-zinc-700 bg-zinc-900/80 py-4 pl-12 pr-5 text-base shadow-lg shadow-black/30 text-white placeholder:text-zinc-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
      />
    </form>
  );
}
