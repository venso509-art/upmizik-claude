import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { parseRange, summarizeDaily, type TopArtistRow, type TopSongRow } from "@/lib/stats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { DailyChart } from "@/components/stats/DailyChart";
import { RangeFilter } from "@/components/stats/RangeFilter";
import { RankList } from "@/components/stats/RankList";
import { RevenueReport } from "@/components/admin/RevenueReport";
import { EMPTY_EXTRAS, fullDate, parsePeriod, type RevenueExtras, type RevenueRow } from "@/lib/revenue";
import { ResetReportButton } from "@/components/admin/ResetReportButton";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin: Rapò | UpMizik" };

function Metric({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function AdminReportsPage({ searchParams }: { searchParams: { jou?: string; peryod?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const days = parseRange(searchParams.jou);
  const period = parsePeriod(searchParams.peryod);
  // Dènye reset la: "Depi dènye reset" kòmanse la (pa gen reset = depi kòmansman)
  const { data: lastReport } = await supabase
    .from("revenue_reports")
    .select("period_to")
    .order("period_to", { ascending: false })
    .limit(1)
    .maybeSingle();
  const since = (lastReport?.period_to as string | undefined) ?? "2024-01-01T05:00:00Z";
  const now = new Date().toISOString();
  const aktyel = period.key === "aktyel";
  const rangeLabel = aktyel
    ? `${lastReport ? `Depi dènye reset la (${fullDate(since)})` : "Depi kòmansman"} → kounye a`
    : `${new Date(`${period.from}T12:00:00Z`).toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" })} → ${new Date(
        `${period.to}T12:00:00Z`,
      ).toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" })}`;

  const [songsRes, artistsRes, ledgerRes, extrasRes, dailyRes, topSongsRes, topArtistsRes] = await Promise.all([
    supabase.from("songs").select("play_count"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist").eq("status", "approved"),
    // Tout lajan ki antre nan peryòd la (erè = migration rapò revni an poko kouri)
    aktyel
      ? supabase.rpc("admin_revenue_ledger_at", { p_t0: since, p_t1: now })
      : supabase.rpc("admin_revenue_ledger", { p_from: period.from, p_to: period.to }),
    aktyel
      ? supabase.rpc("admin_revenue_extras_at", { p_t0: since, p_t1: now })
      : supabase.rpc("admin_revenue_extras", { p_from: period.from, p_to: period.to }),
    supabase.rpc("play_stats_daily", { p_days: days }),
    supabase.rpc("top_songs_period", { p_days: days, p_limit: 10 }),
    supabase.rpc("top_artists_period", { p_days: days, p_limit: 10 }),
  ]);

  // ===== Total pou tout tan =====
  const songs = songsRes.data ?? [];
  const totalPlays = songs.reduce((s, r) => s + Number(r.play_count), 0);
  const ledger = (ledgerRes.data ?? []) as RevenueRow[];
  const extras = ((extrasRes.data ?? []) as RevenueExtras[])[0] ?? EMPTY_EXTRAS;

  // ===== Peryòd la =====
  const daily = summarizeDaily(dailyRes.data);
  const topSongs = (topSongsRes.data ?? []) as TopSongRow[];
  const topArtists = (topArtistsRes.data ?? []) as TopArtistRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">📈 Rapò & Estatistik</h1>
      <p className="mt-1 text-zinc-400">
        Tout lajan ki antre sou UpMizik, ak pèfòmans mizik yo.{" "}
        <Link href="/admin/achiv/rapo" className="font-semibold text-citron-300 hover:text-citron-200">
          📄 Wè rapò achive yo →
        </Link>
      </p>

      {/* ===== LAJAN: tout sa ki antre, sit la / pou pataje ===== */}
      <div className="mt-8">
        {ledgerRes.error ? (
          <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
            ⚠️ Rapò lajan an poko pare: kouri migration <span className="font-mono">20261226000000_live_statements_report_archive.sql</span> nan Supabase.
          </p>
        ) : (
          <RevenueReport
            rows={ledger}
            extras={extras}
            period={period.key}
            rangeLabel={rangeLabel}
            fileTag={aktyel ? `depi-reset-${now.slice(0, 10)}` : `${period.from}-${period.to}`}
            actions={<ResetReportButton since={lastReport ? fullDate(since) : "kòmansman"} />}
          />
        )}
      </div>

      {/* ===== MIZIK ===== */}
      <h2 className="mt-14 text-2xl font-extrabold tracking-tight text-white">🎧 Mizik & ekout</h2>
      <section className="mt-5 grid grid-cols-3 gap-4">
        <Metric icon="🎵" label="Total mizik" value={songs.length.toLocaleString("fr-HT")} />
        <Metric icon="🎤" label="Atis aktif" value={(artistsRes.count ?? 0).toLocaleString("fr-HT")} />
        <Metric icon="🎧" label="Total ekout" value={totalPlays.toLocaleString("fr-HT")} />
      </section>

      {/* ===== PERYÒD ===== */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Dènye {days} jou yo</h2>
        <RangeFilter basePath="/admin/rapo" current={days} />
      </div>

      <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric icon="▶" label="Ekout reyèl" value={daily.realPlays.toLocaleString("fr-HT")} hint="1 pa moun konekte, pa mizik" />
        <Metric icon="👆" label="Kòmansman" value={daily.starts.toLocaleString("fr-HT")} hint="Fwa moun peze ▶" />
        <div className="col-span-2 lg:col-span-1">
          <Metric
            icon="✅"
            label="Pousantaj ekout reyèl"
            value={daily.realRate === null ? "—" : `${daily.realRate}%`}
            hint="Ekout ki depase 5 segonn"
          />
        </div>
      </section>

      <div className="mt-6">
        <Panel title="Ekout reyèl chak jou" subtitle="Dapre lè Ayiti. Pase sourit la sou yon jou pou w wè detay.">
          <DailyChart data={daily.points} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="🎵 Top 10 mizik" subtitle={`Dapre ekout reyèl, dènye ${days} jou`}>
          <RankList
            unit="ekout"
            empty="Poko gen ekout nan peryòd sa a."
            items={topSongs.map((s) => ({
              key: s.song_id,
              href: `/chante/${s.song_id}`,
              title: s.title,
              subtitle: s.artist_name,
              value: Number(s.real_plays),
              secondary: `${Number(s.starts).toLocaleString("fr-HT")} kòmansman`,
            }))}
          />
        </Panel>
        <Panel title="🎤 Top atis" subtitle={`Dapre ekout reyèl, dènye ${days} jou`}>
          <RankList
            unit="ekout"
            empty="Poko gen ekout nan peryòd sa a."
            items={topArtists.map((a) => ({
              key: a.artist_id,
              href: `/atis/${a.artist_id}`,
              title: a.artist_name,
              value: Number(a.real_plays),
              secondary: `${Number(a.starts).toLocaleString("fr-HT")} kòmansman`,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
