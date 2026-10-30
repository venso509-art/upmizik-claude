import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseRange, summarizeDaily, type TopSongRow } from "@/lib/stats";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DailyChart } from "@/components/stats/DailyChart";
import { RangeFilter } from "@/components/stats/RangeFilter";
import { RankList } from "@/components/stats/RankList";

export const metadata: Metadata = { title: "Estatistik | UpMizik" };

function Metric({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default async function ArtistStatsPage({ searchParams }: { searchParams: { jou?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", user.id).single();
  if (profile?.role !== "artist" || profile.status !== "approved") redirect("/dashboard");

  const days = parseRange(searchParams.jou);
  const [dailyRes, topRes] = await Promise.all([
    supabase.rpc("play_stats_daily", { p_days: days, p_artist_id: user.id }),
    supabase.rpc("top_songs_period", { p_days: days, p_artist_id: user.id, p_limit: 10 }),
  ]);

  const daily = summarizeDaily(dailyRes.data);
  const topSongs = (topRes.data ?? []) as TopSongRow[];
  const best = daily.points.reduce((a, b) => (b.realPlays > a.realPlays ? b : a), daily.points[0]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardTabs />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">📈 Estatistik avanse</h1>
          <p className="mt-1 text-zinc-400">Kijan mizik ou ap mache nan dènye {days} jou yo.</p>
        </div>
        <RangeFilter basePath="/dashboard/estatistik" current={days} />
      </div>

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric icon="▶" label="Ekout reyèl" value={daily.realPlays.toLocaleString("fr-HT")} hint="1 pa moun (kont oswa vizitè), pa mizik" />
        <Metric icon="👆" label="Kòmansman" value={daily.starts.toLocaleString("fr-HT")} hint="Fwa moun peze ▶" />
        <Metric
          icon="✅"
          label="Pousantaj reyèl"
          value={daily.realRate === null ? "—" : `${daily.realRate}%`}
          hint="Moun ki rete koute apre 5 segonn"
        />
        <Metric
          icon="🔥"
          label="Pi bon jou"
          value={best && best.realPlays > 0 ? best.realPlays.toLocaleString("fr-HT") : "—"}
          hint={
            best && best.realPlays > 0
              ? new Date(`${best.day}T12:00:00`).toLocaleDateString("fr-HT", { weekday: "long", day: "numeric", month: "long" })
              : "Poko gen ekout"
          }
        />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-bold text-white">Ekout reyèl chak jou</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Pase sourit la sou yon jou pou w wè detay.</p>
        <div className="mt-6">
          <DailyChart data={daily.points} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-bold text-white">🎵 Mizik ou ki pi mache</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Dapre ekout reyèl, dènye {days} jou</p>
        <div className="mt-6">
          <RankList
            unit="ekout"
            empty="Poko gen ekout nan peryòd sa a. Pataje mizik ou pou fanatik ou yo ka koute l!"
            items={topSongs.map((s) => {
              const rate = Number(s.starts) > 0 ? Math.round((Number(s.real_plays) / Number(s.starts)) * 100) : 0;
              return {
                key: s.song_id,
                href: `/chante/${s.song_id}`,
                title: s.title,
                value: Number(s.real_plays),
                secondary: `${Number(s.starts).toLocaleString("fr-HT")} kòmansman · ${rate}% reyèl`,
              };
            })}
          />
        </div>
      </section>

      <p className="mt-6 text-xs text-zinc-500">
        ℹ️ Yon <span className="text-zinc-300">ekout reyèl</span> se lè yon moun ki konekte koute yon mizik omwen 5 segonn. Chak moun konte yon sèl fwa pa mizik, menm si l koute l plizyè fwa. Se sa ki konte nan total ekout ou.
        Estatistik pa jou yo kòmanse depi jou sistèm sa a te aktive: ekout ki te fèt anvan yo konte nan total la, men yo pa nan graf la.
      </p>
    </div>
  );
}
