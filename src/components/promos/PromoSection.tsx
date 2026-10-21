"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { youtubeThumbnail } from "@/lib/youtube";

export type Promo = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  artistVerified: boolean;
  videoUrl: string | null;
  imageUrl: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
};

// Evènman pou yon sèl videyo gen son alafwa
const SOUND_EVENT = "upmizik:rpa-sound";

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

// Videyo ki kòmanse SAN SON, epi ki jwe sèlman lè l vizib sou ekran an (pou ekonomize done mobil).
// Bouton 🔇/🔊 la pèmèt moun nan tande son an si l vle.
function PromoVideo({ id, src, title }: { id: string; src: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

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

  // Si yon lòt videyo mete son, sa a koupe pa l
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) setMuted(true);
    };
    window.addEventListener(SOUND_EVENT, onOther);
    return () => window.removeEventListener(SOUND_EVENT, onOther);
  }, [id]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    const next = !muted;
    setMuted(next);
    if (!next) {
      window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: id }));
      video.muted = false;
      video.play().catch(() => {});
    }
  }

  return (
    <>
      <video ref={ref} src={src} muted loop playsInline preload="metadata" aria-label={title} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={toggleSound}
        className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition hover:scale-110 ${
          muted ? "bg-black/55 text-white ring-1 ring-white/20" : "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/50"
        }`}
        aria-label={muted ? "Mete son an" : "Koupe son an"}
        aria-pressed={!muted}
        title={muted ? "Peze pou tande son an" : "Koupe son an"}
      >
        <SpeakerIcon muted={muted} />
      </button>
      {/* Ti endikasyon "Peze pou tande" anba bouton an, sèlman lè son an koupe */}
      {muted && (
        <span className="pointer-events-none absolute right-3 top-14 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
          🔇 San son
        </span>
      )}
    </>
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
                  <PromoVideo id={p.id} src={p.videoUrl} title={p.title} />
                ) : p.imageUrl ? (
                  // Imaj yo (GIF yo anime poukont yo)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
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
