import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminSongList, type AdminSong } from "@/components/admin/AdminSongList";
import { SearchInput } from "@/components/search/SearchInput";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";

export const metadata: Metadata = { title: "Admin: Mizik | UpMizik" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "aktif", label: "🟢 Aktif" },
  { key: "poz", label: "⏸ An poz" },
] as const;

const SORTS = [
  { key: "nouvo", label: "🆕 Pi nouvo" },
  { key: "koute", label: "🎧 Plis ekout" },
  { key: "tit", label: "🔤 Tit A-Z" },
] as const;

type Row = SongRow & { created_at: string; archived_at: string | null; youtube_url: string | null };

export default async function AdminSongsPage({ searchParams }: { searchParams: { f?: string; t?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const filter = FILTERS.find((f) => f.key === searchParams.f)?.key ?? "tout";
  const sort = SORTS.find((s) => s.key === searchParams.t)?.key ?? "nouvo";
  // Retire karaktè ki ka kase filtè PostgREST la
  const q = (searchParams.q ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 100);

  let query = supabase.from("songs").select(`${SONG_SELECT}, created_at, archived_at, youtube_url`);
  if (filter === "aktif") query = query.is("archived_at", null);
  if (filter === "poz") query = query.not("archived_at", "is", null);
  if (q) {
    // Chache nan tit la OSWA non atis la
    const { data: artists } = await supabase.from("profiles").select("id").eq("role", "artist").ilike("display_name", `%${q}%`).limit(50);
    const ids = (artists ?? []).map((a) => a.id);
    query = ids.length ? query.or(`title.ilike.%${q}%,artist_id.in.(${ids.join(",")})`) : query.ilike("title", `%${q}%`);
  }
  if (sort === "koute") query = query.order("play_count", { ascending: false });
  else if (sort === "tit") query = query.order("title");
  else query = query.order("created_at", { ascending: false });

  const [{ data, error }, { count: total }, { count: pausedCount }] = await Promise.all([
    query.limit(300).returns<Row[]>(),
    supabase.from("songs").select("id", { count: "exact", head: true }),
    supabase.from("songs").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
  ]);

  const songs: AdminSong[] = (data ?? []).map((r) => ({
    track: toTrack(supabase, r),
    plays: r.play_count,
    createdAt: r.created_at,
    paused: Boolean(r.archived_at),
    youtubeUrl: r.youtube_url,
  }));

  const href = (patch: { f?: string; t?: string }) => {
    const p = new URLSearchParams();
    const f = patch.f ?? filter;
    const t = patch.t ?? sort;
    if (f !== "tout") p.set("f", f);
    if (t !== "nouvo") p.set("t", t);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/admin/mizik?${s}` : "/admin/mizik";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition ${
      active ? "border-fuchsia-500 bg-fuchsia-500/15 text-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
    }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🎵 Tout mizik yo</h1>
      <p className="mt-1 text-zinc-400">
        {total ?? 0} chante sou platfòm nan{pausedCount ? ` · ${pausedCount} an poz` : ""}. <strong className="text-zinc-200">⏸ Poz</strong> kache yon chante
        san efase l; <strong className="text-zinc-200">🗑️ Efase</strong> retire l nèt.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={href({ f: f.key })} className={chip(filter === f.key)}>
            {f.label}
          </Link>
        ))}
        <span className="mx-1 hidden w-px bg-zinc-800 sm:block" aria-hidden />
        {SORTS.map((s) => (
          <Link key={s.key} href={href({ t: s.key })} className={chip(sort === s.key)}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchInput initial={q} placeholder="Chache yon tit oswa yon atis…" />
      </div>

      <div className="mt-6">
        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Mizik yo pa chaje: {error.message}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-500">{songs.length === 300 ? "300 premye chante yo" : `${songs.length} chante`}</p>
            <AdminSongList songs={songs} />
          </>
        )}
      </div>
    </div>
  );
}
