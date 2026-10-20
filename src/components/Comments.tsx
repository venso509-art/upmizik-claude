"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { addComment, deleteComment } from "@/app/chante/actions";
import { FormMessage } from "@/components/auth/ui";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorIsArtist: boolean;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "kounye a";
  if (s < 3600) return `sa gen ${Math.floor(s / 60)} min`;
  if (s < 86400) return `sa gen ${Math.floor(s / 3600)} è`;
  if (s < 86400 * 30) return `sa gen ${Math.floor(s / 86400)} jou`;
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" });
}

export function Comments({
  songId,
  comments,
  currentUserId,
  isSongOwner,
}: {
  songId: string;
  comments: CommentItem[];
  currentUserId: string | null;
  isSongOwner: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get("body") ?? "");
    startTransition(async () => {
      const res = await addComment(songId, body);
      if (res.error) setError(res.error);
      else {
        setError(undefined);
        formRef.current?.reset();
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Efase kòmantè sa a?")) return;
    startTransition(async () => {
      const res = await deleteComment(id, songId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-white">
        💬 Kòmantè <span className="text-zinc-500">({comments.length})</span>
      </h2>

      {currentUserId ? (
        <form ref={formRef} onSubmit={submit} className="mt-5 space-y-3">
          <textarea
            name="body"
            required
            maxLength={1000}
            rows={3}
            placeholder="Kisa w panse de chante sa a?"
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
          />
          <FormMessage error={error} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Ap voye..." : "Voye kòmantè"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
          <Link href="/konekte" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
            Konekte
          </Link>{" "}
          pou w kite yon kòmantè.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Poko gen kòmantè. Se ou ki ka premye a!</p>
      ) : (
        <ul className="mt-8 space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 text-sm font-bold text-white">
                {c.authorName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {c.authorIsArtist ? (
                    <Link href={`/atis/${c.userId}`} className="font-semibold text-white hover:underline">
                      {c.authorName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">{c.authorName}</span>
                  )}
                  {c.authorIsArtist && <span className="ml-1.5 text-xs">🎤</span>}
                  <span className="ml-2 text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-zinc-300">{c.body}</p>
                {(c.userId === currentUserId || isSongOwner) && (
                  <button
                    onClick={() => remove(c.id)}
                    disabled={pending}
                    className="mt-1 text-xs text-zinc-500 transition hover:text-red-400"
                  >
                    Efase
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
