"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { youtubeThumbnail } from "@/lib/youtube";

export type Promo = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artistVerified: boolean;
  videoUrl: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
};

// Videyo san son ki jwe sèlman lè l vizib sou ekran an (pou ekonomize done mobil)
function MutedVideo({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduce) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-label={title}
      className="h-full w-full object-cover"
    />
  );
}

export function PromoSection({ promos }: { promos: Promo[] }) {
  if (promos.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">🚀 Atis pou dekouvri</h2>
      <p className="mt-1 text-sm text-zinc-400">Talan k ap monte ke ekip UpMizik la chwazi pou ou.</p>

      <ul className="-mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {promos.map((p) => (
          <li key={p.id} className="w-60 shrink-0 snap-start sm:w-64">
            <div className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:border-fuchsia-500/50">
              <div className="relative aspect-[9/12] bg-zinc-950">
                {p.videoUrl ? (
                  <MutedVideo src={p.videoUrl} title={p.title} />
                ) : p.youtubeId && p.youtubeUrl ? (
                  <a href={p.youtubeUrl} target="_blank" rel="noopener noreferrer" className="block h-full" aria-label={`Gade « ${p.title} » sou YouTube`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={youtubeThumbnail(p.youtubeId)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl text-white shadow-xl transition group-hover:scale-110">▶</span>
                    </span>
                  </a>
                ) : null}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                <p className="pointer-events-none absolute inset-x-3 bottom-3 truncate text-sm font-semibold text-white">{p.title}</p>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="min-w-0 truncate text-sm font-semibold text-white">
                  {p.artistName}
                  {p.artistVerified && <VerifiedBadge />}
                </p>
                <Link href={`/atis/${p.artistId}`} className="shrink-0 text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300">
                  Wè paj li →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
