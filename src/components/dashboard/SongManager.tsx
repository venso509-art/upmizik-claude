"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { AUDIO_TYPES, IMAGE_TYPES, fileExtension, readAudioDuration, uploadResumable } from "@/lib/upload";
import { ImageCropper } from "@/components/media/ImageCropper";
import { deleteSong, getSongFeaturing, getSongSplits, updateSong } from "@/app/dashboard/actions";
import { FeaturingEditor, featuringTotal, type Featuring } from "@/components/upload/FeaturingEditor";
import { EMPTY_RELEASE, ReleasePicker, type ReleaseValue } from "@/components/upload/ReleasePicker";
import { GenreSelect } from "@/components/GenreSelect";
import { splitsTotal, validateSplits, type Split } from "@/lib/splits";
import { maxAudioBytes, maxSplits } from "@/lib/pro";
import { SplitsEditor } from "@/components/splits/SplitsEditor";
import { formatDuration } from "@/lib/songs";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { Portal } from "@/components/Portal";

export type ManagedSong = {
  id: string;
  title: string;
  genre: string | null;
  coverUrl: string | null;
  plays: number;
  comments: number;
  durationSeconds: number | null;
  youtubeUrl: string | null;
  createdAt: string;
  archived?: boolean; // admin nan achive l: li pa parèt sou sit la
  releaseId?: string | null;
  releaseKind?: "ep" | "mixtape" | "album" | null;
  trackNumber?: number | null;
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
    </Portal>
  );
}

function Cover({ url }: { url: string | null }) {
  return (
    <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center">🎵</span>
      )}
    </span>
  );
}

