import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { formatHTG } from "@/lib/donations";
import { formatCount, liveDuration } from "@/lib/live";

export const metadata: Metadata = { title: "Revni live | UpMizik" };
export const dynamic = "force-dynamic";

type HistoryRow = {
  live_id: string;
  title: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  peak_viewers: number;
  viewers: number;
  likes: number;
  gifts_count: number;
  gift_credits: number;
  gift_htg: number;
  artist_htg: number;
};
type Breakdown = { gift_id: string; emoji: string; name: string; quantity: number; credits: number; senders: number };

const when = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Port-au-Prince" });

function Tile({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

// Revni live yo, apa revni mizik ak don yo: total, ak istwa chak live (blòk ki dewoule)
export default async function LiveRevenuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "artist") redirect("/dashboard");

  const [{ data: rows }, { data: settings }] = await Promise.all([
    supabase.rpc("my_live_history"),
    supabase.from("settings").select("live_artist_percent").eq("id", true).maybeSingle(),
  ]);
  const history = ((rows ?? []) as HistoryRow[]).map((r) => ({ ...r, gift_htg: Number(r.gift_htg), artist_htg: Number(r.artist_htg) }));
  const pct = Number(settings?.live_artist_percent ?? 60);

  // Detay kado chak live (20 dènye yo)
  const breakdowns = await Promise.all(
    history.slice(0, 20).map(async (l) => [l.live_id, ((await supabase.rpc("live_gift_breakdown", { p_live: l.live_id })).data ?? []) as Breakdown[]] as const),
  );
  const giftsByLive = new Map(breakdowns);

  const totals = history.reduce(
    (t, l) => ({ lives: t.lives + 1, gifts: t.gifts + l.gifts_count, giftHtg: t.giftHtg + l.gift_htg, mine: t.mine + l.artist_htg, likes: t.likes + Number(l.likes) }),
    { lives: 0, gifts: 0, giftHtg: 0, mine: 0, likes: 0 },
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <DashboardTabs />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">🔴 Revni live</h1>
          <p className="mt-1 text-zinc-400">Kado ou resevwa nan live ou yo. Ou touche {pct}% chak kado; lajan an antre nan balans retrè ou (💰 Finans).</p>
        </div>
        <Link href="/live/nouvo" className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500">
          🔴 Kòmanse yon live
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon="🎬" label="Live yo" value={totals.lives.toLocaleString("fr-HT")} />
        <Tile icon="🎁" label="Kado resevwa" value={formatCount(totals.gifts)} hint={`❤️ ${formatCount(totals.likes)} like an tou`} />
        <Tile icon="🪙" label="Valè kado yo" value={formatHTG(totals.giftHtg)} />
        <Tile icon="💰" label={`Sa ou touche (${pct}%)`} value={formatHTG(totals.mine)} hint="Disponib pou retrè apre mwa a fini" />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-white">Istwa live yo</h2>
        {history.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Ou poko fè live. Premye a ka kòmanse kounye a! 🎤</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {history.map((l) => {
              const gifts = giftsByLive.get(l.live_id) ?? [];
              return (
                <li key={l.live_id}>
                  {/* Blòk ki fèmen: klike pou wè detay yo */}
                  <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 open:border-red-500/40">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-black ${l.status === "live" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
                        {l.status === "live" ? "LIVE" : l.status === "stopped" ? "KANPE" : "FINI"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">{l.title ?? "Live san tit"}</span>
                        <span className="text-xs text-zinc-500">
                          {when(l.started_at)} · {liveDuration(l.started_at, l.ended_at)}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-emerald-300 tabular-nums">{formatHTG(l.artist_htg)}</span>
                      <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
                        ▾
                      </span>
                    </summary>
                    <div className="border-t border-zinc-800 p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <p className="rounded-xl bg-zinc-950/70 p-3">
                          <span className="block text-xs text-zinc-500">👥 Moun ki antre</span>
                          <span className="font-bold text-white">{formatCount(l.viewers)}</span>
                        </p>
                        <p className="rounded-xl bg-zinc-950/70 p-3">
                          <span className="block text-xs text-zinc-500">👁 Plis moun an menm tan</span>
                          <span className="font-bold text-white">{formatCount(l.peak_viewers)}</span>
                        </p>
                        <p className="rounded-xl bg-zinc-950/70 p-3">
                          <span className="block text-xs text-zinc-500">❤️ Like</span>
                          <span className="font-bold text-white">{formatCount(Number(l.likes))}</span>
                        </p>
                        <p className="rounded-xl bg-zinc-950/70 p-3">
                          <span className="block text-xs text-zinc-500">🎁 Kado ({formatCount(l.gift_credits)} kredi)</span>
                          <span className="font-bold text-white">{formatHTG(l.gift_htg)}</span>
                        </p>
                      </div>
                      {gifts.length > 0 && (
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {gifts.map((g) => (
                            <li key={g.gift_id} className="rounded-full bg-zinc-950/70 px-3 py-1.5 text-sm text-zinc-200">
                              {g.emoji} {g.name} <span className="font-bold text-white">x{Number(g.quantity)}</span>{" "}
                              <span className="text-xs text-zinc-500">({Number(g.senders)} moun)</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-4 text-sm text-zinc-300">
                        💰 Ou touche <span className="font-bold text-emerald-300">{formatHTG(l.artist_htg)}</span> ({pct}% de {formatHTG(l.gift_htg)})
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
