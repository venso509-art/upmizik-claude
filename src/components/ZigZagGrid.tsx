"use client";

import { useEffect, useRef } from "react";

// ===== Griy "zig-zag": kat pè yo (2yèm, 4yèm...) pi ba, sa fè yon vag; chak kat parèt lè l antre nan ekran an =====
// CSS + IntersectionObserver (san Framer Motion: pi lejè pou telefòn yo).
// Kantite kolòn yo toujou pè (2 / 4 / 6), kidonk kat pè yo toujou nan menm kolòn yo: vag la rete pwòp.
// San JavaScript: kat yo vizib nòmalman (klas "zz-ready" la pa janm mete).
export function ZigZagGrid({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    list.classList.add("zz-ready");
    const io = new IntersectionObserver(
      (entries) => {
        // Kat ki antre ansanm yo parèt youn apre lòt (0,1 s ant chak)
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => items.indexOf(a.target as HTMLElement) - items.indexOf(b.target as HTMLElement))
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            el.style.transitionDelay = `${i * 0.1}s`;
            el.classList.add("zz-in");
            io.unobserve(el);
          });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [children]);

  return (
    <ul ref={ref} aria-label={label} className="grid grid-cols-2 gap-x-3 gap-y-4 pb-10 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
      {children}
    </ul>
  );
}
