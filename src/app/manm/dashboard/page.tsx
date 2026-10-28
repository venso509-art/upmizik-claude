import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings-server";
import { MemberShareCard, ReferralList } from "@/components/member/MemberWidgets";
import { MemberTutorials } from "@/components/member/MemberTutorials";
import {
  BONUS_RATE_USD,
  MILESTONES,
  contractMonth,
  countByMonth,
  daysLeftInMonth,
  encouragement,
  formatUsd,
  monthEarnings,
  monthKey,
  monthName,
  type Referral,
} from "@/lib/members";

export const metadata: Metadata = { title: "Espas manm | UpMizik" };
export const dynamic = "force-dynamic";

const card = "rounded-3xl bg-zinc-900/70 p-5 ring-1 ring-white/10";

// Espas manm afilye a: objektif mwa a, pseudo a, kòb mwa a, atis li fè enskri yo, mwa anvan yo
export default async function MemberDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, nickname, pseudo_referral, objective_total, current_progress, total_earned, contract_months, status, approved_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member || member.status !== "approved" || !member.pseudo_referral) redirect("/manm");

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: refRows }, { data: payouts }, settings, { count: pseudoChanges }] = await Promise.all([
    supabase.rpc("member_referrals", { p_member: member.id }),
    supabase.from("member_payouts").select("period, amount_usd, paid_at").eq("member_id", member.id),
    getSettings(),
    supabase.from("member_pseudo_changes").select("id", { count: "exact", head: true }).eq("member_id", member.id).gt("changed_at", since),
  ]);
  const referrals = (refRows ?? []) as Referral[];
  const paid = new Map(((payouts ?? []) as { period: string; amount_usd: number }[]).map((p) => [p.period.slice(0, 7), Number(p.amount_usd)]));

  const now = new Date();
  const thisMonth = monthKey(now);
  const byMonth = countByMonth(referrals);
  const count = byMonth.get(thisMonth) ?? 0;
  const objective = member.objective_total;
  const pct = Math.min(100, Math.round((count / objective) * 100));
  const earn = monthEarnings(count, objective);
  const htg = earn.usd * settings.htgPerUsd;
  const nextPay = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  const origin = headers().get("origin") ?? `https://${headers().get("host") ?? "upmizik.com"}`;
  const firstName = member.nickname || member.full_name.split(/\s+/)[0];
  // Yon atis ka manm tou: li gen 2 espas (Dashboard atis + Espas manm)
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isArtist = me?.role === "artist";
  const initials = member.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join("");

  // Mwa anvan yo (depi manm nan kòmanse), pi resan an premye
  const prevMonths: string[] = [];
  const start = member.approved_at ? new Date(member.approved_at) : now;
  for (let d = new Date(now.getFullYear(), now.getMonth() - 1, 1); d >= new Date(start.getFullYear(), start.getMonth(), 1); d.setMonth(d.getMonth() - 1)) {
    prevMonths.push(monthKey(d));
    if (prevMonths.length >= 12) break;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* ===== TÈT ===== */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-400">Espas manm</p>
          <h1 className="mt-1 text-2xl font-black text-white">Bonjou, {firstName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white ring-1 ring-white/10">Manm afilye{isArtist ? " · Atis" : ""}</span>
            <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white ring-1 ring-white/10">
              Kontra: mwa {contractMonth(member.approved_at, member.contract_months, now)} sou {member.contract_months}
            </span>
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black text-white ring-2 ring-[#FFD700]">{initials}</span>
      </div>

      {isArtist && (
        <Link
          href="/dashboard"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/[0.07]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-600/30" aria-hidden>
            🎤
          </span>
          Ale nan Dashboard atis ou (mizik, revni, stati…)
          <span className="ml-auto" aria-hidden>
            →
          </span>
        </Link>
      )}

      <div className="mt-5 space-y-4">
        {/* ===== OBJEKTIF MWA A ===== */}
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-black capitalize text-white">Objektif {monthName(thisMonth)}</h2>
            <span className="text-sm text-zinc-400">{daysLeftInMonth(now)} jou rete</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-5xl font-black tabular-nums text-[#FFD700]">
              {count} <span className="text-2xl font-bold text-zinc-300">/ {objective} atis</span>
            </p>
            <p className="text-2xl font-black tabular-nums text-white">{pct}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#0B132B]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#FFD700] transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {MILESTONES.map((m) => (
              <span
                key={m}
                className={`rounded-xl py-2 text-center text-xs font-black ${pct >= m ? "bg-[#FFD700] text-[#0B132B]" : "bg-white/[0.04] text-zinc-300 ring-1 ring-white/10"}`}
              >
                {m}%
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-200">{encouragement(count, objective)}</p>
        </section>

        {/* ===== PSEUDO + PATAJ ===== */}
        <MemberShareCard code={member.pseudo_referral} origin={origin} changesLeft={Math.max(0, 3 - (pseudoChanges ?? 0))} />

        {/* ===== KÒB MWA A ===== */}
        <section className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-black text-white">Kòb mwa a</h2>
            <span className="text-sm text-zinc-400">1 $ = {settings.htgPerUsd} HTG</span>
          </div>
          <p className="mt-2 text-5xl font-black tabular-nums text-white">
            {formatUsd(earn.usd)} <span className="text-lg font-bold text-zinc-400">{Math.round(htg).toLocaleString("fr-HT")} HTG</span>
          </p>
          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-sm">
            <p className="flex justify-between text-zinc-300">
              <span>{earn.base} atis × 1 $</span>
              <span className="font-bold text-white">{formatUsd(earn.base)}</span>
            </p>
            <p className="flex justify-between text-zinc-300">
              <span>
                {earn.bonus} atis bonis × {formatUsd(BONUS_RATE_USD)}
              </span>
              <span className="font-bold text-white">{formatUsd(earn.bonus * BONUS_RATE_USD)}</span>
            </p>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Peman: {nextPay.toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" })}, pa MonCash oswa NatCash.
          </p>
          <p className="mt-3 rounded-2xl bg-[#0B132B] p-3 text-sm text-zinc-200">
            Apre atis nimewo {objective}, chak nouvo atis vo <span className="font-black text-[#FFD700]">{formatUsd(BONUS_RATE_USD)}</span> pou ou.
          </p>
          {Number(member.total_earned) > 0 && (
            <p className="mt-3 text-xs text-zinc-500">Total ou deja touche: {formatUsd(Number(member.total_earned))}</p>
          )}
        </section>

        {/* ===== ATIS OU ENSKRI ===== */}
        <ReferralList referrals={referrals} />

        {/* ===== TUTO POU ATIS YO (voye youn chak jou) ===== */}
        <MemberTutorials
          origin={origin}
          code={member.pseudo_referral}
          artists={referrals.map((r) => ({ id: r.artist_id, name: r.name, avatarUrl: r.avatar_url }))}
        />

        {/* ===== MWA ANVAN YO ===== */}
        {prevMonths.length > 0 && (
          <section className={card}>
            <h2 className="font-black text-white">Mwa anvan yo</h2>
            <ul className="mt-2 divide-y divide-white/5">
              {prevMonths.map((k) => {
                const n = byMonth.get(k) ?? 0;
                const usd = monthEarnings(n, objective).usd;
                return (
                  <li key={k} className="flex items-center justify-between py-3 text-sm">
                    <span className="capitalize text-zinc-300">{monthName(k, true)}</span>
                    <span className="font-bold text-white">
                      {n} atis · {formatUsd(usd)}
                      {paid.has(k) ? <span className="ml-2 text-xs font-semibold text-emerald-300">✓ Peye</span> : n > 0 ? <span className="ml-2 text-xs text-zinc-500">ap tann</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
