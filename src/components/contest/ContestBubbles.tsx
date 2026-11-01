import Link from "next/link";
import type { TeamView } from "@/lib/contestServer";

// Paj akèy: ekip Konkou Nwèl yo an ti wonn (menm jan ak "Atis popilè yo"), klase dapre vòt
export function ContestBubbles({ teams, phase }: { teams: TeamView[]; phase: number }) {
  if (teams.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          🎄 Konkou Nwèl <span className="text-zinc-500">· {phase === 3 ? "Final" : phase === 2 ? "Demi-final" : "Vote pou lekòl ou"}</span>
        </h2>
        <Link href="/konkou" className="text-xs font-bold text-[#FFD700] hover:underline">
          Wè tout · Vote →
        </Link>
      </div>
      <ul className="-mx-4 mt-3 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {teams.map((t, i) => (
          <li key={t.id} className="shrink-0 snap-start">
            <Link href={`/konkou/${t.id}`} className="group flex w-[5.5rem] flex-col items-center text-center">
              <span className="relative">
                {/* Wonn Nwèl: wouj → lò → vèt */}
                <span className="absolute -inset-[3px] rounded-full bg-[conic-gradient(#E63946,#FFD700,#0A5C36,#E63946)]" aria-hidden />
                <span className="relative block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-[3px] border-zinc-950 bg-[#7A0E1F] transition group-hover:scale-105">
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg font-black text-white">{t.team_name.charAt(0).toUpperCase()}</span>
                  )}
                </span>
                {t.final_rank && t.final_rank <= 3 ? (
                  <span className="absolute -right-1 -top-1 text-xl">{["", "🥇", "🥈", "🥉"][t.final_rank]}</span>
                ) : (
                  i < 3 &&
                  t.votes > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD700] text-[11px] font-black text-[#0B132B] ring-2 ring-zinc-950">
                      {i + 1}
                    </span>
                  )
                )}
              </span>
              <span className="mt-2 w-full truncate text-xs font-bold text-white">{t.team_name}</span>
              <span className="w-full truncate text-[10px] text-zinc-500">{t.school_name}</span>
              <span className="text-[10px] font-black text-[#FFD700]">{t.votes.toLocaleString("fr-HT")} vòt</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
