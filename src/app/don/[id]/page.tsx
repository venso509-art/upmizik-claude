import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DonateButton } from "@/components/donate/DonateButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";
import { ARTIST_SHARE_PERCENT } from "@/lib/finance";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getArtist(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await createClient()
    .from("profiles")
    .select("id, display_name, avatar_url, is_verified")
    .eq("id", id)
    .eq("role", "artist")
    .eq("status", "approved")
    .is("archived_at", null)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist(params.id);
  return artist
    ? { title: `Sipòte ${artist.display_name} | UpMizik`, description: `Fè yon don bay ${artist.display_name} ak MonCash oswa NatCash.` }
    : { title: "Atis pa jwenn | UpMizik" };
}

const STEPS = [
  { icon: "💵", title: "Chwazi montan an", text: "An dola; nou kalkile li an goud pou ou." },
  { icon: "📱", title: "Voye l sou MonCash oswa NatCash", text: "Sou nimewo ofisyèl UpMizik la." },
  { icon: "📸", title: "Voye foto prèv la", text: "Yon screenshot mesaj konfimasyon an." },
  { icon: "✅", title: "Ekip la verifye l", text: "Apre sa, atis la resevwa lajan an." },
];

// Paj don apa pou yon atis: lyen sa a ka pataje sou WhatsApp, Instagram...
export default async function DonatePage({ params }: Props) {
  const artist = await getArtist(params.id);
  if (!artist) notFound();

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 max-w-3xl rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="relative mx-auto max-w-xl px-4 py-12 text-center">
        <span className="relative mx-auto block h-28 w-28">
        <span className="block h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 ring-4 ring-citron-400/40">
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.avatar_url} alt={artist.display_name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-4xl font-extrabold text-white">{artist.display_name.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <VerifiedCorner show={artist.is_verified} size="lg" position="bottom-0.5 right-0.5" />
        </span>
        <p className="mt-5 text-sm font-medium uppercase tracking-widest text-citron-300">💝 Sipòte atis la</p>
        <h1 className="mt-1 flex items-center justify-center text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {artist.display_name}
          {artist.is_verified && <VerifiedBadge size="lg" />}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Don ou ede {artist.display_name} kontinye fè mizik. <strong className="text-zinc-200">{ARTIST_SHARE_PERCENT}%</strong> ale dirèkteman bay atis la.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <DonateButton
            artistId={artist.id}
            artistName={artist.display_name}
            label={`Fè yon don bay ${artist.display_name}`}
            defaultOpen
            className="btn-primary inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <ShareLinkButton path={`/don/${artist.id}`} />
            <Link href={`/atis/${artist.id}`} className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white">
              🎤 Wè paj atis la
            </Link>
          </div>
        </div>

        <ol className="mt-12 grid gap-3 text-left sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-xl" aria-hidden>
                {s.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {i + 1}. {s.title}
                </span>
                <span className="block text-xs text-zinc-400">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
