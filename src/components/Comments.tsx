"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/chante/actions";
import { FormMessage } from "@/components/auth/ui";
import { createClient } from "@/lib/supabase/client";
import { countComments, type CommentItem, type CommentTarget } from "@/lib/comments";
import { VerifiedCorner } from "@/components/VerifiedCorner";

export type { CommentItem } from "@/lib/comments";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "kounye a";
  if (s < 3600) return `sa gen ${Math.floor(s / 60)} min`;
  if (s < 86400) return `sa gen ${Math.floor(s / 3600)} è`;
  if (s < 86400 * 30) return `sa gen ${Math.floor(s / 86400)} jou`;
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" });
}

const textareaClass =
  "w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30";

function Avatar({ name, url, small, verified }: { name: string; url: string | null; small?: boolean; verified?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span className={`flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 font-bold text-white ${small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </span>
      <VerifiedCorner show={verified} />
    </span>
  );
}

// Bouton ❤️ sou yon kòmantè (chif la chanje touswit, epi n anile l si Supabase refize)
function LikeButton({ comment, currentUserId }: { comment: CommentItem; currentUserId: string | null }) {
  const router = useRouter();
  const [liked, setLiked] = useState(comment.liked);
  const [count, setCount] = useState(comment.likeCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!currentUserId) return router.push("/konekte");
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: currentUserId })
      : await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", currentUserId);
    if (error) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Retire like" : "Like kòmantè a"}
      className={`inline-flex items-center gap-1 text-xs font-medium transition ${liked ? "text-red-400" : "text-zinc-500 hover:text-white"}`}
    >
      {liked ? "❤️" : "🤍"} {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function CommentRow({
  c,
  target,
  currentUserId,
  canModerate,
  isReply,
  onReply,
}: {
  c: CommentItem;
  target: CommentTarget;
  currentUserId: string | null;
  canModerate: boolean;
  isReply?: boolean;
  onReply: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex gap-3">
      <Avatar name={c.authorName} url={c.authorAvatar} small={isReply} verified={c.authorVerified} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-zinc-900/70 px-4 py-2.5">
          <p className="text-sm">
            {c.authorIsArtist ? (
              <Link href={`/atis/${c.userId}`} className="font-semibold text-white hover:underline">
                {c.authorName}
              </Link>
            ) : (
              <span className="font-semibold text-white">{c.authorName}</span>
            )}
            {c.authorIsArtist && <span className="ml-1.5 text-xs">🎤</span>}
          </p>
          <p className="mt-0.5 whitespace-pre-line break-words text-[15px] text-zinc-200">{c.body}</p>
        </div>
        <div className="mt-1 flex items-center gap-4 px-2">
          <span className="text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
          <LikeButton comment={c} currentUserId={currentUserId} />
          {currentUserId && (
            <button type="button" onClick={onReply} className="text-xs font-semibold text-zinc-400 transition hover:text-white">
              Reponn
            </button>
          )}
          {(c.userId === currentUserId || canModerate) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(c.replies.length ? "Efase kòmantè sa a ak repons li yo?" : "Efase kòmantè sa a?")) return;
                startTransition(async () => {
                  const res = await deleteComment(c.id, target);
                  if (res.error) setError(res.error);
                });
              }}
              className="text-xs text-zinc-500 transition hover:text-red-400"
            >
              Efase
            </button>
          )}
        </div>
        {error && <p className="mt-1 px-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function ReplyBox({ target, parentId, name, onDone }: { target: CommentTarget; parentId: string; name: string; onDone: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(`@${name} `);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await addComment(target, text, parentId);
          if (res.error) setError(res.error);
          else onDone();
        });
      }}
      className="mt-2 space-y-2"
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} required maxLength={1000} rows={2} autoFocus className={textareaClass} />
      <FormMessage error={error} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
          Anile
        </button>
        <button type="submit" disabled={pending} className="btn-primary rounded-lg px-4 py-1.5 text-sm disabled:opacity-60">
          {pending ? "Ap voye..." : "Reponn"}
        </button>
      </div>
    </form>
  );
}

export function Comments({
  target,
  comments,
  currentUserId,
  canModerate,
  placeholder = "Kisa w panse?",
}: {
  target: CommentTarget;
  comments: CommentItem[];
  currentUserId: string | null;
  canModerate: boolean; // pwopriyetè chante/pòs la oswa admin
  placeholder?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Ki kòmantè prensipal n ap reponn, ak non moun nou mansyone a (@Non)
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get("body") ?? "");
    startTransition(async () => {
      const res = await addComment(target, body);
      if (res.error) setError(res.error);
      else {
        setError(undefined);
        formRef.current?.reset();
      }
    });
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-white">
        💬 Kòmantè <span className="text-zinc-500">({countComments(comments)})</span>
      </h2>

      {currentUserId ? (
        <form ref={formRef} onSubmit={submit} className="mt-5 space-y-3">
          <textarea name="body" required maxLength={1000} rows={3} placeholder={placeholder} className={textareaClass} />
          <FormMessage error={error} />
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className="rounded-lg btn-primary px-5 py-2.5 font-semibold transition disabled:opacity-60">
              {pending ? "Ap voye..." : "Voye kòmantè"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
          <Link href="/konekte" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Konekte
          </Link>{" "}
          pou w kòmante, reponn oswa like.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Poko gen kòmantè. Se ou ki ka premye a!</p>
      ) : (
        <ul className="mt-8 space-y-6">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentRow c={c} target={target} currentUserId={currentUserId} canModerate={canModerate} onReply={() => setReplyTo({ id: c.id, name: c.authorName })} />
              {/* Repons yo, yon ti kras sou kote */}
              {(c.replies.length > 0 || replyTo?.id === c.id) && (
                <div className="ml-12 mt-3 space-y-3 border-l border-zinc-800 pl-4">
                  {c.replies.map((r) => (
                    <CommentRow
                      key={r.id}
                      c={r}
                      target={target}
                      currentUserId={currentUserId}
                      canModerate={canModerate}
                      isReply
                      onReply={() => setReplyTo({ id: c.id, name: r.authorName })}
                    />
                  ))}
                  {replyTo?.id === c.id && currentUserId && (
                    <ReplyBox key={replyTo.name} target={target} parentId={c.id} name={replyTo.name} onDone={() => setReplyTo(null)} />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
