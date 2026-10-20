import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { PLAQUE_MIN_DONATIONS_USD, levelName, type LevelKind } from "@/lib/levels";
import { formatDate } from "@/lib/finance";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ArtistLevelsTable, PlaqueQueue, type AdminArtistLevel, type PlaqueItem } from "@/components/admin/LevelsAdmin";

export const metadata: Metadata = { title: "Admin: Nivo | UpMizik" };

type LevelRow = {
  artist_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  status: string;
  donations_usd: number;
  plays: number;
};

type EventRow = {
  id: string;
  artist_id: string;
  kind: LevelKind;
  threshold: number;
  reached_at: string;
  plaque_shipped_at: string | null;
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function AdminLevelsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const [{ data: levelRows }, { data: eventRows }] = await Promise.all([
    supabase.rpc("admin_artist_levels"),
    supabase
      .from("artist_level_events")
      .select("id, artist_id, kind, threshold, reached_at, plaque_shipped_at")
      .order("reached_at", { ascending: false })
      .limit(500)
      .returns<EventRow[]>(),
  ]);

  const rows = (levelRows ?? []) as LevelRow[];
  const byId = new Map(rows.map((r) => [r.artist_id, r]));
  const events = eventRows ?? [];

  const artists: AdminArtistLevel[] = rows.map((r) => ({
    id: r.artist_id,
    name: r.display_name,
    avatarUrl: r.avatar_url,
    verified: r.is_verified,
    status: r.status,
    donationsUsd: Number(r.donations_usd),
    plays: Number(r.plays),
  }));

  // Plak pou voye: nivo ekout 3K+ pa voye ankò, pou atis ki gen omwen $100 don
  const plaques: PlaqueItem[] = events
    .filter((e) => e.kind === "plays" && Number(e.threshold) >= 3000 && !e.plaque_shipped_at)
    .filter((e) => Number(byId.get(e.artist_id)?.donations_usd ?? 0) >= PLAQUE_MIN_DONATIONS_USD)
    .map((e) => ({
      eventId: e.id,
      artistId: e.artist_id,
      artistName: byId.get(e.artist_id)?.display_name ?? "Atis",
      threshold: Number(e.threshold),
      reachedAt: e.reached_at,
    }));

  // Nouvo etap 30 dènye jou yo
  const since = Date.now() - 30 * 86400 * 1000;
  const recent = events.filter((e) => new Date(e.reached_at).getTime() > since).slice(0, 50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🏅 Nivo atis yo</h1>
      <p className="mt-1 text-zinc-400">Nivo don ak ekout chak atis, badj ✓, ak plak fizik pou voye.</p>

      <div className="mt-8 space-y-6">
        <Panel title={`🏆 Plak pou voye (${plaques.length})`} subtitle={`Atis ki rive 3K, 10K oswa 100K ekout, ak omwen $${PLAQUE_MIN_DONATIONS_USD} don.`}>
          <PlaqueQueue items={plaques} />
        </Panel>

        <Panel title="🆕 Nouvo etap" subtitle="Atis ki pase yon nivo nan 30 dènye jou yo.">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Pa gen nouvo etap nan 30 dènye jou yo.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/70">
              {recent.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <Link href={`/atis/${e.artist_id}`} className="font-semibold text-white hover:underline">
                      {byId.get(e.artist_id)?.display_name ?? "Atis"}
                    </Link>{" "}
                    <span className="text-zinc-400">rive</span> <span className="font-semibold text-fuchsia-300">{levelName(e.kind, Number(e.threshold))}</span>
                    <span className="text-zinc-500"> ({e.kind === "plays" ? "ekout" : "don"})</span>
                  </span>
                  <span className="text-xs text-zinc-500">{formatDate(e.reached_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`🎤 Tout atis yo (${artists.length})`} subtitle="Klike sou ✓ Verifye pou aktive badj la bò kote non atis la.">
          <ArtistLevelsTable artists={artists} />
        </Panel>
      </div>
    </div>
  );
}
