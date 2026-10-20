import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SongCard, type SongCardData } from "@/components/SongCard";
import { GENRES } from "@/lib/genres";

// Wotè ak reta chak ba nan egalizè a (pou yo pa danse ansanm)
const bars = [
  { h: "h-16", delay: "0s" },
  { h: "h-28", delay: "0.2s" },
  { h: "h-20", delay: "0.5s" },
  { h: "h-32", delay: "0.1s" },
  { h: "h-24", delay: "0.4s" },
  { h: "h-12", delay: "0.7s" },
  { h: "h-28", delay: "0.3s" },
];

export default async function Home() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("songs")
    .select("id, title, genre, cover_path, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(8);

  const songs: SongCardData[] = (rows ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    artistName: (s.profiles as any)?.display_name ?? "Atis enkoni",
    coverUrl: s.cover_path ? supabase.storage.from("covers").getPublicUrl(s.cover_path).data.publicUrl : null,
  }));

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-block rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-300">
              Platfòm mizik 100% ayisyen
            </span>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
              Mizik ou merite{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">
                tande.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-zinc-400">
              Koute nouvo son ki soti dirèkteman nan men atis yo. Oswa pataje pwòp mizik ou ak
              tout mond lan, gratis.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#nouvo"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-900/40 transition hover:opacity-90"
              >
                ▶ Kòmanse koute
              </a>
              <Link
                href="/enskri"
                className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                🎤 Mwen se atis
              </Link>
            </div>
          </div>

          {/* Egalizè animasyon */}
          <div className="hidden items-end justify-center gap-3 md:flex" aria-hidden>
            {bars.map((b, i) => (
              <span
                key={i}
                className={`${b.h} w-6 origin-bottom animate-equalizer rounded-full bg-gradient-to-t from-violet-600 to-fuchsia-400`}
                style={{ animationDelay: b.delay }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== JAN MIZIK ===== */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <span
              key={g}
              className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
            >
              {g}
            </span>
          ))}
        </div>
      </section>

      {/* ===== DÈNYE CHANTE ===== */}
      <section id="nouvo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-2xl font-bold text-white">Nouvo sou UpMizik</h2>
        <p className="mt-1 text-sm text-zinc-400">Dènye chante atis yo pataje.</p>

        {songs.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <p className="text-4xl">🎶</p>
            <p className="mt-4 font-semibold text-white">Poko gen chante.</p>
            <p className="mt-1 text-sm text-zinc-400">Se ou ki ka premye atis ki pataje mizik li sou UpMizik!</p>
          </div>
        )}
      </section>

      {/* ===== POU ATIS YO ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 to-violet-700 px-8 py-14 md:px-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative max-w-xl text-3xl font-extrabold text-white sm:text-4xl">
            Ou se atis? Fè mond lan tande w.
          </h2>
          <ul className="relative mt-6 space-y-2 text-fuchsia-50">
            <li>✓ Upload chante ou yo gratis</li>
            <li>✓ Pwòp paj atis ou</li>
            <li>✓ Wè konbyen moun ki koute w</li>
          </ul>
          <Link
            href="/enskri"
            className="relative mt-8 inline-block rounded-full bg-white px-6 py-3 font-semibold text-violet-700 transition hover:bg-zinc-100"
          >
            Kreye kont atis ou
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row">
          <p>
            <span className="font-bold text-zinc-300">UpMizik</span> © {new Date().getFullYear()}
          </p>
          <p>Fèt ak ❤️ pou mizik ayisyen</p>
        </div>
      </footer>
    </>
  );
}
