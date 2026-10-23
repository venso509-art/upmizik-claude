import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { PlayAllButton, TrackList } from "@/components/TrackList";
import { DonateButton } from "@/components/donate/DonateButton";
import { SafeImage } from "@/components/SafeImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { ArtistSocialLinks } from "@/components/artist/ArtistSocialLinks";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";
import { computeTrophies, type TrophyStats } from "@/lib/trophies";
import { formatPlays } from "@/lib/levels";
import { RELEASE_LABELS, type ReleaseKind } from "@/lib/releases";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Artist = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified?: boolean;
  location?: string | null;
  influences?: string | null;
  vision?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  whatsapp_url?: string | null;
  banner_url?: string | null; // foto kouvèti a
};

const BASE_COLUMNS = "id, display_name, bio, avatar_url, created_at, is_verified";
const EXTRA_COLUMNS = "location, influences, vision, youtube_url, instagram_url";

async function getArtist(id: string): Promise<Artist | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const query = (columns: string) =>
    supabase.from("profiles").select(columns).eq("id", id).eq("role", "artist").is("archived_at", null).maybeSingle<Artist>();

  // Si nouvo kolòn yo poko egziste (migration poko kouri), eseye ak mwens kolòn
  for (const columns of [
    `${BASE_COLUMNS}, ${EXTRA_COLUMNS}, banner_url, tiktok_url, whatsapp_url`,
    `${BASE_COLUMNS}, ${EXTRA_COLUMNS}, banner_url`,
    `${BASE_COLUMNS}, ${EXTRA_COLUMNS}`,
  ]) {
    const res = await query(columns);
    if (!res.error) return res.data;
  }
  return (await query(BASE_COLUMNS)).data;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// SEO + aperçu WhatsApp/Facebook: foto kouvèti a (oswa avatar la) parèt lè moun pataje lyen an
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.id);
  if (!artist) return { title: "Atis pa jwenn | UpMizik" };
  const title = `${artist.display_name} | UpMizik`;
  const bio = artist.bio?.replace(/\s+/g, " ").trim();
  const description = bio
    ? bio.length > 150
      ? `${bio.slice(0, 147)}…`
      : bio
    : `Koute mizik ${artist.display_name} sou UpMizik, platfòm mizik 100% ayisyen. Sipòte atis la dirèkteman.`;
  const image = artist.banner_url || artist.avatar_url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "UpMizik",
      ...(image ? { images: [{ url: image, alt: artist.display_name }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

// Kat yon seksyon (kolòn bò kote a, ak biyografi a)
function SideCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="flex items-center gap-2 font-bold text-white">
        <span aria-hidden>{icon}</span> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// Mesaj lè yon seksyon vid: vizitè a wè yon ti fraz; atis la wè yon bouton pou l ranpli l
function Empty({ isOwner, text, cta, href }: { isOwner: boolean; text: string; cta: string; href: string }) {
  return isOwner ? (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-citron-400/50 bg-citron-400/5 px-4 py-4 text-sm font-semibold text-citron-300 transition hover:bg-citron-400/10"
    >
      {cta}
    </Link>
  ) : (
    <p className="text-sm italic text-zinc-400">{text}</p>
  );
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist(params.id);
  if (!artist) notFound();

  const supabase = createClient();
  const [{ data: rows }, { data: { user } }, { data: trophyRows }, { data: releaseRows }] = await Promise.all([
    supabase
      .from("songs")
      .select(SONG_SELECT)
      .eq("artist_id", artist.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .returns<SongRow[]>(),
    supabase.auth.getUser(),
    // Si migration trofe a poko kouri, data = null epi seksyon an montre mesaj vid la
    supabase.rpc("artist_trophy_stats", { p_artist: artist.id }),
    // Diskografi: EP, Mixtape, Album (vid si migration piblikasyon an poko kouri)
    supabase
      .from("releases")
      .select("id, title, kind, created_at, songs(cover_path, track_number, archived_at)")
      .eq("artist_id", artist.id)
      .order("created_at", { ascending: false }),
  ]);

  type RelSong = { cover_path: string | null; track_number: number | null; archived_at: string | null };
  const discography = ((releaseRows ?? []) as { id: string; title: string; kind: ReleaseKind; created_at: string; songs: RelSong[] }[])
    .map((r) => {
      const live = (r.songs ?? []).filter((s) => !s.archived_at).sort((a, b) => (a.track_number ?? 99) - (b.track_number ?? 99));
      const coverPath = live.find((s) => s.cover_path)?.cover_path ?? null;
      return {
        id: r.id,
        title: r.title,
        kind: r.kind,
        year: new Date(r.created_at).getFullYear(),
        count: live.length,
        coverUrl: coverPath ? supabase.storage.from("covers").getPublicUrl(coverPath).data.publicUrl : null,
      };
    })
    .filter((r) => r.count > 0);

  const songs = rows ?? [];
  const tracks = songs.map((s) => toTrack(supabase, s));
  const plays = Object.fromEntries(songs.map((s) => [s.id, s.play_count]));
  const totalPlays = songs.reduce((sum, s) => sum + s.play_count, 0);
  // POPILÈ: 5 chante ki pi koute yo
  const popular = [...songs]
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 5)
    .map((s) => tracks.find((t) => t.id === s.id)!)
    .filter(Boolean);
  const trophyStats = ((trophyRows ?? []) as TrophyStats[])[0] ?? null;
  const earned = trophyStats ? computeTrophies(trophyStats).filter((t) => t.earned) : [];

  const isOwner = user?.id === artist.id;
  const name = artist.display_name;
  const initials = initialsOf(name);
  const hasSocial = !!(artist.youtube_url || artist.instagram_url || artist.tiktok_url || artist.whatsapp_url);

  // Pwogresyon pwofil la (atis la sèlman)
  const checklist = [
    { done: !!artist.avatar_url, label: "Foto pwofil", href: "/pwofil#foto" },
    { done: !!artist.banner_url, label: "Foto kouvèti", href: "/pwofil#kouveti" },
    { done: !!artist.bio, label: "Biyografi", href: "/pwofil#bio" },
    { done: !!artist.location, label: "Vil ou", href: "/pwofil#bio" },
    { done: !!artist.influences, label: "Enspirasyon", href: "/pwofil#mizik" },
    { done: !!artist.vision, label: "Vizyon", href: "/pwofil#mizik" },
    { done: songs.length > 0, label: "Premye chante", href: "/upload" },
    { done: hasSocial, label: "Rezo sosyal", href: "/pwofil#lyen" },
  ];
  const percent = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const missing = checklist.filter((c) => !c.done);

  const avatarFallback = (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600 to-violet-800 text-4xl font-extrabold text-white">
      {initials}
    </span>
  );

  return (
    <>
      {/* ===== 0. PWOGRESYON (atis la sèlman) ===== */}
      {isOwner && percent < 100 && (
        <div className="border-b border-zinc-800 bg-zinc-900/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Pwofil ou ranpli <span className="text-citron-300">{percent}%</span>
            </p>
            <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-citron-400" style={{ width: `${percent}%` }} />
            </div>
            <Link href={missing[0].href} className="text-sm font-medium text-citron-300 hover:text-citron-200">
              Pwochen: {missing[0].label} →
            </Link>
          </div>
        </div>
      )}

      {/* ===== 1. BANYÈ ===== */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <SafeImage
            src={artist.banner_url}
            alt=""
            className="h-full w-full object-cover"
            fallback={
              // Pa gen kouvèti: gradyan UpMizik ak inisyal atis la an gwo
              <div className="relative h-full w-full bg-gradient-to-br from-fuchsia-800 via-violet-900 to-zinc-950">
                <span className="absolute -right-6 top-1/2 -translate-y-1/2 select-none text-[11rem] font-black leading-none text-white/[0.06] sm:text-[16rem]" aria-hidden>
                  {initials}
                </span>
                <span className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-citron-400/10 blur-3xl" aria-hidden />
              </div>
            }
          />
          {/* Fonse anba a pou tèks la toujou li byen */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/10" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pb-8 pt-28 text-center sm:flex-row sm:items-end sm:pt-40 sm:text-left">
          <div className="relative shrink-0">
            <div className="h-36 w-36 overflow-hidden rounded-full shadow-2xl shadow-black/60 ring-4 ring-zinc-950 sm:h-44 sm:w-44">
              <SafeImage src={artist.avatar_url} alt={name} className="h-full w-full object-cover" fallback={avatarFallback} />
            </div>
            <VerifiedCorner show={artist.is_verified} size="xl" position="bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5" />
          </div>
          <div className="min-w-0">
            {artist.is_verified && (
              <p className="inline-flex items-center gap-1 rounded-full bg-[#1D9BF0]/15 px-3 py-1 text-xs font-semibold text-sky-200 ring-1 ring-[#1D9BF0]/40">
                <VerifiedBadge className="!ml-0" /> Kont verifye
              </p>
            )}
            <h1 className="mt-2 break-words text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
              {name}
              {/* Badj la bò kote non an, tankou sou gwo rezo sosyal yo */}
              {artist.is_verified && <VerifiedBadge size="lg" className="ml-2 align-middle" />}
            </h1>
            <p className="mt-3 text-sm text-zinc-300 sm:text-base">
              <span className="font-semibold text-white">{totalPlays.toLocaleString("fr-HT")}</span> koute total
              {artist.location && <> · 📍 {artist.location}</>}
            </p>
            {isOwner && !artist.banner_url && (
              <Link href="/pwofil#kouveti" className="mt-3 inline-block text-sm font-medium text-citron-300 hover:text-citron-200">
                🖼️ Ajoute yon foto kouvèti
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* ===== 2. AKSYON ===== */}
        <div className="flex flex-wrap items-center justify-center gap-3 py-4 sm:justify-start">
          {tracks.length > 0 && <PlayAllButton tracks={popular.length ? [...popular, ...tracks.filter((t) => !popular.includes(t))] : tracks} label="▶ Jwe tout" />}
          <DonateButton
            artistId={artist.id}
            artistName={name}
            label="Sipòte"
            className="inline-flex items-center gap-2 rounded-full border-2 border-citron-400 px-5 py-2.5 font-semibold text-citron-300 transition hover:bg-citron-400 hover:text-zinc-950"
          />
          <ArtistSocialLinks
            links={{ youtube: artist.youtube_url, instagram: artist.instagram_url, tiktok: artist.tiktok_url, whatsapp: artist.whatsapp_url }}
          />
          {/* Pataje lyen pwofil la (WhatsApp, Instagram... sou telefòn; kopye sou òdinatè) */}
          <ShareLinkButton
            path={`/atis/${artist.id}`}
            label={isOwner ? "🔗 Pataje pwofil mwen" : "🔗 Pataje"}
            title={`${name} sou UpMizik`}
            className={
              isOwner
                ? "btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
                : "inline-flex h-11 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/70 px-4 text-sm font-medium text-zinc-200 transition hover:border-citron-400 hover:text-white"
            }
          />
          {isOwner && !hasSocial && (
            <Link href="/pwofil#lyen" className="rounded-full border border-dashed border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:text-white">
              🔗 Ajoute rezo sosyal ou
            </Link>
          )}
          {isOwner && (
            <Link href="/pwofil" className="ml-auto hidden rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:text-white sm:inline-block">
              ✏️ Modifye pwofil
            </Link>
          )}
        </div>

        <div className="grid gap-8 pb-16 pt-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* ===== KOLÒN PRENSIPAL ===== */}
          <div className="min-w-0 space-y-10">
            {/* 3. POPILÈ */}
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">🔥 Popilè</h2>
              <div className="mt-4">
                {popular.length > 0 ? (
                  <TrackList tracks={popular} plays={plays} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-10 text-center">
                    {isOwner ? (
                      <Link href="/upload" className="btn-primary inline-block rounded-full px-6 py-3">
                        ➕ Pibliye premye chante w
                      </Link>
                    ) : (
                      <p className="text-zinc-300">🎶 Premye chante {name} an ap rive byento. Rete branche!</p>
                    )}
                  </div>
                )}
              </div>
              {tracks.length > 5 && (
                <details className="group mt-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-300 hover:text-white">
                    <span className="group-open:hidden">Wè tout {tracks.length} chante yo ↓</span>
                    <span className="hidden group-open:inline">Kache ↑</span>
                  </summary>
                  <div className="mt-3">
                    <TrackList tracks={tracks} plays={plays} />
                  </div>
                </details>
              )}
            </section>

            {/* DISKOGRAFI: EP, Mixtape, Album */}
            {discography.length > 0 && (
              <section>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">💿 Diskografi</h2>
                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {discography.map((r) => (
                    <li key={r.id}>
                      <Link href={`/albom/${r.id}`} className="group block rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 transition hover:border-citron-400/40 hover:bg-zinc-900">
                        <span className="block aspect-square overflow-hidden rounded-xl">
                          <SafeImage
                            src={r.coverUrl}
                            alt={r.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            fallback={
                              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-700 to-violet-900 text-4xl">
                                {RELEASE_LABELS[r.kind].icon}
                              </span>
                            }
                          />
                        </span>
                        <span className="mt-2 block truncate font-semibold text-white">{r.title}</span>
                        <span className="block text-xs text-zinc-500">
                          {RELEASE_LABELS[r.kind].label} · {r.year} · {r.count} chante
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 4. BIYOGRAFI: tèks la sou foto atis la, ak yon fon fonse */}
            <section>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">📖 Biyografi</h2>
              <div className="relative isolate mt-4 overflow-hidden rounded-3xl border border-zinc-800">
                <div className="absolute inset-0 -z-10">
                  <SafeImage
                    src={artist.avatar_url}
                    alt=""
                    className="h-full w-full scale-110 object-cover opacity-40 blur-[2px]"
                    fallback={<div className="h-full w-full bg-gradient-to-br from-fuchsia-900/60 to-zinc-950" />}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/50" />
                </div>
                <div className="min-h-[12rem] p-6 sm:p-8">
                  {artist.bio ? (
                    <p className="max-w-2xl whitespace-pre-line break-words text-[15px] leading-relaxed text-zinc-200">{artist.bio}</p>
                  ) : (
                    <Empty isOwner={isOwner} text={`${name} poko rakonte istwa l. Sa pral vini.`} cta="✍️ Ekri bio w" href="/pwofil#bio" />
                  )}
                  <p className="mt-6 text-xs text-zinc-500">Sou UpMizik depi {new Date(artist.created_at).getFullYear()}</p>
                </div>
              </div>
            </section>
          </div>

          {/* ===== 5. KOLÒN BÒ KOTE ===== */}
          <aside className="space-y-4">
            <SideCard icon="🌟" title="Atis ki enspire m">
              {artist.influences ? (
                <p className="whitespace-pre-line break-words text-sm text-zinc-300">{artist.influences}</p>
              ) : (
                <Empty isOwner={isOwner} text="Toujou ap chèche enspirasyon 🎧" cta="🌟 Di ki atis ki enspire w" href="/pwofil#mizik" />
              )}
            </SideCard>
            <SideCard icon="🎯" title="Vizyon mwen">
              {artist.vision ? (
                <p className="whitespace-pre-line break-words text-sm text-zinc-300">{artist.vision}</p>
              ) : (
                <Empty isOwner={isOwner} text="Vizyon an ap prepare nan estidyo a." cta="🎯 Pataje vizyon w" href="/pwofil#mizik" />
              )}
            </SideCard>
            <SideCard icon="🏆" title={earned.length ? `Trofe (${earned.length})` : "Trofe"}>
              {earned.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2">
                  {earned.map((t) => (
                    <li key={t.id} className="rounded-xl border border-citron-400/25 bg-zinc-950/60 p-2 text-center" title={t.description}>
                      <span className="text-2xl" aria-hidden>
                        {t.emoji}
                      </span>
                      <p className="mt-1 text-[11px] font-semibold leading-tight text-white">{t.name}</p>
                    </li>
                  ))}
                </ul>
              ) : isOwner ? (
                <Empty isOwner text="" cta="➕ Pibliye yon chante pou premye trofe w" href="/upload" />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm italic text-zinc-400">Premye trofe a tou pre. Sipòte l pou l ka rive!</p>
                  <DonateButton artistId={artist.id} artistName={name} label={`Sipòte ${name}`} className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" />
                </div>
              )}
            </SideCard>
            {totalPlays > 0 && (
              <p className="text-center text-xs text-zinc-500">
                🎧 {formatPlays(totalPlays)} koute sou {songs.length} chante
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
