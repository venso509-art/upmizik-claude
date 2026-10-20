import Link from "next/link";
import { RANGES, type Range } from "@/lib/stats";

// Bouton 7 / 30 / 90 jou (paramèt ?jou= nan adrès la)
export function RangeFilter({ basePath, current }: { basePath: string; current: Range }) {
  return (
    <div className="inline-flex rounded-full bg-zinc-800 p-1">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`${basePath}?jou=${r}`}
          className={`rounded-full px-4 py-1.5 text-sm transition ${current === r ? "bg-fuchsia-500 font-semibold text-white" : "text-zinc-300 hover:text-white"}`}
        >
          {r} jou
        </Link>
      ))}
    </div>
  );
}
