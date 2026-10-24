import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCount, liveDuration } from "@/lib/live";

export const metadata: Metadata = { title: "Live | UpMizik", description: "Atis ayisyen k ap fè live kounye a sou UpMizik." };
export const dynamic = "force-dynamic";

type LiveNow = { live_id: string; artist_id: string; title: string | null; started_at: string; likes: number; viewers: number };

// Tout live k ap fèt kounye a + bouton pou atis Pro yo kòmanse youn
export default async function LivesPage() {
  const supabase = createClient();
  const [{ data: rows }, { data: { user } }] = await Promise.all([supabase.rpc("live_now"), supabase.auth.getUser()]);
  const lives = (rows ?? []) as LiveNow[];
  const ids = lives.map((l) => l.artist_id);
  const { data: artists } = ids.length ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids) : { data: [] };
  const byId = new Map((artists ?? []).map((a) => [a.id, a]));

  let canStart = false;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
    canStart = me?.role === "artist" && me.status === "approved";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-red-400">An dirèk</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">🔴 Live yo</h1>
          <p className="mt-1 text-zinc-400">Gade atis ou renmen yo an dirèk, like, ekri epi voye kado.</p>
        </div>
        {canStart && (
          <Link href="/live/nouvo" className="rounded-full bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500">
            🔴 Kòmanse yon live
          </Link>
        )}
      </div>

      {lives.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-5xl">📡</p>
          <p className="mt-4 text-lg font-semibold text-white">Pa gen live kounye a</p>
          <p className="mt-1 text-sm text-zinc-400">W ap resevwa yon notifikasyon depi yon atis kòmanse yon live.</p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {lives.map((l) => {
            const a = byId.get(l.artist_id);
            return (
              <li key={l.live_id}>
                <Link href={`/live/${l.live_id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900">
                  {a?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-5xl">🎤</span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                  <span className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white">❤️ {formatCount(l.likes)}</span>
                  <span className="absolute inset-x-2 bottom-2 text-white">
                    <span className="block truncate font-bold">{a?.display_name ?? "Atis"}</span>
                    <span className="block truncate text-xs text-white/75">{l.title ?? `An live depi ${liveDuration(l.started_at)}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
