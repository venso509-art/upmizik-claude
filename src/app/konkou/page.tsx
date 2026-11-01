import type { Metadata } from "next";
import Link from "next/link";
import { loadContest, type TeamView } from "@/lib/contestServer";
import { MEDALS, PHASES } from "@/lib/contest";
import { VoteButton } from "@/components/contest/VoteButton";
import { Countdown, Snow } from "@/components/contest/ContestBits";
import { ShareLinkButton } from "@/components/donate/ShareLinkButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Konkou Chante Nwèl | UpMizik",
  description: "Lekòl Tomond yo ap chante pou Nwèl. Vote pou ekip ou pi renmen an sou UpMizik: 50 goud = 1 vòt.",
};

const initials = (s: string) =>
  s
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function TeamPhoto({ team, className }: { team: TeamView; className: string }) {
  return team.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={team.photo_url} alt={`Ekip ${team.team_name}`} className={`${className} object-cover`} />
  ) : (
    <span className={`${className} flex items-center justify-center bg-gradient-to-br from-[#7A0E1F] to-[#0A5C36] text-3xl font-black text-white`}>{initials(team.team_name)}</span>
  );
}

export default async function ContestPage() {
  const data = await loadContest();
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-6xl">🎄</p>
        <h1 className="mt-4 text-3xl font-black text-white">Konkou Nwèl la ap vini byento</h1>
      </div>
    );
  }
  const { contest, teams } = data;
  const max = Math.max(1, ...teams.map((t) => t.votes));
  const total = teams.reduce((s, t) => s + t.votes, 0);
  const winners = contest.phase === 3 ? teams.filter((t) => t.final_rank && t.final_rank <= 3) : [];
  const finished = winners.length > 0;
  // Objektif faz kounye a (faz 1: kalifye, faz 2: objektif), pa gen objektif nan final la
  const goal = contest.phase === 1 ? contest.phase1_goal : contest.phase === 2 ? contest.phase2_goal : contest.phase3_goal;
  const barPct = (v: number) => Math.max(2, Math.min(100, (v / (goal ?? max)) * 100));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* ===== GWO BÀNYÈ NWÈL ===== */}
      <section className="force-dark relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0B132B] via-[#3A0A14] to-[#7A0E1F] px-6 py-10 text-white shadow-2xl shadow-black/50 sm:px-10 sm:py-14">
        <Snow />
        <span className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#FFD700]/20 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-2 right-3 text-6xl opacity-60 drop-shadow-[0_0_30px_rgba(255,215,0,0.5)] sm:bottom-auto sm:right-12 sm:top-10 sm:text-8xl sm:opacity-90" aria-hidden>
          🎄
        </span>

        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#FFD700] ring-1 ring-white/20">
            ✨ UpMizik prezante
          </p>
          <h1 className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-6xl">
            {/* Mo « Nwèl » la an lò, nan plas li nan tit la */}
            {contest.title.split(/(Nwèl)/).map((part, i) =>
              part === "Nwèl" ? (
                <span key={i} className="bg-gradient-to-r from-[#FFE34D] to-[#E6C000] bg-clip-text text-transparent">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </h1>
          {contest.subtitle && <p className="mt-3 text-lg text-white/85">{contest.subtitle}</p>}

          {/* 3 faz yo */}
          <ol className="mt-6 flex flex-wrap gap-2">
            {PHASES.map((p) => {
              const state = p.n < contest.phase ? "done" : p.n === contest.phase ? "now" : "next";
              return (
                <li
                  key={p.n}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
                    state === "now" ? "bg-[#FFD700] text-[#0B132B] shadow-lg shadow-[#FFD700]/30" : state === "done" ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40" : "bg-white/10 text-white/60 ring-1 ring-white/15"
                  }`}
                >
                  <span aria-hidden>{state === "done" ? "✓" : p.icon}</span> Faz {p.n}: {p.label}
                </li>
              );
            })}
          </ol>

          {contest.phase_ends_at && !finished && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">Tan ki rete pou vote</p>
              <Countdown until={contest.phase_ends_at} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <a href={finished ? "#gayan" : "#ekip"} className="rounded-full bg-[#FFD700] px-7 py-3.5 font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/30 transition hover:-translate-y-0.5">
              {finished ? "🏆 Wè gayan yo" : contest.voting_open ? "🗳️ Vote kounye a" : "🏫 Wè ekip yo"}
            </a>
            <ShareLinkButton
              path="/konkou"
              label="📤 Pataje konkou a"
              title={contest.title}
              text={`🎄 ${contest.title}: vote pou lekòl ou sou UpMizik!`}
              className="rounded-full bg-white/10 px-6 py-3.5 font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
            />
          </div>
        </div>
      </section>

      {/* ===== OBJEKTIF CHAK FAZ ===== */}
      {!finished && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [1, "🗳️", `Faz 1: ${contest.phase1_goal} vòt`, "Chak ekip ki rive la kalifye pou demi-final la."],
            [2, "🎙️", `Faz 2: objektif ${contest.phase2_goal} vòt`, `Chante yo sou UpMizik. Se ${contest.finalists} premye yo ki ale nan final la.`],
            [3, "🏆", `Final: ${contest.phase3_goal} vòt`, `${contest.finalists} finalis yo. Yon vrè chanpyon depase ${contest.phase3_goal} vòt pou 1ye, 2yèm ak 3yèm pri.`],
          ].map(([n, icon, t, d]) => (
            <div
              key={String(n)}
              className={`rounded-2xl p-4 ring-1 ${n === contest.phase ? "bg-[#FFD700]/10 ring-[#FFD700]/50" : "bg-white/[0.03] ring-white/10"}`}
            >
              <p className="text-2xl">{icon}</p>
              <p className={`mt-1 font-black ${n === contest.phase ? "text-[#FFD700]" : "text-white"}`}>{t}</p>
              <p className="text-sm text-zinc-400">{d}</p>
            </div>
          ))}
        </section>
      )}

      {/* ===== KIJAN POU VOTE ===== */}
      {!finished && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Chwazi ekip ou", "Woule anba a, peze « Vote » sou ekip lekòl ou pi renmen an."],
            ["2", `${contest.vote_price_htg} goud = 1 vòt`, "Chwazi montan an: 50, 100, 250 goud… plis ou bay, plis vòt ou genyen."],
            ["3", "Peye epi voye prèv la", "MonCash oswa NatCash. Vòt ou yo parèt sou klasman an lè ekip UpMizik la valide yo."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7A0E1F] font-black text-[#FFD700] ring-2 ring-[#FFD700]/40">{n}</span>
              <span>
                <span className="block font-black text-white">{t}</span>
                <span className="block text-sm text-zinc-400">{d}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ===== GAYAN YO (faz 3) ===== */}
      {winners.length > 0 && (
        <section id="gayan" className="mt-10 scroll-mt-24 text-center">
          <h2 className="text-3xl font-black text-white">🏆 Gayan yo</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {winners.map((t) => {
              const m = MEDALS[t.final_rank ?? 0];
              return (
                <Link
                  key={t.id}
                  href={`/konkou/${t.id}`}
                  className={`group relative overflow-hidden rounded-3xl border-2 bg-zinc-900/70 p-4 transition hover:-translate-y-1 ${t.final_rank === 1 ? "sm:order-2 sm:-mt-4" : t.final_rank === 2 ? "sm:order-1" : "sm:order-3"}`}
                  style={{ borderColor: m?.color }}
                >
                  <TeamPhoto team={t} className="aspect-[4/3] w-full rounded-2xl" />
                  <p className="mt-3 text-5xl">{m?.icon}</p>
                  <p className="text-xl font-black text-white">{t.team_name}</p>
                  <p className="text-sm text-zinc-400">🏫 {t.school_name}</p>
                  <p className="mt-1 text-xs font-bold" style={{ color: m?.color }}>
                    {m?.label} · {t.votes.toLocaleString("fr-HT")} vòt
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== KLASMAN AN DIRÈK ===== */}
      {teams.length > 0 && (
        <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-900/50 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-black text-white">{finished ? "📊 Rezilta final yo" : contest.phase === 3 ? "📊 Klasman final la" : "📊 Klasman an dirèk"}</h2>
            <p className="text-sm text-zinc-400">
              {total.toLocaleString("fr-HT")} vòt · faz {contest.phase}
              {goal ? ` · objektif ${goal} vòt` : ""}
            </p>
          </div>
          <ol className="mt-4 space-y-2">
            {teams.map((t, i) => (
              <li key={t.id} className="contents">
              {/* Faz 2: liy ki separe ekip ki ale nan final la */}
              {contest.phase === 2 && i === contest.finalists && (
                <p className="flex items-center gap-3 py-1 text-xs font-black uppercase tracking-widest text-[#FFD700]">
                  <span className="h-px flex-1 bg-[#FFD700]/40" /> ▲ Top {contest.finalists}: final la <span className="h-px flex-1 bg-[#FFD700]/40" />
                </p>
              )}
              <div className={`flex items-center gap-3 rounded-2xl p-2.5 ring-1 ${contest.phase === 2 && i < contest.finalists ? "bg-[#FFD700]/[0.06] ring-[#FFD700]/25" : "bg-white/[0.03] ring-white/5"}`}>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    i === 0 ? "bg-[#FFD700] text-[#0B132B]" : i === 1 ? "bg-[#C0C7D1] text-[#0B132B]" : i === 2 ? "bg-[#D9925B] text-[#0B132B]" : "bg-white/10 text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <TeamPhoto team={t} className="h-11 w-11 shrink-0 rounded-xl" />
                <Link href={`/konkou/${t.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 truncate font-bold text-white hover:underline">
                    {t.team_name}
                    {contest.phase === 1 && t.v1 >= contest.phase1_goal && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">✅ Kalifye</span>}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">🏫 {t.school_name}</span>
                  <span className="mt-1 block h-2 overflow-hidden rounded-full bg-white/10">
                    <span
                      className={`block h-full origin-left rounded-full motion-safe:animate-bar-grow ${goal && t.votes >= goal ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-gradient-to-r from-[#7A0E1F] via-[#E6C000] to-[#FFE34D]"}`}
                      style={{ width: `${barPct(t.votes)}%`, animationDelay: `${i * 0.06}s` }}
                    />
                  </span>
                </Link>
                <span className="w-20 shrink-0 text-right">
                  <span className="block text-lg font-black tabular-nums text-[#FFD700]">{t.votes.toLocaleString("fr-HT")}</span>
                  <span className="block text-[10px] font-bold uppercase text-zinc-500">{goal ? `/ ${goal} vòt` : "vòt"}</span>
                </span>
              </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ===== EKIP YO ===== */}
      <section id="ekip" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-black text-white">🏫 Ekip lekòl yo</h2>
        <p className="mt-1 text-sm text-zinc-400">Chak lekòl prezante 3 elèv ki reprezante l. Klike sou yon ekip pou w konnen yo pi byen.</p>
        {teams.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-dashed border-white/15 p-12 text-center text-zinc-400">🎄 Ekip yo ap parèt isit la byento.</p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t, i) => (
              <li
                key={t.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-[#FFD700]/40 motion-safe:animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
              >
                <Link href={`/konkou/${t.id}`} className="relative block">
                  <TeamPhoto team={t} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
                  {contest.phase === 1 && t.v1 >= contest.phase1_goal && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-black text-white shadow-lg">✅ Kalifye</span>
                  )}
                  {contest.phase === 2 && i < contest.finalists && t.votes > 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#FFD700] px-2.5 py-1 text-xs font-black text-[#0B132B] shadow-lg">🏆 Top {contest.finalists}</span>
                  )}
                  {!finished && i < 3 && t.votes > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-black text-white backdrop-blur">{["🥇", "🥈", "🥉"][i]} #{i + 1}</span>
                  )}
                  {t.final_rank && MEDALS[t.final_rank] && <span className="absolute left-3 top-3 text-3xl">{MEDALS[t.final_rank].icon}</span>}
                  <span className="absolute bottom-3 left-4 right-4">
                    <span className="block text-xl font-black text-white drop-shadow">{t.team_name}</span>
                    {t.slogan && <span className="block truncate text-sm italic text-[#FFE34D]">« {t.slogan} »</span>}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-sm font-bold text-zinc-300">🏫 {t.school_name}</p>
                  {t.members.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="flex -space-x-2">
                        {t.members.slice(0, 4).map((m) => (
                          <span key={m.id} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#7A0E1F] text-[11px] font-black text-white ring-2 ring-zinc-950">
                            {m.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(m.display_name)
                            )}
                          </span>
                        ))}
                      </span>
                      <span className="truncate text-xs text-zinc-400">{t.members.map((m) => m.display_name).join(" · ")}</span>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span>
                      <span className="block text-2xl font-black tabular-nums text-[#FFD700]">{t.votes.toLocaleString("fr-HT")}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">{goal ? `/ ${goal} vòt` : "vòt"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Link href={`/konkou/${t.id}`} className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white">
                        Wè ekip la
                      </Link>
                      {!finished && <VoteButton teamId={t.id} teamName={t.team_name} schoolName={t.school_name} price={contest.vote_price_htg} open={contest.voting_open} />}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {contest.description && (
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-zinc-300">
          <h2 className="font-black text-white">🎶 Sou konkou a</h2>
          <p className="mt-2 whitespace-pre-line">{contest.description}</p>
        </section>
      )}
    </div>
  );
}
