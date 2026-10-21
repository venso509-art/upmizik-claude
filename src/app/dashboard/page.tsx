import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SONG_SELECT, getSongExtras, toTrack, type SongRow } from "@/lib/songs";
import { AuthCard } from "@/components/auth/ui";
import { AccountStatusNotice } from "@/components/AccountStatusNotice";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { RegistrationPanel } from "@/components/registration/RegistrationPanel";
import { LevelsCard } from "@/components/dashboard/LevelsCard";
import { formatHTG } from "@/lib/donations";
import { toBalance, type BalanceRow } from "@/lib/finance";
import { BarChart, type BarDatum } from "@/components/dashboard/BarChart";
import { SongManager, type ManagedSong } from "@/components/dashboard/SongManager";
import { PostComposer, type MyPost } from "@/components/social/PostComposer";
import { postImageUrl } from "@/lib/posts";

export const metadata: Metadata = { title: "Dashboard | UpMizik" };

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Port-au-Prince" }));
  if (hour < 12) return "Bonjou";
  if (hour < 18) return "Bon apremidi";
  return "Bonswa";
}

function StatTile({ icon, label, value, hint }: { icon: string; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-xl">{icon}</span>
        <p className="text-sm font-medium text-zinc-400">{label}</p>
      </div>
      <p className="mt-4 text-4xl font-extrabold tracking-tight text-white">{value.toLocaleString("fr-HT")}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{hint ?? " "}</p>
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

  const { data: profile } = await supabase.from("profiles").select("display_name, role, status, is_verified").eq("id", user.id).single();
  if (profile?.role !== "artist") {
    return (
      <AuthCard title="Dashboard la se pou atis" subtitle="Kont ou se yon kont koutè.">
        <p className="text-zinc-300">
          Se sèlman atis ki gen yon dashboard. Ou ka kontinye koute tout chante yo sou{" "}
          <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300">
            paj akèy la
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  // Espas atis la louvri SÈLMAN apre admin nan valide kont lan
  if (profile.status !== "approved") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">🎤 Espas atis</h1>
        <p className="mt-1 text-zinc-400">
          Bonjou {profile.display_name}! Espas atis ou ap louvri depi ekip UpMizik la valide kont ou. Pandan tan sa a, ou ka koute mizik sou{" "}
          <Link href="/" className="text-fuchsia-400 hover:text-fuchsia-300">
            paj akèy la
          </Link>
          .
        </p>
        <div className="mt-8">
          {profile.status === "blocked" ? <AccountStatusNotice status="blocked" /> : <RegistrationPanel userId={user.id} />}
        </div>
      </div>
    );
  }

  type DashboardSong = SongRow & { created_at: string; archived_at?: string | null; comments?: { count: number }[] };
  const query = (columns: string) =>
    supabase.from("songs").select(columns).eq("artist_id", user.id).order("created_at", { ascending: false }).returns<DashboardSong[]>();

  let { data: rows, error } = await query(`${SONG_SELECT}, created_at, archived_at, comments(count)`);
  if (error) {
    // Si tablo comments la poko egziste, chaje chante yo san kòmantè
    ({ data: rows, error } = await query(`${SONG_SELECT}, created_at, archived_at`));
  }

  const songs = rows ?? [];
  const commentCount = (s: (typeof songs)[number]) => s.comments?.[0]?.count ?? 0;
  const totalPlays = songs.reduce((sum, s) => sum + s.play_count, 0);
  const totalComments = songs.reduce((sum, s) => sum + commentCount(s), 0);
  const top = [...songs].sort((a, b) => b.play_count - a.play_count)[0];

  const [extras, balanceRes, { data: myPosts }] = await Promise.all([
    getSongExtras(supabase, songs.map((s) => s.id), user.id),
    supabase.rpc("artist_balance", { p_artist_id: user.id }),
    // 10 dènye pòs atis la (si migration Sosyal la poko kouri, lis la vid)
    supabase
      .from("posts")
      .select("id, content, created_at, expires_at, status, image_path, link_url")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<MyPost[]>(),
  ]);
  const balance = toBalance((balanceRes.data as BalanceRow[] | null)?.[0]);

  const managed: ManagedSong[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    coverUrl: toTrack(supabase, s).coverUrl,
    plays: s.play_count,
    comments: commentCount(s),
    durationSeconds: s.duration_seconds,
    youtubeUrl: extras[s.id]?.songYoutubeUrl ?? null,
    createdAt: s.created_at,
    archived: Boolean(s.archived_at),
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
      <DashboardTabs />

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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/upload"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-fuchsia-900/50 transition hover:scale-[1.02] hover:opacity-95"
            >
              <span className="text-2xl leading-none">+</span> Pibliye yon nouvo chante
            </Link>
            <Link
              href={`/atis/${user.id}`}
              className="rounded-2xl border border-zinc-700 px-8 py-3 text-center font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Wè paj piblik mwen →
            </Link>
            <Link
              href="/pwofil"
              className="rounded-2xl border border-zinc-700 px-8 py-3 text-center font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              ✏️ Modifye pwofil
            </Link>
          </div>
        </div>
      </section>

      {/* ===== REZIME ===== */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon="🎵" label="Total Chante" value={songs.length} />
        <StatTile
          icon="🎧"
          label="Total Koute"
          value={totalPlays}
          hint={top && top.play_count > 0 ? `🏆 Pi popilè: ${top.title}` : undefined}
        />
        <StatTile icon="💬" label="Total Kòmantè" value={totalComments} />
        <Link
          href="/dashboard/finans"
          className="group rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-900/30 to-violet-950/30 p-6 transition hover:border-fuchsia-500/60"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-xl">💵</span>
            <p className="text-sm font-medium text-zinc-400">Balans disponib</p>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">{formatHTG(balance.availableHtg)}</p>
          <p className="mt-1 text-xs text-fuchsia-300 group-hover:underline">Mande retrè →</p>
        </Link>
      </section>

      {/* ===== SOSYAL: pibliye yon pòs ===== */}
      <PostComposer
        posts={(myPosts ?? []).map((p) => ({ ...p, imageUrl: postImageUrl(supabase, p.image_path) }))}
        artistId={user.id}
        artistName={profile.display_name}
      />

      {/* ===== NIVO YO ===== */}
      <LevelsCard artistId={user.id} verified={profile.is_verified} />

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
