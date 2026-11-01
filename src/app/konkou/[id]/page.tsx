import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadContest } from "@/lib/contestServer";
import { MEDALS } from "@/lib/contest";
import { VoteButton } from "@/components/contest/VoteButton";
import { Snow } from "@/components/contest/ContestBits";
import { PlayAllButton } from "@/components/TrackList";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadContest();
  const t = data?.teams.find((x) => x.id === params.id);
  if (!t) return { title: "Konkou Nwèl | UpMizik" };
  return {
    title: `${t.team_name} · ${t.school_name} | Konkou Nwèl UpMizik`,
    description: t.slogan ?? `Vote pou ${t.team_name} (${t.school_name}) nan Konkou Chante Nwèl UpMizik.`,
    openGraph: { images: t.photo_url ? [{ url: t.photo_url }] : undefined },
  };
}

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Paj yon ekip: foto, eslogan, elèv yo, chante a (faz 2), klasman, bouton vòt
export default async function ContestTeamPage({ params }: Props) {
  const data = await loadContest();
  if (!data) notFound();
  const { contest, teams } = data;
  const index = teams.findIndex((x) => x.id === params.id);
  if (index < 0) notFound();
  const t = teams[index];
  const medal = t.final_rank ? MEDALS[t.final_rank] : null;
  const finished = teams.some((x) => x.final_rank);
  const goal = contest.phase === 1 ? contest.phase1_goal : contest.phase === 2 ? contest.phase2_goal : contest.phase3_goal;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Link href="/konkou" className="text-sm font-semibold text-zinc-400 hover:text-white">
        ← Tout ekip yo
      </Link>

      <section className="force-dark relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0B132B] via-[#3A0A14] to-[#7A0E1F] text-white shadow-2xl shadow-black/50">
        <Snow count={18} />
        <div className="relative grid gap-6 p-5 sm:grid-cols-[1.1fr_1fr] sm:p-8">
          <div className="overflow-hidden rounded-3xl ring-2 ring-[#FFD700]/40">
            {t.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photo_url} alt={`Ekip ${t.team_name}`} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <span className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-[#7A0E1F] to-[#0A5C36] text-6xl font-black">{initials(t.team_name)}</span>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">🎄 {contest.title}</p>
            <h1 className="mt-2 text-4xl font-black leading-tight">{t.team_name}</h1>
            {t.slogan && <p className="mt-1 text-lg italic text-[#FFE34D]">« {t.slogan} »</p>}
            <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/20">🏫 {t.school_name}</p>
            <div className="mt-5 flex items-end gap-4">
              <span>
                <span className="block text-5xl font-black tabular-nums text-[#FFD700]">{t.votes.toLocaleString("fr-HT")}</span>
                <span className="block text-xs font-bold uppercase tracking-wider text-white/60">
                  {goal ? `/ ${goal} vòt` : "vòt"} · faz {contest.phase}
                </span>
              </span>
              <span className="rounded-2xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/15">
                <span className="block text-2xl font-black">{medal ? medal.icon : `#${index + 1}`}</span>
                <span className="block text-[10px] font-bold uppercase text-white/60">{medal ? medal.label : "plas"}</span>
              </span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              {!finished && <VoteButton big teamId={t.id} teamName={t.team_name} schoolName={t.school_name} price={contest.vote_price_htg} open={contest.voting_open} />}
              <ShareLinkButton
                path={`/konkou/${t.id}`}
                label="📤 Pataje"
                title={`${t.team_name} · Konkou Nwèl UpMizik`}
                text={`🎄 Vote pou ${t.team_name} (${t.school_name}) nan Konkou Chante Nwèl UpMizik!`}
                className="rounded-full bg-white/10 px-6 py-4 font-bold text-white ring-1 ring-white/25 hover:bg-white/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chante a (faz 2) */}
      {t.track && (
        <section className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-[#FFD700]/30 bg-gradient-to-r from-[#FFD700]/10 to-transparent p-5">
          <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
            {t.track.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.track.coverUrl} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-widest text-[#FFD700]">🎙️ Chante Nwèl ekip la</span>
            <span className="block truncate text-xl font-black text-white">{t.track.title}</span>
          </span>
          <PlayAllButton tracks={[t.track]} label="▶ Koute l" />
        </section>
      )}

      {/* Elèv yo */}
      {t.members.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xl font-black text-white">🎤 Atis yo</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {t.members.map((m, i) => (
              <li key={m.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center motion-safe:animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="relative mx-auto block h-24 w-24">
                  <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#FFD700] via-[#E63946] to-[#0A5C36]" aria-hidden />
                  <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-zinc-950 bg-[#7A0E1F] text-2xl font-black text-white">
                    {m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo_url} alt={m.display_name} className="h-full w-full object-cover" />
                    ) : (
                      initials(m.display_name)
                    )}
                  </span>
                </span>
                <p className="mt-3 text-lg font-black text-white">{m.display_name}</p>
                {m.role && <p className="text-xs font-bold uppercase tracking-wider text-[#FFD700]">{m.role}</p>}
                {m.bio && <p className="mt-2 text-sm text-zinc-400">{m.bio}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.description && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-black text-white">📖 Prezantasyon</h2>
          <p className="mt-2 whitespace-pre-line text-zinc-300">{t.description}</p>
        </section>
      )}
    </div>
  );
}
