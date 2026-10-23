"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Suggestions } from "@/app/api/chache/route";
import { Portal } from "@/components/Portal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { GENRES } from "@/lib/genres";

const EMPTY: Suggestions = { artists: [], songs: [] };

// Chache sijesyon yo pandan moun nan ap tape (apre yon ti poz, epi anile ansyen demann yo)
function useSuggestions(query: string) {
  const [data, setData] = useState<Suggestions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chache?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setData(res.ok ? await res.json() : EMPTY);
        setLoading(false);
      } catch {
        // Demann anile (moun nan kontinye tape): pa fè anyen
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return { data, loading, ready: q.length >= 2 };
}

// Mete pati ki matche a an gra ("pelen" → **Pèlen**), san konte aksan
function Highlight({ text, query }: { text: string; query: string }) {
  // Karaktè pa karaktè (UTF-16) pou pozisyon yo rete menm jan ak tèks orijinal la
  const fold = (s: string) => s.split("").map((c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().charAt(0) || c).join("");
  const q = fold(query.trim());
  const i = q ? fold(text).indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-fuchsia-300">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

type Item = { key: string; href: string };

function itemsFor(data: Suggestions, query: string): Item[] {
  return [
    ...data.artists.map((a) => ({ key: `a-${a.id}`, href: `/atis/${a.id}` })),
    ...data.songs.map((s) => ({ key: `s-${s.id}`, href: `/chante/${s.id}` })),
    { key: "all", href: `/chache?q=${encodeURIComponent(query.trim())}` },
  ];
}

// Lis rezilta yo (menm pou panèl òdinatè a ak ekran telefòn nan)
function Results({
  query,
  data,
  loading,
  active,
  onPick,
  onHover,
}: {
  query: string;
  data: Suggestions;
  loading: boolean;
  active: number;
  onPick: () => void;
  onHover: (i: number) => void;
}) {
  const nothing = !loading && data.artists.length === 0 && data.songs.length === 0;
  const row = (i: number) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 transition ${active === i ? "bg-white/10" : "hover:bg-white/5"}`;
  const allIndex = data.artists.length + data.songs.length;

  return (
    <div className="space-y-1">
      {loading && data.artists.length === 0 && data.songs.length === 0 && (
        <div className="space-y-2 p-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-zinc-800/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {nothing && (
        <div className="px-3 py-8 text-center">
          <p className="text-3xl">🤷🏾</p>
          <p className="mt-2 text-sm text-zinc-300">Nou pa jwenn anyen pou « {query.trim()} »</p>
        </div>
      )}

      {data.artists.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Atis</p>
          {data.artists.map((a, i) => (
            <Link key={a.id} href={`/atis/${a.id}`} onClick={onPick} onMouseEnter={() => onHover(i)} className={row(i)}>
              <span className="relative shrink-0">
                <span className="block h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 ring-2 ring-fuchsia-500/30">
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center font-bold text-white">{a.name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <VerifiedCorner show={a.verified} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-white">
                  <Highlight text={a.name} query={query} />
                  {a.verified && <VerifiedBadge />}
                </span>
                <span className="text-xs text-zinc-500">🎤 Atis</span>
              </span>
            </Link>
          ))}
        </>
      )}

      {data.songs.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Chante</p>
          {data.songs.map((s, j) => {
            const i = data.artists.length + j;
            return (
              <Link key={s.id} href={`/chante/${s.id}`} onClick={onPick} onMouseEnter={() => onHover(i)} className={row(i)}>
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-700">
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg">🎵</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    <Highlight text={s.title} query={query} />
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    <Highlight text={s.artistName} query={query} />
                    {s.genre && <> · {s.genre}</>}
                  </span>
                </span>
              </Link>
            );
          })}
        </>
      )}

      {!nothing && !(loading && allIndex === 0) && (
        <Link
          href={`/chache?q=${encodeURIComponent(query.trim())}`}
          onClick={onPick}
          onMouseEnter={() => onHover(allIndex)}
          className={`mt-1 flex items-center justify-between border-t border-zinc-800 px-3 pb-1 pt-3 text-sm font-medium text-fuchsia-300 transition ${active === allIndex ? "text-fuchsia-200" : ""}`}
        >
          <span>🔍 Wè tout rezilta pou « {query.trim()} »</span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

// Jan mizik yo kòm sijesyon lè bwat la vid
function GenreChips({ onPick }: { onPick: () => void }) {
  return (
    <div className="px-3 py-2">
      <p className="pb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">🎶 Eksplore pa jan</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g}
            href={`/?jan=${encodeURIComponent(g)}#nouvo`}
            onClick={onPick}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
          >
            {g}
          </Link>
        ))}
      </div>
    </div>
  );
}

