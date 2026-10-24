import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SongCard } from "@/components/SongCard";
import { GENRES, normalizeGenre } from "@/lib/genres";
import { getTop10, getTop3 } from "@/lib/top";
import { Top10Section } from "@/components/Top10Section";
import { AdBanner, type PublicAd } from "@/components/ads/AdBanner";
import { PromoSection } from "@/components/promos/PromoSection";
import { getActivePromos } from "@/lib/promos";
import { Top3Section } from "@/components/Top3Section";
import { ArtistBubbles, type BubbleArtist } from "@/components/ArtistBubbles";
import { liveStatusIds } from "@/lib/statuses";
import { Reveal } from "@/components/Reveal";
import { SONG_SELECT, getSongExtras, toTrack, type SongRow } from "@/lib/songs";
import { SocialStrip } from "@/components/social/SocialStrip";
import { withImageUrls, type FeedPost } from "@/lib/posts";

// SEO paj akèy la (ak aperçu lè yon moun pataje lyen an)
const HOME_DESCRIPTION =
  "Mizik nou. Atis nou. Platfòm nou. Premye platfòm mizik 100% ayisyen: koute ak sipòte atis ayisyen yo gratis.";

export const metadata: Metadata = {
  description: HOME_DESCRIPTION,
  openGraph: {
    title: "UpMizik — Mizik nou. Atis nou. Platfòm nou.",
    description: HOME_DESCRIPTION,
    siteName: "UpMizik",
    type: "website",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "UpMizik: Platfòm mizik 100% ayisyen" }],
  },
};

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
  // Jan nan lis la OSWA yon jan atis yo ekri yo menm (egz: ?jan=Dancehall)
  const genre = normalizeGenre(searchParams.jan) ?? null;
  const supabase = createClient();
  let songsQuery = supabase.from("songs").select(SONG_SELECT).is("archived_at", null).order("created_at", { ascending: false });
  if (genre) songsQuery = songsQuery.eq("genre", genre);

  // Vitès: demann ki pa depann youn de lòt yo pati ANSANM (3 vag olye 6+ youn apre lòt)
  // Vag 1: tout sa ki pa bezwen anyen
  const [{ data: rows }, { data: { user } }, top3, { data: adRows }, promos, { data: feedRows }, { data: popularRows }] = await Promise.all([
    songsQuery.limit(genre ? 24 : 8).returns<SongRow[]>(),
    supabase.auth.getUser(),
    getTop3(supabase),
    // RLS la bay sèlman piblisite ki aktif e ki poko ekspire (admin wè tout, kidonk nou refiltre)
    supabase.from("ads").select("id, title, image_path, is_active, starts_at, expires_at").order("created_at", { ascending: false }).limit(20),
    getActivePromos(supabase),
    // Dènye pòs Sosyal yo (si yon migration poko kouri, data = null epi seksyon an vid)
    supabase.rpc("social_feed", { p_limit: 12 }),
    supabase.rpc("popular_artists", { p_limit: 15 }),
  ]);
  const songs = (rows ?? []).map((s) => toTrack(supabase, s));

  // Vag 2: sa ki bezwen chante yo, moun nan oswa Top 3 a
  const [extras, myArtists, top10, top3Extras] = await Promise.all([
    getSongExtras(supabase, songs.map((s) => s.id), user?.id ?? null),
    user ? supabase.rpc("my_top_artists", { p_limit: 15 }) : Promise.resolve({ data: [] }),
    // Top 10 otomatik la (san mizik ki deja nan Top 3 a)
    getTop10(supabase, top3.entries.map((e) => e.track.id)),
    // Likes, kòmantè ak featuring pou bouton Top 3 yo
    getSongExtras(supabase, top3.entries.map((e) => e.track.id), user?.id ?? null),
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
    bubbles = (popularRows ?? []) as BubbleArtist[];
    bubblesTitle = "🔥 Atis popilè yo";
  }

  // Vag 3: badj ✓ ak stati vivan (wonn vèt) atis yo nan sèk yo
  const bubbleIds = bubbles.map((b) => b.artist_id);
  const [{ data: verifiedRows }, bubbleStatuses] = await Promise.all([
    bubbleIds.length
      ? supabase.from("profiles").select("id").eq("is_verified", true).in("id", bubbleIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    liveStatusIds(supabase, bubbleIds),
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
              Chak Ekout Pouse Yon{" "}
              <span className="bg-gradient-to-r from-citron-300 to-citron-500 bg-clip-text text-transparent">Atis Ayisyen</span>
            </h1>
            <p style={{ animationDelay: "200ms" }} className="mt-6 max-w-lg motion-safe:animate-fade-up text-lg text-zinc-400">
              Platfòm difizyon kote fanatik sipòte atis dirèk pa MonCash ak NatCash. Atis la resevwa 85% chak don, dirèkteman sou kont li.
            </p>
            <div style={{ animationDelay: "300ms" }} className="mt-8 flex flex-wrap gap-3 motion-safe:animate-fade-up">
              <a
                href="#nouvo"
                className="rounded-full btn-primary px-6 py-3 font-semibold shadow-lg transition"
              >
                ▶ Koute kounye a
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
                className={`${b.h} w-6 origin-bottom animate-equalizer rounded-full bg-gradient-to-t from-fuchsia-700 via-fuchsia-500 to-citron-400`}
                style={{ animationDelay: b.delay }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== SÈK ATIS YO (tankou estati WhatsApp), anba hero a ===== */}
      <Reveal>
        <ArtistBubbles title={bubblesTitle} artists={bubbles} statuses={bubbleStatuses} />
      </Reveal>

      {/* ===== RPA: ATIS POU DEKOUVRI ===== */}
      <Reveal>
        <PromoSection promos={promos} />
      </Reveal>

      {/* ===== TOP 3 (admin chwazi) + TOP 10 (otomatik) ===== */}
      <Reveal>
        <Top3Section entries={top3.entries} auto={top3.auto} extras={top3Extras} currentUserId={user?.id ?? null} />
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
                      ? "border-fuchsia-500 bg-citron-400 font-semibold text-zinc-950 shadow-lg shadow-fuchsia-900/40"
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
      <Reveal as="section" className="mx-auto max-w-6xl px-4 pb-16">
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
            className="btn-primary relative mt-8 inline-block rounded-full px-6 py-3"
          >
            Kreye kont atis ou
          </Link>
        </div>
      </Reveal>

      {/* ===== SOSYAL: dènye pòs atis yo ===== */}
      <SocialStrip posts={withImageUrls(supabase, (feedRows ?? []) as FeedPost[])} now={now} />

    </>
  );
}
