"use client";

import { useEffect, useState, useTransition } from "react";
import { createPromo, deletePromo, movePromo, setPromoActive } from "@/app/admin/rpa/actions";
import { createClient } from "@/lib/supabase/client";
import { fileExtension, uploadResumable } from "@/lib/upload";
import { PROMO_ACCEPT, PROMO_MAX_BYTES, PROMO_MEDIA_TYPES, type PromoKind } from "@/lib/promos";
import { youtubeId, youtubeThumbnail } from "@/lib/youtube";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { StatusBadge } from "@/components/StatusBadge";

export type AdminPromo = {
  id: string;
  title: string;
  artistName: string;
  kind: PromoKind;
  videoUrl: string | null;
  imageUrl: string | null;
  youtubeUrl: string | null;
  isActive: boolean;
};

export type ArtistOption = { id: string; name: string };


export function PromoForm({ artists }: { artists: ArtistOption[] }) {
  const [artistId, setArtistId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"video" | "youtube">("video");
  const [video, setVideo] = useState<File | null>(null);
  const [youtube, setYoutube] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const ytId = kind === "youtube" ? youtubeId(youtube.startsWith("http") ? youtube : `https://${youtube}`) : null;

  // "video" isit la vle di "yon fichye" (videyo OSWA imaj); tip egzak la soti nan ekstansyon an
  const media = video ? PROMO_MEDIA_TYPES[fileExtension(video)] : null;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!video) return setPreviewUrl(null);
    const url = URL.createObjectURL(video);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  function pickVideo(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!PROMO_MEDIA_TYPES[fileExtension(file)]) return setError("Fòma sa a pa aksepte. Itilize MP4, MOV, WebM, GIF, JPG, PNG oswa WebP.");
    if (file.size > PROMO_MAX_BYTES) return setError("Fichye a twò gwo. Maksimòm: 50 MB.");
    setVideo(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setMessage(undefined);
    if (kind === "video" && (!video || !media)) return setError("Chwazi yon videyo oswa yon imaj.");
    startTransition(async () => {
      let videoPath: string | null = null;
      if (kind === "video" && video && media) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setError("Sesyon ou ekspire. Konekte ankò.");
        const ext = fileExtension(video);
        try {
          // Videyo a monte an moso: si koneksyon an koupe, li kontinye kote l te rive
          videoPath = await uploadResumable({
            bucket: "promo-videos",
            path: `${crypto.randomUUID()}.${ext}`,
            file: video,
            contentType: media.mime,
            accessToken: session.access_token,
            onProgress: setProgress,
          });
        } catch (err) {
          return setError(`Fichye a pa monte: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const res = await createPromo({
        artistId,
        title,
        kind: kind === "youtube" ? "youtube" : (media?.kind ?? "video"),
        videoPath,
        youtubeUrl: kind === "youtube" ? youtube : null,
      });
      if (res.error) {
        if (videoPath) await createClient().storage.from("promo-videos").remove([videoPath]);
        return setError(res.error);
      }
      setTitle("");
      setVideo(null);
      setYoutube("");
      setProgress(0);
      setMessage("RPA a ajoute! Li parèt sou paj akèy la. 🚀");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Atis k ap monte">
        <select value={artistId} onChange={(e) => setArtistId(e.target.value)} required className={inputClass}>
          <option value="">Chwazi yon atis...</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tit">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Egz: Nouvo talan Rap Kreyòl" className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["video", "🎬 Videyo / Imaj"],
            ["youtube", "▶ Lyen YouTube"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              kind === k ? "border-fuchsia-500 bg-fuchsia-500/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "video" ? (
        <>
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 px-4 py-6 text-center transition hover:border-fuchsia-500 ${
            pending ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {previewUrl && media ? (
            <span className="mb-2 block h-40 w-32 overflow-hidden rounded-xl bg-zinc-900">
              {media.kind === "video" ? (
                <video src={previewUrl} muted loop autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Apèsi" className="h-full w-full object-cover" />
              )}
            </span>
          ) : (
            <span className="text-3xl">🎬</span>
          )}
          <span className="mt-1 max-w-full truncate text-sm text-zinc-300">
            {video ? `${media?.kind === "image" ? "🖼️" : "🎬"} ${video.name}` : "Chwazi yon videyo oswa yon imaj"}
          </span>
          <span className="text-xs text-zinc-500">MP4, MOV, WebM, GIF, JPG, PNG, WebP · Maks 50 MB</span>
          <span className="text-xs text-zinc-500">Videyo yo jwe an bouk, san son; moun nan ka mete son an ak bouton 🔊 la</span>
          <input type="file" accept={PROMO_ACCEPT} className="sr-only" onChange={(e) => pickVideo(e.target.files?.[0])} />
        </label>
        {media?.kind === "video" && video && fileExtension(video) === "mov" && (
          <p className="text-xs text-amber-300">
            ⚠️ Kèk MOV (sitou sa iPhone fè an HEVC) pa jwe sou Android. Si w kapab, ekspòte l an MP4.
          </p>
        )}
        </>
      ) : (
        <Field label="Lyen videyo YouTube">
          <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
          {ytId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={youtubeThumbnail(ytId)} alt="Apèsi YouTube" className="mt-3 aspect-video w-full rounded-lg object-cover" />
          )}
        </Field>
      )}

      {pending && kind === "video" && video && (
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-citron-400 transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      <FormMessage error={error} message={message} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg btn-primary px-4 py-3 font-semibold transition disabled:opacity-60"
      >
        {pending ? (kind === "video" && video ? `Ap monte fichye a... ${Math.round(progress * 100)}%` : "Ap ajoute...") : "🚀 Ajoute RPA a"}
      </button>
    </form>
  );
}

function PromoRow({ promo, first, last }: { promo: AdminPromo; first: boolean; last: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const ytId = youtubeId(promo.youtubeUrl);
  const run = (fn: () => Promise<{ error?: string }>) => startTransition(async () => setError((await fn()).error));

  return (
    <li className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-950">
        {promo.videoUrl ? (
          <video src={promo.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : promo.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={promo.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : ytId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={youtubeThumbnail(ytId)} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-white">{promo.title}</p>
          <StatusBadge
            {...(promo.isActive
              ? { label: "🟢 Aktif", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" }
              : { label: "⏸ Inaktif", cls: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30" })}
          />
        </div>
        <p className="text-xs text-zinc-400">
          🎤 {promo.artistName} · {promo.kind === "video" ? "🎬 Videyo" : promo.kind === "image" ? "🖼️ Imaj" : "▶ YouTube"}
        </p>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button onClick={() => run(() => movePromo(promo.id, -1))} disabled={pending || first} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-30" aria-label="Monte">
            ⬆️
          </button>
          <button onClick={() => run(() => movePromo(promo.id, 1))} disabled={pending || last} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-30" aria-label="Desann">
            ⬇️
          </button>
          <button
            onClick={() => run(() => setPromoActive(promo.id, !promo.isActive))}
            disabled={pending}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-50"
          >
            {promo.isActive ? "⏸ Inaktif" : "▶ Aktive"}
          </button>
          <button
            onClick={() => confirm(`Efase RPA « ${promo.title} »?`) && run(() => deletePromo(promo.id))}
            disabled={pending}
            className="rounded-lg px-3 py-1 text-xs text-zinc-400 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50"
          >
            🗑️ Efase
          </button>
        </div>
      </div>
    </li>
  );
}

export function PromoList({ promos }: { promos: AdminPromo[] }) {
  if (promos.length === 0) return <p className="rounded-2xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-500">Poko gen RPA.</p>;
  return (
    <ul className="space-y-3">
      {promos.map((p, i) => (
        <PromoRow key={p.id} promo={p} first={i === 0} last={i === promos.length - 1} />
      ))}
    </ul>
  );
}
