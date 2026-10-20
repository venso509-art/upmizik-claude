import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { BarChart, type BarDatum } from "@/components/dashboard/BarChart";
import { SongManager, type ManagedSong } from "@/components/dashboard/SongManager";

export const metadata: Metadata = { title: "Dashboard | UpMizik" };

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Port-au-Prince" }));
  if (hour < 12) return "Bonjou";
  if (hour < 18) return "Bon apremidi";
  return "Bonswa";
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold text-white">{value}</p>
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

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");

  const { data: profile } = await supabase.from("profiles").select("display_name, role").eq("id", user.id).single();
  if (profile?.role !== "artist") redirect("/");

  const { data: rows } = await supabase
    .from("songs")
    .select(`${SONG_SELECT}, created_at`)
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false })
    .returns<(SongRow & { created_at: string })[]>();

  const songs = rows ?? [];
  const totalPlays = songs.reduce((sum, s) => sum + s.play_count, 0);
  const avgPlays = songs.length ? Math.round(totalPlays / songs.length) : 0;
  const top = [...songs].sort((a, b) => b.play_count - a.play_count)[0];

  const managed: ManagedSong[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    coverUrl: toTrack(supabase, s).coverUrl,
    plays: s.play_count,
    durationSeconds: s.duration_seconds,
    createdAt: s.created_at,
  }));

  // Grafik 1: koute pa chante (top 8)
  const playsBySong: BarDatum[] = [...songs]
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 8)
    .map((s) => ({ label: s.title, value: s.play_count, detail: s.genre ?? undefined }));

  // Grafik 2: chante pa jan mizik
  const byGenre = new Map<string, { count: number; plays: number }>();
  for (const s of songs) {
    const g = s.genre ?? "San jan";
    const cur = byGenre.get(g) ?? { count: 0, plays: 0 };
    byGenre.set(g, { count: cur.count + 1, plays: cur.plays + s.play_count });
  }
  const songsByGenre: BarDatum[] = Array.from(byGenre.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([label, v]) => ({ label, value: v.count, detail: `${v.plays.toLocaleString("fr-HT")} koute` }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* ===== AKÈY ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/50 via-violet-950/60 to-zinc-950 p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">🎤 Dashboard atis</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {greeting()}, {profile.display_name}! 👋
            </h1>
            <p className="mt-2 text-zinc-300">Men kijan mizik ou ap mache sou UpMizik.</p>

            {/* Chif prensipal la */}
            <div className="mt-8">
              <p className="text-6xl font-extrabold tracking-tight text-white">{totalPlays.toLocaleString("fr-HT")}</p>
              <p className="mt-1 text-sm text-zinc-400">koute an total</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/upload"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-fuchsia-900/50 transition hover:scale-[1.02] hover:opacity-95"
            >
              <span className="text-2xl leading-none">+</span> Upload nouvo chante
            </Link>
            <Link
              href={`/atis/${user.id}`}
              className="rounded-2xl border border-zinc-700 px-8 py-3 text-center font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Wè paj piblik mwen →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== REZIME ===== */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Chante pibliye" value={songs.length.toLocaleString("fr-HT")} />
        <StatTile label="Mwayèn koute pa chante" value={avgPlays.toLocaleString("fr-HT")} />
        <div className="col-span-2 lg:col-span-1">
          <StatTile
            label="🏆 Chante ki pi popilè"
            value={top ? top.title : "—"}
            hint={top ? `${top.play_count.toLocaleString("fr-HT")} koute` : "Poko gen chante"}
          />
        </div>
      </section>

      {songs.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
          <p className="text-5xl">🎶</p>
          <h2 className="mt-4 text-xl font-bold text-white">Ou poko pibliye okenn chante</h2>
          <p className="mt-2 text-zinc-400">Upload premye chante w la, e estatistik ou yo ap parèt isit la.</p>
          <Link
            href="/upload"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white"
          >
            + Pibliye premye chante w
          </Link>
        </section>
      ) : (
        <>
          {/* ===== ESTATISTIK ===== */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Koute pa chante" subtitle={songs.length > 8 ? "8 chante ki pi koute yo" : "Tout chante ou yo"}>
              <BarChart data={playsBySong} unit="koute" />
            </Panel>
            <Panel title="Chante pa jan mizik" subtitle="Konbyen chante ou genyen nan chak jan">
              <BarChart data={songsByGenre} unit="chante" />
            </Panel>
          </div>

          {/* ===== CHANTE YO ===== */}
          <div className="mt-6">
            <Panel title="Chante ou yo" subtitle={`${songs.length} chante sou platfòm lan`}>
              <SongManager songs={managed} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
