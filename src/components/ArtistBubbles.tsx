import Link from "next/link";
import { VerifiedCorner } from "@/components/VerifiedCorner";

export type BubbleArtist = { artist_id: string; display_name: string; avatar_url: string | null; plays: number; is_verified?: boolean };

// Ranje atis an sèk won (tankou estati WhatsApp), ki woule de goch a dwat
export function ArtistBubbles({ title, artists }: { title: string; artists: BubbleArtist[] }) {
  if (artists.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {artists.map((a) => (
          <li key={a.artist_id} className="shrink-0 snap-start">
            <Link href={`/atis/${a.artist_id}`} className="group flex w-20 flex-col items-center gap-2" title={a.display_name}>
              {/* Bòdi gradyan an, tankou yon estati WhatsApp */}
              <span className="relative rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[3px] transition group-hover:scale-105">
                <span className="block rounded-full bg-zinc-950 p-[3px]">
                  <span className="block h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xl font-extrabold text-white">
                        {a.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                </span>
                {/* Tchèk ble a sou kwen sèk la, pou l toujou parèt menm si non an long */}
                <VerifiedCorner show={a.is_verified} size="md" />
              </span>
              <span className="w-full truncate text-center text-xs text-zinc-300 group-hover:text-white">{a.display_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
