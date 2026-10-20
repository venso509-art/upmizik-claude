import Link from "next/link";

export type RankItem = { key: string; href: string; title: string; subtitle?: string; value: number; secondary?: string };

// Lis klasman ak yon ti ba orizontal (valè a toujou ekri, pa sèlman koulè)
export function RankList({ items, unit, empty }: { items: RankItem[]; unit: string; empty: string }) {
  if (items.length === 0) return <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} className="grid grid-cols-[1.5rem_1fr] items-center gap-3">
          <span className="text-right text-sm font-bold tabular-nums text-zinc-500">{i + 1}</span>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm">
                <Link href={item.href} className="font-semibold text-white hover:underline">
                  {item.title}
                </Link>
                {item.subtitle && <span className="text-zinc-500"> · {item.subtitle}</span>}
              </p>
              <p className="shrink-0 text-sm tabular-nums text-zinc-300">
                {item.value.toLocaleString("fr-HT")} <span className="text-zinc-500">{unit}</span>
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            {item.secondary && <p className="mt-1 text-xs text-zinc-500">{item.secondary}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
