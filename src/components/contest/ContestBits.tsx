"use client";

import { useEffect, useState } from "react";

// Ti flòk nèj k ap tonbe (CSS sèlman, pozisyon fiks pou paj la pa chanje chak fwa)
export function Snow({ count = 28 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute top-[-10%] rounded-full bg-white motion-safe:animate-[snow-fall_linear_infinite]"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            width: 3 + (i % 4),
            height: 3 + (i % 4),
            opacity: 0.35 + (i % 5) * 0.12,
            animationDuration: `${7 + (i % 6) * 1.7}s`,
            animationDelay: `${-((i * 1.3) % 9)}s`,
            filter: i % 3 ? undefined : "blur(1px)",
          }}
        />
      ))}
    </div>
  );
}

// Kont a rebou jiska fen faz la
export function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  const parts = [
    [Math.floor(s / 86400), "jou"],
    [Math.floor((s % 86400) / 3600), "è"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "sek"],
  ] as const;
  if (left === 0) return <p className="text-sm font-bold text-[#FFD700]">⏰ Faz sa a fini!</p>;
  return (
    <div className="flex gap-2" role="timer" aria-label="Tan ki rete">
      {parts.map(([v, l]) => (
        <span key={l} className="flex min-w-[3.5rem] flex-col items-center rounded-2xl bg-white/10 px-2 py-2 ring-1 ring-white/15 backdrop-blur">
          <span className="text-2xl font-black tabular-nums text-white">{String(v).padStart(2, "0")}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{l}</span>
        </span>
      ))}
    </div>
  );
}
