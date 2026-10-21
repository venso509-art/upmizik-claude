"use client";

import { useEffect, useState } from "react";

export type PublicAd = { id: string; title: string; imageUrl: string };

// Animasyon ki envite moun klike: yon ti men "klike" sou bouton an, epi yon vag
// soti kote l peze a pou l gaye sou tout bandwòl la. (Kanpe si moun nan mande mwens mouvman.)
function ClickInvite() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Vag yo: de sèk ki gaye soti nan bouton an (dezyèm lan an reta pou efè vag) */}
      <span className="absolute bottom-[1.35rem] right-[1.9rem] sm:bottom-[1.6rem] sm:right-[2.4rem]">
        <span className="absolute left-0 top-0 h-[min(2400px,240vw)] w-[min(2400px,240vw)] rounded-full border-[28px] border-white/60 bg-white/10 opacity-0 shadow-[inset_0_0_120px_rgba(217,70,239,0.45)] motion-safe:animate-ad-ripple" />
        <span className="absolute left-0 top-0 h-[min(2400px,240vw)] w-[min(2400px,240vw)] rounded-full border-[18px] border-fuchsia-400/60 opacity-0 [animation-delay:0.25s] motion-safe:animate-ad-ripple" />
      </span>

      {/* Bouton "Klike la" ak flèch ki bouje */}
      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full btn-primary px-3 py-1.5 text-xs font-bold shadow-lg shadow-black/40 ring-1 ring-white/30 motion-safe:animate-ad-press sm:bottom-4 sm:right-4 sm:px-4 sm:py-2 sm:text-sm">
        Klike la
        <svg viewBox="0 0 24 24" className="h-4 w-4 motion-safe:animate-ad-nudge" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>

      {/* Ti men ki klike sou bouton an */}
      <span className="absolute -bottom-1 right-2 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] motion-safe:animate-ad-tap sm:-bottom-0.5 sm:right-3 sm:text-3xl">
        👆
      </span>
    </span>
  );
}

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
        className="group relative block aspect-[4/1] min-h-[96px] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
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
        <ClickInvite />
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
