"use client";

import { useEffect, useState } from "react";

export type PublicAd = { id: string; title: string; imageUrl: string };

// Banyè piblisite ki chanje otomatikman chak 6 segonn (li kanpe lè sourit la sou li)
export function AdBanner({ ads }: { ads: PublicAd[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (ads.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length, paused]);

  if (ads.length === 0) return null;
  const ad = ads[index % ads.length];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10" aria-label="Piblisite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <p className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">Piblisite</p>
      <a
        href={`/pub/${ad.id}`}
        target="_blank"
        rel="noopener sponsored"
        className="group relative block aspect-[4/1] min-h-[96px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
        title={ad.title}
      >
        {ads.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={a.id}
            src={a.imageUrl}
            alt={a.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover:scale-[1.01] ${
              i === index % ads.length ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </a>
      {ads.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {ads.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index % ads.length ? "w-6 bg-fuchsia-500" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"}`}
              aria-label={`Piblisite ${i + 1}: ${a.title}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
