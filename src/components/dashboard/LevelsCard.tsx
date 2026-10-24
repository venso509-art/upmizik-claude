import { createClient } from "@/lib/supabase/server";
import { PLAQUE_MIN_DONATIONS_USD, PLAY_LEVELS, formatPlays, progressFor, type LevelKind } from "@/lib/levels";
import { Medal } from "@/components/badges/Medal";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type EventRow = { kind: LevelKind; threshold: number; reached_at: string; plaque_shipped_at: string | null };

function LevelBar({ title, kind, value, format }: { title: string; kind: LevelKind; value: number; format: (n: number) => string }) {
  const { current, next, progress } = progressFor(kind, value);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <div className="mt-3 flex items-center gap-4">
        <Medal icon={current.icon} tier={current.tier} shape={current.shape} size="lg" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Nivo aktyèl</p>
          <p className="text-2xl font-extrabold text-white">{current.name}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-citron-400" style={{ width: `${progress * 100}%` }} />
        </div>
        {next && <Medal icon={next.icon} tier={next.tier} shape={next.shape} size="xs" locked title={next.name} />}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {next ? (
          <>
            <span className="font-semibold text-white">{format(value)}</span> / {format(next.threshold)} · ankò{" "}
            <span className="text-zinc-200">{format(next.threshold - value)}</span> pou <span className="font-semibold text-zinc-200">{next.name}</span>
          </>
        ) : (
          <span className="text-amber-300">Ou rive nan pi gwo nivo a!</span>
        )}
      </p>
    </div>
  );
}

export async function LevelsCard({ artistId, verified }: { artistId: string; verified: boolean }) {
  const supabase = createClient();
  const [{ data: totals }, { data: events }] = await Promise.all([
    supabase.rpc("my_level_totals", { p_artist_id: artistId }),
    supabase
      .from("artist_level_events")
      .select("kind, threshold, reached_at, plaque_shipped_at")
      .eq("artist_id", artistId)
      .order("reached_at", { ascending: false })
      .returns<EventRow[]>(),
  ]);

  const t = ((totals ?? []) as { donations_usd: number; plays: number }[])[0];
  const donationsUsd = Number(t?.donations_usd ?? 0);
  const plays = Number(t?.plays ?? 0);
  const plaqueLevels = PLAY_LEVELS.filter((l) => l.plaque);
  const shipped = new Map((events ?? []).filter((e) => e.kind === "plays").map((e) => [Number(e.threshold), e.plaque_shipped_at]));

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">🏅 Nivo ou</h2>
        {verified ? (
          <span className="inline-flex items-center rounded-full bg-sky-500/15 px-3 py-1 text-sm font-semibold text-sky-300">
            <VerifiedBadge /> <span className="ml-1.5">Kont verifye</span>
          </span>
        ) : (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {plays >= 500 ? "🎯 Ou kalifye pou ✓: ekip la ap evalye kont ou" : "✓ Verifikasyon: rive 500 ekout pou w kalifye"}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <LevelBar title="💝 Nivo don" kind="donations" value={donationsUsd} format={(n) => `$${Math.round(n).toLocaleString("en-US")}`} />
        <LevelBar title="🎧 Nivo ekout" kind="plays" value={plays} format={formatPlays} />
      </div>

      {/* Plak fizik yo */}
      <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="font-semibold text-amber-200">🏆 Plak fizik UpMizik</p>
        <p className="mt-1 text-xs text-zinc-400">
          Nou voye yon plak bay atis ki rive {plaqueLevels.map((l) => formatPlays(l.threshold)).join(", ")} ekout, si yo gen omwen $
          {PLAQUE_MIN_DONATIONS_USD} don.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {plaqueLevels.map((l) => {
            const reached = plays >= l.threshold;
            const shippedAt = shipped.get(l.threshold);
            const eligible = reached && donationsUsd >= PLAQUE_MIN_DONATIONS_USD;
            return (
              <li key={l.threshold} className={`rounded-xl border p-3 text-sm ${reached ? "border-amber-500/40 bg-zinc-950" : "border-zinc-800 bg-zinc-950/50"}`}>
                <div className="flex items-center gap-3">
                  <Medal icon={l.icon} tier={l.tier} shape={l.shape} size="sm" locked={!reached} />
                  <div>
                    <p className="font-semibold text-white">Plak {l.name}</p>
                    <p className="text-xs text-zinc-400">{formatPlays(l.threshold)} ekout</p>
                  </div>
                </div>
                <p className="mt-2 text-xs">
                  {shippedAt ? (
                    <span className="text-emerald-300">📦 Plak la voye</span>
                  ) : eligible ? (
                    <span className="text-amber-300">✅ Ou kalifye: ekip la ap prepare plak ou</span>
                  ) : reached ? (
                    <span className="text-zinc-400">Ou bezwen ${PLAQUE_MIN_DONATIONS_USD} don pou valide l</span>
                  ) : (
                    <span className="text-zinc-500">Poko rive</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