export function SongManager({ songs, artistId, pro = false }: { songs: ManagedSong[]; artistId: string; pro?: boolean }) {
  const [editing, setEditing] = useState<ManagedSong | null>(null);
  const [deleting, setDeleting] = useState<ManagedSong | null>(null);
  const [error, setError] = useState<string>();
  const [splits, setSplits] = useState<Split[] | null>(null);
  const [featuring, setFeaturing] = useState<Featuring[] | null>(null);
  const [release, setRelease] = useState<ReleaseValue>(EMPTY_RELEASE);
  const sharesOver = !!splits && !!featuring && featuringTotal(featuring) + splitsTotal(splits) > 100;
  const [pending, startTransition] = useTransition();
  // Ranplase fichye yo: nouvo afich (apre koupe) ak/oswa nouvo odyo
  const [newCover, setNewCover] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [newAudio, setNewAudio] = useState<File | null>(null);
  const [newDuration, setNewDuration] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ label: string; value: number } | null>(null);

  useEffect(() => {
    if (!newCover) return setCoverPreview(null);
    const url = URL.createObjectURL(newCover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newCover]);

  function pickCover(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Afich la dwe yon foto JPG, PNG oswa WebP.");
    if (file.size > 15 * 1024 * 1024) return setError("Foto a twò gwo.");
    setCropFile(file); // zouti koupe a louvri
  }

  async function pickAudio(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!AUDIO_TYPES[fileExtension(file)]) return setError("Odyo a dwe yon fichye MP3, M4A, WAV, OGG oswa FLAC.");
    if (file.size > maxAudioBytes(pro)) return setError(`Fichye odyo a twò gwo (maks ${Math.round(maxAudioBytes(pro) / 1024 / 1024)} MB).`);
    setNewAudio(file);
    setNewDuration(await readAudioDuration(file));
  }

  function close() {
    if (progress) return; // fichye yo ap monte
    setNewCover(null);
    setNewAudio(null);
    setNewDuration(null);
    setEditing(null);
    setDeleting(null);
    setSplits(null);
    setFeaturing(null);
    setError(undefined);
  }

  function openEdit(song: ManagedSong) {
    setEditing(song);
    setSplits(null);
    setFeaturing(null);
    getSongSplits(song.id).then(setSplits);
    getSongFeaturing(song.id).then(setFeaturing);
    // Piblikasyon chante a kounye a (Single si li pa nan okenn album)
    setRelease(
      song.releaseId && song.releaseKind
        ? { kind: song.releaseKind, releaseId: song.releaseId, newTitle: "", trackNumber: song.trackNumber ? String(song.trackNumber) : "" }
        : EMPTY_RELEASE,
    );
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing || !splits || !featuring) return;
    const form = new FormData(e.currentTarget);
    const splitsError = validateSplits(splits, maxSplits(pro));
    if (splitsError) return setError(splitsError);
    if (sharesOver) return setError("Total pousantaj yo (featuring + kolaboratè) depase 100%.");
    startTransition(async () => {
      // 1. Monte nouvo fichye yo (si gen) nan folder atis la
      const supabase = createClient();
      const uploaded: { bucket: string; path: string }[] = [];
      const media: { coverPath?: string; audioPath?: string; durationSeconds?: number | null } = {};
      try {
        if (newCover || newAudio) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sesyon ou ekspire. Konekte ankò.");
          if (newCover) {
            setProgress({ label: "Afich la", value: 0 });
            media.coverPath = await uploadResumable({
              bucket: "covers",
              path: `${artistId}/${crypto.randomUUID()}.jpg`,
              file: newCover,
              contentType: "image/jpeg",
              accessToken: session.access_token,
              onProgress: (v) => setProgress({ label: "Afich la", value: v * 100 }),
            });
            uploaded.push({ bucket: "covers", path: media.coverPath });
          }
          if (newAudio) {
            const ext = fileExtension(newAudio);
            setProgress({ label: "Odyo a", value: 0 });
            media.audioPath = await uploadResumable({
              bucket: "audio",
              path: `${artistId}/${crypto.randomUUID()}.${ext}`,
              file: newAudio,
              contentType: AUDIO_TYPES[ext],
              accessToken: session.access_token,
              onProgress: (v) => setProgress({ label: "Odyo a", value: v * 100 }),
            });
            media.durationSeconds = newDuration;
            uploaded.push({ bucket: "audio", path: media.audioPath });
          }
        }
      } catch (err) {
        setProgress(null);
        for (const f of uploaded) await supabase.storage.from(f.bucket).remove([f.path]);
        return setError(err instanceof Error ? err.message : "Fichye a pa monte. Eseye ankò.");
      }
      setProgress(null);

      // 2. Sove modifikasyon yo
      const res = await updateSong(editing.id, {
        title: String(form.get("title") ?? ""),
        genre: String(form.get("genre") ?? ""),
        youtubeUrl: String(form.get("youtube_url") ?? ""),
        splits,
        featuring: featuring.map((f) => ({ artistId: f.artistId, percentage: f.percentage })),
        release: { kind: release.kind, releaseId: release.releaseId, newTitle: release.newTitle, trackNumber: release.trackNumber ? Number(release.trackNumber) : null },
        media,
      });
      if (res.error) {
        for (const f of uploaded) await supabase.storage.from(f.bucket).remove([f.path]);
        setError(res.error);
      } else {
        setNewCover(null);
        setNewAudio(null);
        setNewDuration(null);
        setEditing(null);
        setSplits(null);
        setFeaturing(null);
        setError(undefined);
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteSong(deleting.id);
      if (res.error) setError(res.error);
      else close();
    });
  }

  return (
    <>
      <ul className="divide-y divide-zinc-800/70">
        {songs.map((s) => (
          <li key={s.id} className="flex items-center gap-4 py-3">
            <Cover url={s.coverUrl} />
            <div className="min-w-0 flex-1">
              <Link href={`/chante/${s.id}`} className="block truncate font-medium text-white hover:underline">
                {s.title}
                {s.archived && (
                  <span className="ml-2 rounded-full bg-zinc-700 px-2 py-0.5 text-[11px] font-normal text-zinc-300" title="Ekip UpMizik la achive chante sa a: li pa parèt sou sit la">
                    🗄️ Achive
                  </span>
                )}
              </Link>
              <p className="truncate text-xs text-zinc-500">
                {s.genre ?? "San jan"} · {formatDuration(s.durationSeconds)} ·{" "}
                {new Date(s.createdAt).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="hidden w-16 text-right sm:block">
              <p className="font-semibold tabular-nums text-white">{s.plays.toLocaleString("fr-HT")}</p>
              <p className="text-xs text-zinc-500">ekout</p>
            </div>
            <div className="hidden w-16 text-right sm:block">
              <p className="font-semibold tabular-nums text-white">{s.comments.toLocaleString("fr-HT")}</p>
              <p className="text-xs text-zinc-500">kòmantè</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => openEdit(s)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                aria-label={`Modifye ${s.title}`}
              >
                ✏️ <span className="hidden md:inline">Modifye</span>
              </button>
              <button
                onClick={() => setDeleting(s)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-red-950/60 hover:text-red-300"
                aria-label={`Efase ${s.title}`}
              >
                🗑️ <span className="hidden md:inline">Efase</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <Modal onClose={close}>
          <h3 className="text-lg font-bold text-white">Modifye chante a</h3>
          <form onSubmit={handleEdit} className="mt-5 space-y-4">
            {/* ===== FICHYE YO: afich + odyo ===== */}
            <div className="grid grid-cols-2 gap-3">
              {/* Afich */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
                  {coverPreview || editing.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview ?? editing.coverUrl ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-4xl">🎵</span>
                  )}
                  {newCover && (
                    <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-950">Nouvo ✓</span>
                  )}
                </div>
                <label
                  className={`mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] px-2 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10 ${pending ? "pointer-events-none opacity-50" : ""}`}
                >
                  🖼️ {newCover ? "Chwazi yon lòt" : "Chanje afich la"}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={(e) => {
                      pickCover(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {newCover && (
                  <button type="button" onClick={() => setNewCover(null)} className="mt-1 w-full text-center text-[11px] text-zinc-500 hover:text-white">
                    Kenbe ansyen an
                  </button>
                )}
              </div>

              {/* Odyo */}
              <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2.5">
                <div className="flex aspect-square flex-col items-center justify-center rounded-xl bg-gradient-to-br from-citron-400/15 to-fuchsia-700/20 p-2 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-citron-400 text-xl text-zinc-950 shadow-lg">🎵</span>
                  {newAudio ? (
                    <>
                      <span className="mt-2 w-full truncate text-xs font-bold text-white">{newAudio.name}</span>
                      <span className="text-[11px] text-emerald-300">
                        Nouvo ✓ · {formatDuration(newDuration)} · {(newAudio.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mt-2 text-xs font-bold text-white">Odyo aktyèl la</span>
                      <span className="text-[11px] text-zinc-400">{formatDuration(editing.durationSeconds)}</span>
                    </>
                  )}
                </div>
                <label
                  className={`mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] px-2 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10 ${pending ? "pointer-events-none opacity-50" : ""}`}
                >
                  🎧 {newAudio ? "Chwazi yon lòt" : "Chanje odyo a"}
                  <input
                    type="file"
                    accept=".mp3,.m4a,.wav,.ogg,.flac"
                    className="sr-only"
                    onChange={(e) => {
                      void pickAudio(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {newAudio && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewAudio(null);
                      setNewDuration(null);
                    }}
                    className="mt-1 w-full text-center text-[11px] text-zinc-500 hover:text-white"
                  >
                    Kenbe ansyen an
                  </button>
                )}
              </div>
            </div>
            {progress && (
              <div className="rounded-xl bg-zinc-950 p-3">
                <p className="text-xs text-zinc-300">
                  ⬆️ {progress.label} ap monte… {Math.round(progress.value)}%
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-citron-400 transition-[width]" style={{ width: `${progress.value}%` }} />
                </div>
              </div>
            )}

            <Field label="Tit">
              <input name="title" defaultValue={editing.title} required maxLength={200} className={inputClass} />
            </Field>
            <Field label="Jan mizik">
              <GenreSelect defaultValue={editing.genre} emptyLabel="San jan" />
            </Field>
            <Field label="▶ Lyen YouTube (opsyonèl)">
              <input name="youtube_url" defaultValue={editing.youtubeUrl ?? ""} placeholder="Lyen videyo klip la" className={inputClass} />
            </Field>
            {splits && featuring ? (
              <>
                <ReleasePicker artistId={artistId} value={release} onChange={setRelease} disabled={pending} />
                <FeaturingEditor value={featuring} onChange={setFeaturing} otherTotal={splitsTotal(splits)} disabled={pending} />
                <SplitsEditor splits={splits} onChange={setSplits} disabled={pending} reserved={featuringTotal(featuring)} max={maxSplits(pro)} />
              </>
            ) : (
              <p className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">Ap chaje featuring ak pataj royalties yo...</p>
            )}
            <FormMessage error={error} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="rounded-lg px-4 py-2.5 text-zinc-300 hover:text-white">
                Anile
              </button>
              <button
                type="submit"
                disabled={pending || !splits || !featuring || sharesOver}
                className="rounded-lg btn-primary px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Ap sove..." : sharesOver ? "⛔ Depase 100%" : "Sove"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Zouti koupe afich la (kare 1:1) */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          options={{ aspect: 1, outputWidth: 1000, title: "✂️ Koupe nouvo afich la" }}
          onDone={(f) => {
            setNewCover(f);
            setCropFile(null);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}

      {deleting && (
        <Modal onClose={close}>
          <p className="text-4xl">🗑️</p>
          <h3 className="mt-3 text-lg font-bold text-white">Efase &laquo; {deleting.title} &raquo;?</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Chante a ak fichye li yo ap efase nèt. Ou p ap ka retounen sou desizyon sa a.
          </p>
          <div className="mt-4">
            <FormMessage error={error} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded-lg px-4 py-2.5 text-zinc-300 hover:text-white">
              Anile
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {pending ? "Ap efase..." : "Wi, efase l"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
