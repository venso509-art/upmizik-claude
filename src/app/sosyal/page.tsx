import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchInput } from "@/components/search/SearchInput";
import { RefreshButton } from "@/components/social/RefreshButton";
import { PostCard } from "@/components/social/PostCard";
import { loadPostLikes, loadPostShares, withImageUrls, type FeedPost } from "@/lib/posts";

export const metadata: Metadata = { title: "Sosyal | UpMizik", description: "Nouvèl, evènman ak nouvo pwojè atis UpMizik yo." };

// Feed la toujou fre (pa gen kach)
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function SocialPage({ searchParams }: { searchParams: { q?: string; avan?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const before = searchParams.avan && !Number.isNaN(Date.parse(searchParams.avan)) ? searchParams.avan : null;
  const supabase = createClient();

  const [{ data, error }, { data: { user } }] = await Promise.all([
    supabase.rpc("social_feed", { p_q: q || null, p_limit: PAGE_SIZE + 1, p_before: before }),
    supabase.auth.getUser(),
  ]);
  const rows = withImageUrls(supabase, (data ?? []) as FeedPost[]);
  const posts = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const now = Date.now();

  const [postLikes, postShares] = await Promise.all([
    loadPostLikes(supabase, posts.map((p) => p.id), user?.id ?? null),
    loadPostShares(supabase, posts.map((p) => p.id)),
  ]);

  // Kantite kòmantè chak pòs (si migration kòmantè pòs yo poko kouri, tout se 0)
  const commentCounts = new Map<string, number>();
  if (posts.length) {
    const { data: cRows } = await supabase.from("comments").select("post_id").in("post_id", posts.map((p) => p.id)).limit(5000);
    for (const c of (cRows ?? []) as { post_id: string }[]) commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
  }

  // Atis apwouve yo wè yon lyen pou pibliye
  const { data: me } = user
    ? await supabase.from("profiles").select("role, status").eq("id", user.id).maybeSingle()
    : { data: null };
  const canPost = me?.role === "artist" && me.status === "approved";

  const olderHref = posts.length
    ? `/sosyal?${new URLSearchParams({ ...(q ? { q } : {}), avan: posts[posts.length - 1].created_at }).toString()}`
    : null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-72 max-w-3xl rounded-full bg-fuchsia-600/15 blur-3xl" />
      <div className="relative mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">UpMizik Sosyal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">💬 Sa k ap pase</h1>
        <p className="mt-2 text-zinc-400">Nouvèl, evènman ak nouvo pwojè atis yo. Chak pòs rete 30 jou (60 jou pou atis Pro yo).</p>

        {canPost && (
          <Link
            href="/dashboard#nouvo-pos"
            className="mt-6 flex items-center gap-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 px-5 py-4 text-zinc-300 transition hover:border-fuchsia-500/60 hover:text-white"
          >
            <span className="text-2xl">✍️</span>
            <span className="flex-1">Ou gen yon nouvèl pou pataje ak fanatik ou yo?</span>
            <span className="font-semibold text-fuchsia-300">Ekri →</span>
          </Link>
        )}

        <div className="sticky top-16 z-30 -mx-4 mt-6 flex gap-2 bg-zinc-950/80 px-4 py-3 backdrop-blur">
          <SearchInput initial={q} placeholder="Chache nan pòs yo oswa yon atis…" />
          <RefreshButton />
        </div>

        {error ? (
          <p className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Feed la pa chaje: {error.message}</p>
        ) : posts.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-5xl">{q ? "🤷🏾" : "📭"}</p>
            <p className="mt-4 text-lg font-semibold text-white">{q ? `Pa gen pòs pou « ${q} »` : before ? "Pa gen lòt pòs ankò" : "Poko gen pòs"}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {q ? "Eseye yon lòt mo." : "Lè atis yo pibliye nouvèl yo, y ap parèt isit la."}
            </p>
            {(q || before) && (
              <Link href="/sosyal" className="mt-6 inline-block text-sm font-medium text-fuchsia-300 hover:text-fuchsia-200">
                ← Retounen nan dènye pòs yo
              </Link>
            )}
          </div>
        ) : (
          <>
            {q && <p className="mt-4 text-sm text-zinc-400">{posts.length}{hasMore ? "+" : ""} pòs pou « {q} »</p>}
            <div className="mt-4 space-y-4">
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  now={now}
                  commentCount={commentCounts.get(p.id) ?? 0}
                  likes={postLikes.get(p.id)}
                  shareCount={postShares.get(p.id) ?? 0}
                  currentUserId={user?.id ?? null}
                />
              ))}
            </div>
            <div className="mt-8 flex justify-center gap-3">
              {before && (
                <Link href={q ? `/sosyal?q=${encodeURIComponent(q)}` : "/sosyal"} className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition hover:text-white">
                  ⇡ Pi resan yo
                </Link>
              )}
              {hasMore && olderHref && (
                <Link href={olderHref} className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700">
                  Pi ansyen yo →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
