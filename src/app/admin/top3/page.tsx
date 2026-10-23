import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { SONG_SELECT, toTrack, type SongRow } from "@/lib/songs";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { Top3Editor, type SongOption } from "@/components/admin/Top3Editor";

export const metadata: Metadata = { title: "Admin: Top 3 | UpMizik" };

export default async function AdminTop3Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const [{ data: rows }, { data: picked }] = await Promise.all([
    supabase.from("songs").select(SONG_SELECT).order("play_count", { ascending: false }).limit(500).returns<SongRow[]>(),
    supabase.from("top_songs").select("position, song_id").order("position"),
  ]);

  const songs: SongOption[] = (rows ?? []).map((s) => {
    const t = toTrack(supabase, s);
    return { id: t.id, title: t.title, artistName: t.artistName, plays: s.play_count, coverUrl: t.coverUrl };
  });

  const initial: (string | null)[] = [null, null, null];
  for (const p of picked ?? []) initial[p.position - 1] = p.song_id;
  const isAuto = (picked ?? []).length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🏆 Jesyon Top 3</h1>
      <p className="mt-1 text-zinc-400">Chwazi 3 mizik ki ap parèt an gwo sou paj akèy la.</p>

      <p className={`mt-4 inline-block rounded-full px-3 py-1 text-sm ${isAuto ? "bg-zinc-800 text-zinc-300" : "bg-amber-500/15 text-amber-300"}`}>
        {isAuto ? "🤖 Kounye a: mòd otomatik (3 mizik ki gen plis ekout yo)" : "✋ Kounye a: seleksyon admin"}
      </p>

      <div className="mt-8">
        {songs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 py-16 text-center text-zinc-500">Poko gen mizik sou sit la.</p>
        ) : (
          <Top3Editor songs={songs} initial={initial} />
        )}
      </div>
    </div>
  );
}
