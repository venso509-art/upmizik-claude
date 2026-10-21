"use client";

import { useEffect, useState, useTransition } from "react";
import { createPost, removeMyPost } from "@/app/sosyal/actions";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/auth/ui";
import { LinkCard } from "@/components/social/PostCard";
import { normalizeUrl } from "@/lib/links";
import { IMAGE_TYPES, fileExtension } from "@/lib/upload";
import { POST_IMAGE_MAX_INPUT_BYTES, POST_MAX_LENGTH, cropSquare, postState, type PostStatus } from "@/lib/posts";

export type MyPost = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
  status: PostStatus;
  image_path: string | null;
  link_url: string | null;
  imageUrl?: string | null;
};

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
    <li className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-900 text-xl">
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : post.link_url ? (
          "🔗"
        ) : (
          "💬"
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <p className="line-clamp-2 min-w-0 flex-1 whitespace-pre-line break-words text-sm text-zinc-300">{post.content}</p>
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONES[state.tone]}`}>{state.label}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-zinc-500">
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
      </div>
    </li>
  );
}

export function PostComposer({ posts, artistId, artistName }: { posts: MyPost[]; artistId: string; artistName: string }) {
  const [mode, setMode] = useState<"image" | "link">("image");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [preparing, setPreparing] = useState(false);
  const [pending, startTransition] = useTransition();
  const now = Date.now();

  const normalizedLink = link.trim() ? normalizeUrl(link) : null;

  // Lyen apèsi imaj la (efase l lè l pa sèvi ankò)
  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function pickImage(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Itilize yon imaj JPG, PNG oswa WebP.");
    if (file.size > POST_IMAGE_MAX_INPUT_BYTES) return setError("Foto a twò gwo (maksimòm 15 MB).");
    setPreparing(true);
    try {
      // Koupe l kare 1:1 (tankou yon foto pwofil WhatsApp) epi rapetise l
      setImage(await cropSquare(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imaj la pa ka prepare.");
    } finally {
      setPreparing(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setMessage(undefined);
    if (!content.trim()) return setError("Ekri yon ti tèks pou akonpaye pòs la.");
    if (mode === "image" && !image) return setError("Chwazi yon imaj pou pòs la.");
    if (mode === "link" && !normalizedLink) return setError("Mete yon lyen valid. Egz: https://youtube.com/...");

    startTransition(async () => {
      let imagePath: string | null = null;
      const supabase = createClient();
      if (mode === "image" && image) {
        imagePath = `${artistId}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("post-images").upload(imagePath, image, { contentType: "image/jpeg", upsert: false });
        if (upErr) return setError(`Imaj la pa monte: ${upErr.message}`);
      }

      const res = await createPost({ content, imagePath, linkUrl: mode === "link" ? link : null });
      if (res.error) {
        if (imagePath) await supabase.storage.from("post-images").remove([imagePath]);
        return setError(res.error);
      }
      setContent("");
      setImage(null);
      setLink("");
      setMessage(res.message);
    });
  }

  const busy = pending || preparing;

  return (
    <section id="nouvo-pos" className="mt-6 scroll-mt-24 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-900/20 via-zinc-900/40 to-zinc-900/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white">💬 Pibliye sou UpMizik Sosyal</h2>
        <a href="/sosyal" className="text-sm font-medium text-fuchsia-300 hover:text-fuchsia-200">
          Wè feed la →
        </a>
      </div>
      <p className="mt-0.5 text-sm text-zinc-500">Yon imaj oswa yon lyen, ak yon ti tèks. Pòs la ap rete vizib pou 30 jou.</p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {/* Chwa: imaj oswa lyen */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-950/60 p-1">
          {(
            [
              ["image", "🖼️ Imaj"],
              ["link", "🔗 Lyen"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === m ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow" : "text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
          {mode === "image" ? (
            <label
              className={`relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition sm:w-44 ${
                preview ? "border-transparent" : "border-zinc-700 bg-zinc-950 hover:border-fuchsia-500"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              {preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Apèsi" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 text-xs font-medium text-white">🔄 Chanje imaj la</span>
                </>
              ) : (
                <>
                  <span className="text-3xl">{preparing ? "⏳" : "🖼️"}</span>
                  <span className="mt-1 px-2 text-sm text-zinc-300">{preparing ? "Ap prepare…" : "Chwazi yon imaj"}</span>
                  <span className="px-2 text-[11px] text-zinc-500">Kare 1:1 · JPG, PNG, WebP</span>
                </>
              )}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                inputMode="url"
                placeholder="https://youtube.com/watch?v=…  oswa lyen tikè, Instagram…"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
              />
              {normalizedLink && <LinkCard url={normalizedLink} compact />}
              {link.trim() && normalizedLink === undefined && <p className="text-xs text-amber-300">Lyen sa a pa sanble valid.</p>}
            </div>
          )}

          <div className={mode === "link" ? "sm:col-span-2" : ""}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={mode === "image" ? 6 : 3}
              maxLength={POST_MAX_LENGTH}
              placeholder={`Kisa k ap pase, ${artistName}? Egz: 🎤 Konsè samdi 15 nan Pòtoprens!`}
              className="h-full w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
            />
            <p className={`mt-1 text-right text-xs tabular-nums ${content.length > POST_MAX_LENGTH * 0.9 ? "text-amber-400" : "text-zinc-500"}`}>
              {content.length}/{POST_MAX_LENGTH}
            </p>
          </div>
        </div>

        <FormMessage error={error} message={message} />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Ap pibliye…" : "📣 Pibliye"}
        </button>
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
