"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePost, setPostStatus } from "@/app/sosyal/actions";
import { Avatar } from "@/components/social/PostCard";
import { postState, type PostStatus } from "@/lib/posts";

export type AdminPost = {
  id: string;
  content: string;
  createdAt: string;
  expiresAt: string;
  status: PostStatus;
  artistId: string;
  artistName: string;
  artistAvatar: string | null;
};

const TONES = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  zinc: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

function PostRow({ post, now }: { post: AdminPost; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const state = postState(post.status, post.expiresAt, now);
  const blocked = post.status === "blocked";

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(undefined);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  };

  return (
    <li className={`rounded-2xl border p-5 transition ${blocked ? "border-red-500/30 bg-red-500/5" : "border-zinc-800 bg-zinc-900/40"} ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Link href={`/atis/${post.artistId}`}>
          <Avatar name={post.artistName} url={post.artistAvatar} size="h-10 w-10" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/atis/${post.artistId}`} className="font-semibold text-white hover:underline">
              {post.artistName}
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONES[state.tone]}`}>{state.label}</span>
          </div>
          <p className="text-xs text-zinc-500">
            Pibliye {new Date(post.createdAt).toLocaleString("fr-HT", { dateStyle: "medium", timeStyle: "short" })} · Ekspire{" "}
            {new Date(post.expiresAt).toLocaleDateString("fr-HT", { dateStyle: "medium" })}
          </p>
          <p className="mt-3 whitespace-pre-line break-words text-sm text-zinc-200">{post.content}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.status !== "deleted" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setPostStatus(post.id, blocked ? "active" : "blocked"))}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-wait ${
                  blocked
                    ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                    : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                {blocked ? "✅ Debloke" : "🚫 Bloke"}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm("Efase pòs sa a NÈT? Ou p ap ka retabli l.") && run(() => deletePost(post.id))}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-wait"
            >
              🗑️ Efase
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </li>
  );
}

export function PostModeration({ posts, now }: { posts: AdminPost[]; now: number }) {
  if (posts.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center text-zinc-400">Pa gen pòs isit la.</p>;
  }
  return (
    <ul className="space-y-3">
      {posts.map((p) => (
        <PostRow key={p.id} post={p} now={now} />
      ))}
    </ul>
  );
}
