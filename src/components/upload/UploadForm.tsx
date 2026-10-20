"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GENRES } from "@/lib/genres";
import {
  AUDIO_TYPES,
  IMAGE_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  fileExtension,
  readAudioDuration,
  uploadResumable,
} from "@/lib/upload";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { SplitsEditor } from "@/components/splits/SplitsEditor";
import { normalizeUrl } from "@/lib/links";
import { validateSplits, type Split } from "@/lib/splits";

type Status = "idle" | "uploading" | "done";

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 transition-all"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [audioProgress, setAudioProgress] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [splits, setSplits] = useState<Split[]>([]);

  // Montre yon apèsi imaj kouvèti a, epi libere memwa a apre
  useEffect(() => {
    if (!cover) return setCoverPreview(null);
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function pickAudio(file: File | undefined) {
    setError(undefined);
    if (!file) return setAudio(null);
    if (!AUDIO_TYPES[fileExtension(file)]) return setError("Fòma odyo sa a pa aksepte. Itilize MP3, M4A, WAV, OGG oswa FLAC.");
    if (file.size > MAX_AUDIO_BYTES) return setError(`Fichye odyo a twò gwo (${formatMB(file.size)}). Maksimòm: 50 MB.`);
    setAudio(file);
  }

  function pickCover(file: File | undefined) {
    setError(undefined);
    if (!file) return setCover(null);
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Fòma imaj sa a pa aksepte. Itilize JPG, PNG oswa WebP.");
    if (file.size > MAX_IMAGE_BYTES) return setError(`Imaj la twò gwo (${formatMB(file.size)}). Maksimòm: 5 MB.`);
    setCover(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const genre = String(form.get("genre") ?? "") || null;
    const youtubeUrl = normalizeUrl(String(form.get("youtube_url") ?? ""));

    if (!title) return setError("Mete tit chante a.");
    if (!audio) return setError("Chwazi fichye odyo a.");
    if (youtubeUrl === undefined) return setError("Lyen YouTube la pa valid.");
    const splitsError = validateSplits(splits);
    if (splitsError) return setError(splitsError);

    setError(undefined);
    setStatus("uploading");
    setAudioProgress(0);
    setCoverProgress(0);

    const supabase = createClient();
    const uploaded: { bucket: string; path: string }[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesyon ou ekspire. Konekte ankò.");

      const duration = await readAudioDuration(audio);

      let coverPath: string | null = null;
      if (cover) {
        const ext = fileExtension(cover);
        coverPath = await uploadResumable({
          bucket: "covers",
          path: `${userId}/${crypto.randomUUID()}.${ext}`,
          file: cover,
          contentType: IMAGE_TYPES[ext],
          accessToken: session.access_token,
          onProgress: setCoverProgress,
        });
        uploaded.push({ bucket: "covers", path: coverPath });
      }

      const audioExt = fileExtension(audio);
      const audioPath = await uploadResumable({
        bucket: "audio",
        path: `${userId}/${crypto.randomUUID()}.${audioExt}`,
        file: audio,
        contentType: AUDIO_TYPES[audioExt],
        accessToken: session.access_token,
        onProgress: setAudioProgress,
      });
      uploaded.push({ bucket: "audio", path: audioPath });

      const { data: song, error: insertError } = await supabase
        .from("songs")
        .insert({
          artist_id: userId,
          title,
          genre,
          youtube_url: youtubeUrl,
          audio_path: audioPath,
          cover_path: coverPath,
          duration_seconds: duration,
        })
        .select("id")
        .single();
      if (insertError) throw new Error(insertError.message);

      if (splits.length > 0) {
        const { error: splitsError } = await supabase.rpc("set_song_splits", { p_song_id: song.id, p_splits: splits });
        if (splitsError) {
          // Pa kite yon chante pibliye san akò royalties li
          await supabase.from("songs").delete().eq("id", song.id);
          throw new Error(`Pataj royalties la pa sove: ${splitsError.message}`);
        }
      }

      setStatus("done");
      router.refresh();
    } catch (err) {
      // Efase fichye ki te gentan monte yo, pou yo pa rete pou granmesi
      for (const f of uploaded) await supabase.storage.from(f.bucket).remove([f.path]);
      setStatus("idle");
      setError(`Upload la echwe: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (status === "done") {
    return (
      <div className="space-y-6 text-center">
        <p className="text-5xl">🎉</p>
        <FormMessage message="Chante w la pibliye! Li parèt sou paj akèy la kounye a." />
        <div className="flex justify-center gap-3">
          <Link href="/" className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2.5 font-semibold text-white">
            Wè l sou paj akèy la
          </Link>
          <button
            onClick={() => {
              setStatus("idle");
              setAudio(null);
              setCover(null);
              setSplits([]);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-zinc-200 hover:border-zinc-500"
          >
            Upload yon lòt
          </button>
        </div>
      </div>
    );
  }

  const busy = status === "uploading";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Tit chante a">
        <input name="title" required maxLength={200} disabled={busy} placeholder="Egz: Lanmou Lakay" className={inputClass} />
      </Field>

      <Field label="Jan mizik">
        <select name="genre" disabled={busy} defaultValue="" className={inputClass}>
          <option value="">Chwazi yon jan (opsyonèl)</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        {/* Imaj kouvèti */}
        <label className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 text-center transition hover:border-fuchsia-500 ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Apèsi kouvèti" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-3xl">🖼️</span>
              <span className="mt-1 px-2 text-xs text-zinc-400">Imaj kouvèti (opsyonèl)</span>
            </>
          )}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
        </label>

        {/* Fichye odyo */}
        <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 p-6 text-center transition hover:border-fuchsia-500 ${busy ? "pointer-events-none opacity-60" : ""}`}>
          <span className="text-3xl">🎵</span>
          {audio ? (
            <>
              <span className="mt-2 max-w-full truncate font-medium text-white">{audio.name}</span>
              <span className="text-xs text-zinc-400">{formatMB(audio.size)} · Klike pou chanje</span>
            </>
          ) : (
            <>
              <span className="mt-2 font-medium text-white">Chwazi fichye odyo a</span>
              <span className="text-xs text-zinc-400">MP3, M4A, WAV, OGG, FLAC · Maks 50 MB</span>
            </>
          )}
          <input type="file" accept=".mp3,.m4a,.wav,.ogg,.flac" className="sr-only" onChange={(e) => pickAudio(e.target.files?.[0])} />
        </label>
      </div>

      {busy && (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          {cover && <ProgressBar label="Imaj kouvèti" value={coverProgress} />}
          <ProgressBar label="Fichye odyo" value={audioProgress} />
          <p className="text-xs text-zinc-500">
            Pa fèmen paj la. Si koneksyon an koupe, upload la ap kontinye poukont li lè l tounen.
          </p>
        </div>
      )}

      <Field label="▶ Lyen YouTube (opsyonèl)">
        <input name="youtube_url" disabled={busy} placeholder="Egz: lyen videyo klip la sou YouTube" className={inputClass} />
      </Field>

      <SplitsEditor splits={splits} onChange={setSplits} disabled={busy} />

      <FormMessage error={error} />

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Upload ap fèt..." : "Pibliye chante a"}
      </button>
    </form>
  );
}
