"use client";

import { useEffect, useRef, useState } from "react";

// Ranje orizontal: moun nan glise de goch a dwat (telefòn), oswa li klike sou flèch ‹ › yo (òdinatè)
export function ScrollRow({ children, label, caption }: { children: React.ReactNode; label: string; caption?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function update() {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  const arrow =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/90 text-xl text-white shadow-xl backdrop-blur transition hover:border-citron-400 hover:text-citron-300 md:flex";

  return (
    <div>
      {caption && (
        <p className="mb-3 text-sm text-zinc-400">
          {caption}
          {/* Endikasyon an parèt SÈLMAN lè gen plis pou woule */}
          {(canNext || canPrev) && (
            <>
              {" · "}
              <span className="md:hidden">glise pou w wè yo tout →</span>
              <span className="hidden md:inline">sèvi ak flèch ‹ › yo pou w wè yo tout</span>
            </>
          )}
        </p>
      )}
      {/* Flèch yo santre sou ranje a li menm (pa sou tèks anlè a) */}
      <div className="relative">
      {canPrev && (
        <button type="button" onClick={() => scrollBy(-1)} className={`${arrow} -left-3`} aria-label="Atis anvan yo">
          ‹
        </button>
      )}
      <ul
        ref={ref}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {canNext && (
        <button type="button" onClick={() => scrollBy(1)} className={`${arrow} -right-3`} aria-label="Lòt atis yo">
          ›
        </button>
      )}
      {/* Ti fondi sou kote dwat la pou montre gen plis atis */}
      {canNext && <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent md:hidden" aria-hidden />}
      </div>
    </div>
  );
}
