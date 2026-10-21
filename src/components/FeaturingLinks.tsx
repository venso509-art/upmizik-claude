import Link from "next/link";
import type { FeaturedArtist } from "@/lib/songs";

// " feat. Atis A & Atis B": non atis featuring yo (pousantaj yo rete prive)
export function FeaturingLinks({ artists, className = "" }: { artists: FeaturedArtist[] | undefined; className?: string }) {
  if (!artists?.length) return null;
  return (
    <span className={className}>
      {" feat. "}
      {artists.map((a, i) => (
        <span key={a.id}>
          {i > 0 && (i === artists.length - 1 ? " & " : ", ")}
          <Link href={`/atis/${a.id}`} className="hover:text-white hover:underline">
            {a.name}
          </Link>
        </span>
      ))}
    </span>
  );
}
