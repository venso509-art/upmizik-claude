import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { GENRES } from "@/lib/genres";
import { getTop10, getTop3 } from "@/lib/top";
import { Top10Section } from "@/components/Top10Section";
import { AdBanner, type PublicAd } from "@/components/ads/AdBanner";
import { Top3Section } from "@/components/Top3Section";
import { ArtistBubbles, type BubbleArtist } from "@/components/ArtistBubbles";
import { Reveal } from "@/components/Reveal";
import { SONG_SELECT, getSongExtras, toTrack, type SongRow } from "@/lib/songs";

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

export default async function Home({ searchParams }: { searchParams: { jan?: string } }) {
  // ?jan=Konpa → montre sèlman chante jan sa a (jiska 24); san jan → 8 dènye chante yo
  const genre = GENRES.find((g) => g === searchParams.jan) ?? null;
  const supabase = createClient();
  let songsQuery = supabase.from("songs").select(SONG_SELECT).order("created_at", { ascending: false });
  if (genre) songsQuery = songsQuery.eq("genre", genre);
  const { data: rows } = await songsQuery.limit(genre ? 24 : 8).returns<SongRow[]>();

  const songs = (rows ?? []).map((s) => toTrack(supabase, s));
  const { data: { user } } = await supabase.auth.getUser();
  const [extras, top3, myArtists, { data: adRows }] = await Promise.all([
    getSongExtras(supabase, songs.map((s) => s.id), user?.id ?? null),
    getTop3(supabase),
    user ? supabase.rpc("my_top_artists", { p_limit: 15 }) : Promise.resolve({ data: [] }),
    // RLS la bay sèlman piblisite ki aktif e ki poko ekspire (admin wè tout, kidonk nou refiltre)
    supabase.from("ads").select("id, title, image_path, is_active, starts_at, expires_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const now = Date.now();
  const ads: PublicAd[] = (adRows ?? [])
    .filter((a) => a.is_active && new Date(a.starts_at).getTime() <= now && (!a.expires_at || new Date(a.expires_at).getTime() > now))
    .slice(0, 10)
    .map((a) => ({ id: a.id, title: a.title, imageUrl: supabase.storage.from("ads").getPublicUrl(a.image_path).data.publicUrl }));

  // Atis moun nan koute plis; si li poko gen istwa, atis ki pi popilè yo
  let bubbles = (myArtists.data ?? []) as BubbleArtist[];
  let bubblesTitle = "🎧 Atis ou koute plis yo";
  if (bubbles.length === 0) {
    bubbles = ((await supabase.rpc("popular_artists", { p_limit: 15 })).data ?? []) as BubbleArtist[];
    bubblesTitle = "🔥 Atis popilè yo";
  }

  // Badj ✓ pou sèk yo, ak Top 10 otomatik la (san mizik ki deja nan Top 3 a)
  const [{ data: verifiedRows }, top10] = await Promise.all([
    bubbles.length
      ? supabase.from("profiles").select("id").eq("is_verified", true).in("id", bubbles.map((b) => b.artist_id))
      : Promise.resolve({ data: [] as { id: string }[] }),
    getTop10(supabase, top3.entries.map((e) => e.track.id)),
  ]);
  const verified = new Set((verifiedRows ?? []).map((r) => r.id));
  bubbles = bubbles.map((b) => ({ ...b, is_verified: verified.has(b.artist_id) }));

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-block motion-safe:animate-fade-up rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-300">
              Platfòm mizik 100% ayisyen
            </span>
            <h1 style={{ animationDelay: "100ms" }} className="mt-6 motion-safe:animate-fade-up text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
              Mizik ou merite{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 to-violet-500 bg-clip-text text-transparent">
                tande.
              </span>
            </h1>
            <p style={{ animationDelay: "200ms" }} className="mt-6 max-w-lg motion-safe:animate-fade-up text-lg text-zinc-400">
              Koute nouvo son ki soti dirèkteman nan men atis yo. Oswa pataje pwòp mizik ou ak
              tout mond lan, gratis.
            </p>
            <div style={{ animationDelay: "300ms" }} className="mt-8 flex flex-wrap gap-3 motion-safe:animate-fade-up">
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
          <div style={{ animationDelay: "250ms" }} className="hidden items-end justify-center gap-3 motion-safe:animate-fade-up md:flex" aria-hidden>
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

      {/* ===== SÈK ATIS YO (tankou estati WhatsApp), anba hero a ===== */}
      <Reveal>
        <ArtistBubbles title={bubblesTitle} artists={bubbles} />
      </Reveal>

      {/* ===== TOP 3 (admin chwazi) + TOP 10 (otomatik) ===== */}
      <Reveal>
        <Top3Section entries={top3.entries} auto={top3.auto} />
      </Reveal>
      <Reveal>
        <Top10Section entries={top10} />
      </Reveal>

      {/* ===== PIBLISITE ===== */}
      <Reveal>
        <AdBanner ads={ads} />
      </Reveal>

      {/* ===== DÈNYE CHANTE + FILT JAN MIZIK ===== */}
      <section id="nouvo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <Reveal>
          <h2 className="text-2xl font-bold text-white">{genre ? `🎵 ${genre}` : "Nouvo sou UpMizik"}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {genre ? `${songs.length} chante nan jan sa a.` : "Dènye chante atis yo pataje. Chwazi yon jan pou w filtre yo."}
          </p>

          {/* Bouton jan mizik yo: yon lyen (?jan=...) pou sèvè a filtre e pou lyen an ka pataje */}
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtre pa jan mizik">
            {[null, ...GENRES].map((g) => {
              const active = g === genre;
              return (
                <Link
                  key={g ?? "tout"}
                  href={g ? `/?jan=${encodeURIComponent(g)}#nouvo` : "/#nouvo"}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-fuchsia-500 bg-fuchsia-500 font-semibold text-white shadow-lg shadow-fuchsia-900/40"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {g ?? "Tout"}
                </Link>
              );
            })}
          </nav>
        </Reveal>

        {songs.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {songs.map((song, i) => (
              <Reveal key={song.id} delay={(i % 4) * 80}>
                <SongCard song={song} queue={songs} extras={extras[song.id]} currentUserId={user?.id ?? null} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <p className="text-4xl">🎶</p>
            <p className="mt-4 font-semibold text-white">{genre ? "Poko gen chante nan jan sa a." : "Poko gen chante."}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {genre ? "Se ou ki ka premye atis ki pibliye yon chante " + genre + "!" : "Se ou ki ka premye atis ki pataje mizik li sou UpMizik!"}
            </p>
            {genre && (
              <Link href="/#nouvo" className="mt-6 inline-block rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                Wè tout chante yo
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ===== POU ATIS YO ===== */}
      <Reveal as="section" className="mx-auto max-w-6xl px-4 pb-20">
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
      </Reveal>
    </>
  );
}
