import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ContestSettings, TeamList, VoteReview, type PendingVote } from "@/components/admin/ContestAdmin";
import { CONTEST_SLUG, type Contest, type ContestMember, type ContestTeam } from "@/lib/contest";
import { formatHTG } from "@/lib/donations";

export const metadata: Metadata = { title: "Admin: Konkou Nwèl | UpMizik" };
export const dynamic = "force-dynamic";

// 🎄 Konkou Nwèl: paramèt, ekip yo, vòt k ap tann, ak total yo
export default async function AdminContestPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const { data: contest, error } = await supabase.from("contests").select("*").eq("slug", CONTEST_SLUG).maybeSingle<Contest>();
  if (error || !contest) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <AdminTabs />
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
          ⚠️ Konkou a poko pare: kouri migration <span className="font-mono">20270101000006_contest.sql</span> nan Supabase.
        </p>
      </div>
    );
  }

  const [{ data: teamRows }, { data: memberRows }, { data: voteRows }, { data: pendingRows }] = await Promise.all([
    supabase.from("contest_teams").select("*").eq("contest_id", contest.id).order("sort").order("created_at").returns<ContestTeam[]>(),
    supabase.from("contest_members").select("*").order("sort").returns<ContestMember[]>(),
    supabase.from("contest_votes").select("team_id, phase, votes, amount_htg, status").eq("contest_id", contest.id),
    supabase
      .from("contest_votes")
      .select("id, team_id, phase, amount_htg, votes, voter_name, method, transaction_ref, created_at, proof_path")
      .eq("contest_id", contest.id)
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
  ]);

  const teams = (teamRows ?? []).map((t) => ({ ...t, members: (memberRows ?? []).filter((m) => m.team_id === t.id) }));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const phaseNow = Math.min(contest.phase, 2);

  // Total vòt valide (faz kounye a) + lajan (tout faz) pa ekip
  const standings: Record<string, { votes: number; money: number }> = {};
  let money = 0;
  let pendingMoney = 0;
  for (const v of (voteRows ?? []) as { team_id: string; phase: number; votes: number; amount_htg: number; status: string }[]) {
    if (v.status === "pending") pendingMoney += Number(v.amount_htg);
    if (v.status !== "verified") continue;
    const s = (standings[v.team_id] ??= { votes: 0, money: 0 });
    s.money += Number(v.amount_htg);
    money += Number(v.amount_htg);
    if (v.phase === phaseNow) s.votes += v.votes;
  }

  // Prèv yo (bucket prive): lyen ki ekspire apre 1 è
  const proofPaths = (pendingRows ?? []).map((v) => v.proof_path as string);
  const { data: signed } = proofPaths.length ? await supabase.storage.from("donation-proofs").createSignedUrls(proofPaths, 3600) : { data: [] };
  const signedMap = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const pending: PendingVote[] = (pendingRows ?? []).map((v) => ({
    id: v.id,
    team_name: teamById.get(v.team_id)?.team_name ?? "?",
    school_name: teamById.get(v.team_id)?.school_name ?? "",
    phase: v.phase,
    amount_htg: Number(v.amount_htg),
    votes: v.votes,
    voter_name: v.voter_name,
    method: v.method,
    transaction_ref: v.transaction_ref,
    created_at: v.created_at,
    proof_url: signedMap.get(v.proof_path) ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AdminTabs />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">🎄 Konkou Nwèl</h1>
          <p className="mt-1 text-zinc-400">
            Faz {contest.phase} · {contest.voting_open ? "🟢 vòt louvri" : "🔴 vòt fèmen"} · {contest.vote_price_htg} goud = 1 vòt
          </p>
        </div>
        <Link href="/konkou" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-citron-400 hover:text-white">
          Wè paj piblik la →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-400">💰 Lajan vòt valide</p>
          <p className="mt-1 text-2xl font-black text-citron-300">{formatHTG(money)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-400">⏳ Lajan k ap tann validasyon</p>
          <p className="mt-1 text-2xl font-black text-white">{formatHTG(pendingMoney)}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:col-span-1">
          <p className="text-xs text-zinc-400">🗳️ Vòt valide (faz {phaseNow})</p>
          <p className="mt-1 text-2xl font-black text-white">{Object.values(standings).reduce((s, x) => s + x.votes, 0).toLocaleString("fr-HT")}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <VoteReview votes={pending} />
        <TeamList contestId={contest.id} teams={teams} standings={standings} />
        <ContestSettings contest={contest} />
      </div>
    </div>
  );
}
