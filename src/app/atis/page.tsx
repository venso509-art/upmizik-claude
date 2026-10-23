import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { SearchInput } from "@/components/search/SearchInput";
import { ScrollRow } from "@/components/ScrollRow";

export const metadata: Metadata = { title: "Atis | UpMizik", description: "Tout atis UpMizik yo." };

// San rechèch: yon sèl ranje orizontal pou moun nan glise. Ak rechèch: rezilta yo an griy.
function ArtistList({ searching, count, children }: { searching: boolean; count: number; children: React.ReactNode }) {
  if (searching) return <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{children}</ul>;
  return (
    <ScrollRow label="Atis UpMizik yo" caption={`${count} atis`}>
      {children}
    </ScrollRow>
  );
}

type ArtistRow ={ id: string; display_name: string; avatar_url: string | null; is_verified: boolean; location: string | null };

export default async function ArtistsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const supabase = createClient();

  // Ak rechèch: fonksyon san aksan an. San rechèch: tout atis apwouve yo pa non.
  let artists: ArtistRow[] = [];
  if (q.length >= 2) {
    const { data } = await supabase.rpc("search_artists", { p_q: q, p_limit: 30 });
    artists = ((data ?? []) as { artist_id: string; display_name: string; avatar_url: string | null; is_verified: boolean }[]).map((a) => ({
      id: a.artist_id,
      display_name: a.display_name,
      avatar_url: a.avatar_url,
      is_verified: a.is_verified,
      location: null,
    }));
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_verified, location")
      .eq("role", "artist")
      .eq("status", "approved")
      .is("archived_at", null)
      .order("is_verified", { ascending: false })
      .order("display_name")
      .limit(200)
      .returns<ArtistRow[]>();
    artists = data ?? [];
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 max-w-3xl rounded-full bg-violet-600/15 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">Dekouvri</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">🎤 Atis yo</h1>
        <p className="mt-2 text-zinc-400">Tout atis ki sou UpMizik. Klike sou youn pou w koute mizik li.</p>

        <div className="mt-6 max-w-xl">
          <SearchInput initial={q} placeholder="Chache yon atis…" />
        </div>

        {artists.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-5xl">{q ? "🤷🏾" : "🎤"}</p>
            <p className="mt-4 text-lg font-semibold text-white">{q ? `Pa gen atis pou « ${q} »` : "Poko gen atis"}</p>
          </div>
        ) : (
          <div className="mt-8">
          <ArtistList searching={!!q} count={artists.length}>
            {artists.map((a) => (
              <li key={a.id} className={q ? "" : "w-40 shrink-0 snap-start sm:w-44"}>
                <Link
                  href={`/atis/${a.id}`}
                  className="group flex flex-col items-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center transition hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:bg-zinc-900"
                >
                  <span className="relative rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[3px] transition group-hover:scale-105">
                    <span className="block rounded-full bg-zinc-950 p-[3px]">
                      <span className="block h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
                        {a.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-3xl font-extrabold text-white">
                            {a.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                    </span>
                    <VerifiedCorner show={a.is_verified} size="lg" position="bottom-0.5 right-0.5" />
                  </span>
                  <span className="mt-3 flex w-full items-center justify-center font-semibold text-white">
                    <span className="truncate">{a.display_name}</span>
                    {a.is_verified && <VerifiedBadge />}
                  </span>
                  <span className="mt-0.5 w-full truncate text-xs text-zinc-500">{a.location ? `📍 ${a.location}` : "🎤 Atis"}</span>
                </Link>
              </li>
            ))}
          </ArtistList>
          </div>
        )}
      </div>
    </div>
  );
}
