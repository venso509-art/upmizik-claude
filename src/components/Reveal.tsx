"use client";

import { useEffect, useRef, useState } from "react";

type State = "static" | "hidden" | "shown";

// Fè yon eleman glise monte (slide up + fade-in) lè l parèt sou ekran an pandan w ap desann.
// - Si eleman an deja vizib lè paj la louvri, li pa kache (pa gen "flash").
// - San JavaScript, oswa si moun nan mande "mwens mouvman", kontni an toujou vizib.
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number; // milisegonn, pou fè kat yo parèt youn apre lòt
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<State>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // deja vizib

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const motion =
    state === "hidden"
      ? "opacity-0 translate-y-6"
      : state === "shown"
        ? "opacity-100 translate-y-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        : "";

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`${motion} ${className}`}
      style={state === "shown" && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
