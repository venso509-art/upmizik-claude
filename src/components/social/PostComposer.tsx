"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { createPost, removeMyPost } from "@/app/sosyal/actions";
import { FormMessage, SubmitButton } from "@/components/auth/ui";
import { POST_MAX_LENGTH, postState, type PostStatus } from "@/lib/posts";

export type MyPost = { id: string; content: string; created_at: string; expires_at: string; status: PostStatus };

const TONES = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  zinc: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
};

function MyPostRow({ post, now }: { post: MyPost; now: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const state = postState(post.status, post.expires_at, now);
  const canRemove = post.status === "active" && state.tone !== "amber";

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start gap-3">
        <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line break-words text-sm text-zinc-300">{post.content}</p>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONES[state.tone]}`}>{state.label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span>{new Date(post.created_at).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}</span>
        {canRemove && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Retire pòs sa a? Li p ap parèt sou paj Sosyal la ankò.")) return;
              setError(undefined);
              startTransition(async () => {
                const res = await removeMyPost(post.id);
                if (res.error) setError(res.error);
              });
            }}
            className="rounded-lg px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
          >
            {pending ? "Ap retire…" : "🗑️ Retire"}
          </button>
        )}
      </div>
      {post.status === "blocked" && <p className="mt-2 text-xs text-red-300">Ekip UpMizik la kache pòs sa a. Kontakte nou si w panse se yon erè.</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </li>
  );
}

export function PostComposer({ posts, artistName }: { posts: MyPost[]; artistName: string }) {
  const [state, formAction] = useFormState(createPost, undefined);
  const [length, setLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const now = Date.now();

  // Vide bwat la apre yon pòs pibliye
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setLength(0);
    }
  }, [state?.ok]);

  return (
    <section id="nouvo-pos" className="mt-6 scroll-mt-24 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/20 via-zinc-900/40 to-zinc-900/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white">💬 Pibliye sou UpMizik Sosyal</h2>
        <a href="/sosyal" className="text-sm font-medium text-fuchsia-300 hover:text-fuchsia-200">
          Wè feed la →
        </a>
      </div>
      <p className="mt-0.5 text-sm text-zinc-500">Yon nouvèl, yon evènman, yon nouvo pwojè… Pòs la ap rete vizib pou 30 jou.</p>

      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <textarea
          name="content"
          required
          rows={4}
          maxLength={POST_MAX_LENGTH}
          onChange={(e) => setLength(e.target.value.length)}
          placeholder={`Kisa k ap pase, ${artistName}? Egz: 🎤 Konsè samdi 15 nan Pòtoprens! Tikè yo disponib…`}
          className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-xs tabular-nums ${length > POST_MAX_LENGTH * 0.9 ? "text-amber-400" : "text-zinc-500"}`}>
            {length}/{POST_MAX_LENGTH}
          </p>
          <div className="w-full sm:w-auto sm:min-w-[11rem]">
            <SubmitButton>📣 Pibliye</SubmitButton>
          </div>
        </div>
        <FormMessage error={state?.error} message={state?.message} />
      </form>

      {posts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-300">Pòs ou yo</h3>
          <ul className="mt-3 space-y-2">
            {posts.map((p) => (
              <MyPostRow key={p.id} post={p} now={now} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