const inputBase =
  "w-full bg-transparent text-[15px] text-white placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden";

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false); // panèl òdinatè a
  const [mobileOpen, setMobileOpen] = useState(false); // ekran telefòn nan
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, loading, ready } = useSuggestions(query);
  const items = itemsFor(data, query);

  // Fèmen tout lè paj la chanje
  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  }, [pathname]);

  useEffect(() => setActive(-1), [data]);

  // Klike deyò panèl la pou fèmen l
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Bouton "/" pou ale dirèkteman nan ba rechèch la (tankou YouTube)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (window.matchMedia("(min-width: 768px)").matches) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Bloke paj la dèyè ekran rechèch telefòn nan
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && ready) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && ready) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = active >= 0 ? items[active]?.href : ready ? `/chache?q=${encodeURIComponent(query.trim())}` : null;
    if (!target) return;
    setOpen(false);
    setMobileOpen(false);
    router.push(target);
  }

  const close = () => {
    setOpen(false);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ===== ÒDINATÈ: ba won nan mitan header a ===== */}
      <div ref={boxRef} className="relative hidden w-full max-w-md md:block">
        <form onSubmit={submit} role="search">
          <div
            className={`group flex h-11 items-center gap-2 rounded-full border px-4 transition ${
              open
                ? "border-fuchsia-500/60 bg-zinc-900 shadow-lg shadow-fuchsia-900/20 ring-4 ring-fuchsia-500/10"
                : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-600"
            }`}
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 shrink-0 transition ${open ? "text-fuchsia-400" : "text-zinc-500"}`} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Chache atis, chante, jan…"
              aria-label="Chache"
              autoComplete="off"
              className={inputBase}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                aria-label="Efase"
              >
                ✕
              </button>
            ) : (
              <kbd className="hidden shrink-0 rounded-md border border-zinc-700 px-1.5 text-[11px] text-zinc-500 lg:block">/</kbd>
            )}
          </div>
        </form>

        {open && (
          <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
            {ready ? (
              <Results query={query} data={data} loading={loading} active={active} onPick={close} onHover={setActive} />
            ) : (
              <GenreChips onPick={close} />
            )}
          </div>
        )}
      </div>

      {/* ===== TELEFÒN: bouton 🔍 ki louvri yon ekran rechèch ===== */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-200 transition hover:bg-zinc-800 md:hidden"
        aria-label="Chache"
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>

      {mobileOpen && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-zinc-950 motion-safe:animate-fade-up md:hidden" role="dialog" aria-modal aria-label="Chache">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
            <form onSubmit={submit} role="search" className="relative flex items-center gap-2 border-b border-zinc-800/80 px-3 py-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-zinc-300 transition hover:bg-zinc-800"
                aria-label="Fèmen"
              >
                ←
              </button>
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-fuchsia-500/50 bg-zinc-900 px-4 ring-4 ring-fuchsia-500/10">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  placeholder="Chache atis, chante, jan…"
                  aria-label="Chache"
                  autoComplete="off"
                  enterKeyHint="search"
                  className={inputBase}
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="text-sm text-zinc-400" aria-label="Efase">
                    ✕
                  </button>
                )}
              </div>
            </form>
            <div className="relative flex-1 overflow-y-auto p-2">
              {ready ? (
                <Results query={query} data={data} loading={loading} active={-1} onPick={close} onHover={() => {}} />
              ) : (
                <GenreChips onPick={close} />
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
