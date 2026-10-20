import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { formatHTG, formatUSD } from "@/lib/donations";
import { parseRange, summarizeDaily, type TopArtistRow, type TopSongRow } from "@/lib/stats";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { DailyChart } from "@/components/stats/DailyChart";
import { RangeFilter } from "@/components/stats/RangeFilter";
import { RankList } from "@/components/stats/RankList";

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

export default async function AdminReportsPage({ searchParams }: { searchParams: { jou?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const days = parseRange(searchParams.jou);

  const [songsRes, artistsRes, donationsRes, feesRes, dailyRes, topSongsRes, topArtistsRes] = await Promise.all([
    supabase.from("songs").select("play_count"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist").eq("status", "approved"),
    supabase.from("donations").select("amount_usd, amount_htg, platform_share_htg").eq("status", "verified"),
    supabase.from("artist_registrations").select("amount_htg").eq("status", "verified"),
    supabase.rpc("play_stats_daily", { p_days: days }),
    supabase.rpc("top_songs_period", { p_days: days, p_limit: 10 }),
    supabase.rpc("top_artists_period", { p_days: days, p_limit: 10 }),
  ]);

  // ===== Total pou tout tan =====
  const songs = songsRes.data ?? [];
  const totalPlays = songs.reduce((s, r) => s + Number(r.play_count), 0);
  const donations = donationsRes.data ?? [];
  const donationsUsd = donations.reduce((s, d) => s + Number(d.amount_usd), 0);
  const donationsHtg = donations.reduce((s, d) => s + Number(d.amount_htg), 0);
  const revenue =
    donations.reduce((s, d) => s + Number(d.platform_share_htg), 0) + (feesRes.data ?? []).reduce((s, f) => s + Number(f.amount_htg), 0);

  // ===== Peryòd la =====
  const daily = summarizeDaily(dailyRes.data);
  const topSongs = (topSongsRes.data ?? []) as TopSongRow[];
  const topArtists = (topArtistsRes.data ?? []) as TopArtistRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">📈 Rapò & Estatistik</h1>
      <p className="mt-1 text-zinc-400">Pèfòmans platfòm UpMizik la.</p>

      {/* ===== TOUT TAN ===== */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric icon="🎵" label="Total mizik" value={songs.length.toLocaleString("fr-HT")} />
        <Metric icon="🎤" label="Atis aktif" value={(artistsRes.count ?? 0).toLocaleString("fr-HT")} />
        <Metric icon="🎧" label="Total ekout" value={totalPlays.toLocaleString("fr-HT")} />
        <Metric icon="💝" label="Total donasyon" value={formatUSD(donationsUsd)} hint={`${formatHTG(donationsHtg)} · ${donations.length} don`} />
        <div className="col-span-2 lg:col-span-1">
          <Metric icon="💰" label="Revni platfòm" value={formatHTG(revenue)} hint="15% don + frè enskripsyon" />
        </div>
      </section>

      {/* ===== PERYÒD ===== */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Dènye {days} jou yo</h2>
        <RangeFilter basePath="/admin/rapo" current={days} />
      </div>

      <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric icon="▶" label="Ekout reyèl" value={daily.realPlays.toLocaleString("fr-HT")} hint="Omwen 5 segonn koute" />
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
