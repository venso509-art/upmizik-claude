"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GenreSelect } from "@/components/GenreSelect";
import { normalizeGenre } from "@/lib/genres";
import { AUDIO_TYPES, IMAGE_TYPES, fileExtension, readAudioDuration, uploadResumable } from "@/lib/upload";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { SplitsEditor } from "@/components/splits/SplitsEditor";
import { FeaturingEditor, featuringTotal, type Featuring } from "@/components/upload/FeaturingEditor";
import { RELEASE_LABELS, type ReleaseKind } from "@/lib/releases";
import { normalizeUrl } from "@/lib/links";
import { splitsTotal, validateSplits, type Split } from "@/lib/splits";
import { maxAudioBytes, maxSplits } from "@/lib/pro";
import { ImageCropper } from "@/components/media/ImageCropper";

// 💿 Pibliye yon pwojè konplè (Album, EP, Mixtape, Demo) yon sèl kou:
// yon sèl pochèt pou tout pwojè a, epi yon kaz pou chak chante (tit, odyo, featuring, royalties).
// Chante yo monte youn apre lòt, nan lòd lis la.

const MAX_TRACKS = 30;
const KINDS = Object.keys(RELEASE_LABELS).filter((k) => k !== "single") as ReleaseKind[];

type TrackStatus = "waiting" | "uploading" | "done" | "error";
type Track = {
  key: string;
  title: string;
  audio: File | null;
  youtube: string;
  featuring: Featuring[];
  splits: Split[];
  open: boolean; // seksyon featuring/royalties la louvri
  status: TrackStatus;
  progress: number;
  error?: string;
};

const newTrack = (audio: File | null = null): Track => ({
  key: crypto.randomUUID(),
  title: audio ? titleFromFile(audio) : "",
  audio,
  youtube: "",
  featuring: [],
  splits: [],
  open: false,
  status: "waiting",
  progress: 0,
});

// "03 - Lanmou_Lakay (feat X).mp3" → "Lanmou Lakay (feat X)"
function titleFromFile(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/^\s*\d{1,2}\s*[-.)_ ]\s*/, "")
    .trim()
    .slice(0, 200);
}

function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectUploadForm({ userId, pro = false }: { userId: string; pro?: boolean }) {
  const maxAudio = maxAudioBytes(pro);
  const router = useRouter();
  const [kind, setKind] = useState<ReleaseKind>("album");
  const [projectTitle, setProjectTitle] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverToCrop, setCoverToCrop] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(() => [newTrack(), newTrack(), newTrack()]);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string>();
  // Sa ki deja kreye, pou yon dezyèm esè pa refè yo (pochèt, pwojè, jan mizik)
  const made = useRef<{ releaseId: string | null; coverPath: string | null; genre: string | null }>({ releaseId: null, coverPath: null, genre: null });

  const label = RELEASE_LABELS[kind];
  const doneCount = tracks.filter((t) => t.status === "done").length;
  const failed = tracks.filter((t) => t.status === "error").length;
  const started = made.current.releaseId !== null;

  useEffect(() => {
    if (!cover) return setCoverPreview(null);
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function patch(key: string, p: Partial<Track>) {
    setTracks((list) => list.map((t) => (t.key === key ? { ...t, ...p } : t)));
  }

  function move(i: number, dir: -1 | 1) {
    setTracks((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function audioError(file: File) {
    if (!AUDIO_TYPES[fileExtension(file)]) return `« ${file.name} »: fòma sa a pa aksepte. Itilize MP3, M4A, WAV, OGG oswa FLAC.`;
    if (file.size > maxAudio)
      return `« ${file.name} » twò gwo (${formatMB(file.size)}). Maksimòm: ${formatMB(maxAudio)}.${pro ? "" : " Atis Pro yo ka voye jiska 100 MB."}`;
    return null;
  }

  function pickAudio(key: string, file: File | undefined) {
    setError(undefined);
    if (!file) return;
    const err = audioError(file);
    if (err) return setError(err);
    setTracks((list) => list.map((t) => (t.key === key ? { ...t, audio: file, title: t.title.trim() ? t.title : titleFromFile(file) } : t)));
  }

  // Chwazi plizyè odyo yon sèl kou: yo ranpli kaz vid yo, nan lòd non fichye yo
  function pickMany(files: FileList | null) {
    setError(undefined);
    if (!files?.length) return;
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const bad = sorted.map(audioError).filter(Boolean);
    const good = sorted.filter((f) => !audioError(f));
    setTracks((list) => {
      const next = [...list];
      for (const f of good) {
        const empty = next.findIndex((t) => !t.audio && t.status !== "done");
        if (empty >= 0) next[empty] = { ...next[empty], audio: f, title: next[empty].title.trim() ? next[empty].title : titleFromFile(f) };
        else if (next.length < MAX_TRACKS) next.push(newTrack(f));
      }
      return next;
    });
    if (bad.length) setError(bad.join(" "));
  }

  function pickCover(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Fòma imaj sa a pa aksepte. Itilize JPG, PNG oswa WebP.");
    if (file.size > 20 * 1024 * 1024) return setError(`Imaj la twò gwo (${formatMB(file.size)}). Maksimòm: 20 MB.`);
    setCoverToCrop(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const genre = made.current.genre ?? normalizeGenre(String(form.get("genre") ?? ""));
    const title = projectTitle.trim();

    // Kaz ki vid nèt yo pa konte
    const list = tracks.filter((t) => t.status === "done" || t.title.trim() || t.audio);
    const todo = list.filter((t) => t.status !== "done");
    if (!title) return setError(`Mete non ${label.label} a.`);
    if (genre === undefined) return setError("Jan mizik la pa valid (2 a 40 lèt).");
    if (!started && !cover) return setError(`Mete pochèt ${label.label} a. Se li ki ap parèt sou tout chante yo.`);
    if (list.length === 0) return setError("Ajoute omwen yon chante.");
    for (const t of todo) {
      const n = list.indexOf(t) + 1;
      if (!t.title.trim()) return setError(`Chante #${n}: mete tit la.`);
      if (!t.audio) return setError(`Chante #${n} (« ${t.title.trim()} »): chwazi fichye odyo a.`);
      if (normalizeUrl(t.youtube) === undefined) return setError(`Chante #${n}: lyen YouTube la pa valid.`);
      const splitsError = validateSplits(t.splits, maxSplits(pro));
      if (splitsError) return setError(`Chante #${n}: ${splitsError}`);
      if (featuringTotal(t.featuring) + splitsTotal(t.splits) > 100) return setError(`Chante #${n}: total pousantaj yo depase 100%.`);
    }

    setError(undefined);
    setBusy(true);
    setTracks(list); // retire kaz vid yo
    const supabase = createClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesyon ou ekspire. Konekte ankò.");

      // 1. Pochèt la, yon sèl fwa pou tout pwojè a
      if (!made.current.coverPath && cover) {
        const ext = fileExtension(cover);
        made.current.coverPath = await uploadResumable({
          bucket: "covers",
          path: `${userId}/${crypto.randomUUID()}.${ext}`,
          file: cover,
          contentType: IMAGE_TYPES[ext],
          accessToken: session.access_token,
          onProgress: () => {},
        });
      }

      // 2. Pwojè a (oswa youn ki deja egziste ak menm non an)
      if (!made.current.releaseId) {
        const { data: rel, error: relError } = await supabase.from("releases").insert({ artist_id: userId, title, kind }).select("id").single();
        if (rel) made.current.releaseId = rel.id;
        else {
          const { data: same } = await supabase.from("releases").select("id").eq("artist_id", userId).eq("kind", kind).eq("title", title).maybeSingle();
          if (!same) throw new Error(`${label.label} a pa kreye: ${relError?.message ?? "erè"}`);
          made.current.releaseId = same.id;
        }
      }
      made.current.genre = genre;
      const releaseId = made.current.releaseId;

      // 3. Chante yo, youn apre lòt, nan lòd lis la
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t.status === "done" || !t.audio) continue;
        patch(t.key, { status: "uploading", progress: 0, error: undefined });
        let audioPath: string | null = null;
        let songId: string | null = null;
        try {
          const duration = await readAudioDuration(t.audio);
          const ext = fileExtension(t.audio);
          audioPath = await uploadResumable({
            bucket: "audio",
            path: `${userId}/${crypto.randomUUID()}.${ext}`,
            file: t.audio,
            contentType: AUDIO_TYPES[ext],
            accessToken: session.access_token,
            onProgress: (p) => patch(t.key, { progress: p }),
          });

          const { data: song, error: insertError } = await supabase
            .from("songs")
            .insert({
              artist_id: userId,
              title: t.title.trim(),
              genre,
              youtube_url: normalizeUrl(t.youtube) ?? null,
              audio_path: audioPath,
              cover_path: made.current.coverPath,
              duration_seconds: duration,
              release_id: releaseId,
              track_number: i + 1,
            })
            .select("id")
            .single();
          if (insertError) throw new Error(insertError.message);
          songId = song.id;

          if (t.splits.length > 0) {
            const { error: e1 } = await supabase.rpc("set_song_splits", { p_song_id: song.id, p_splits: t.splits });
            if (e1) throw new Error(`Pataj royalties la pa sove: ${e1.message}`);
          }
          if (t.featuring.length > 0) {
            const { error: e2 } = await supabase.rpc("set_song_artists", {
              p_song_id: song.id,
              p_artists: t.featuring.map((f) => ({ artist_id: f.artistId, percentage: f.percentage || 0 })),
            });
            if (e2) throw new Error(`Featuring yo pa sove: ${e2.message}`);
          }
          patch(t.key, { status: "done", progress: 1 });
        } catch (err) {
          // Pa kite yon chante pibliye san akò l, ni yon fichye pou granmesi
          if (songId) await supabase.from("songs").delete().eq("id", songId);
          if (audioPath) await supabase.storage.from("audio").remove([audioPath]);
          patch(t.key, { status: "error", error: err instanceof Error ? err.message : String(err) });
        }
      }
      setFinished(true);
      router.refresh();
    } catch (err) {
      setError(`Upload la echwe: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  // Tout chante yo pase
  if (finished && !busy && failed === 0 && doneCount > 0) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-5xl">🎉</p>
        <FormMessage message={`${label.icon} ${label.label} « ${projectTitle.trim()} » pibliye ak ${doneCount} chante!`} />
        <div className="flex flex-wrap justify-center gap-3">
          {made.current.releaseId && (
            <Link href={`/albom/${made.current.releaseId}`} className="rounded-lg btn-primary px-4 py-2.5 font-semibold">
              Wè {label.label} a
            </Link>
          )}
          <Link href="/dashboard" className="rounded-lg border border-zinc-700 px-4 py-2.5 text-zinc-200 hover:border-zinc-500">
            Dashboard mwen
          </Link>
        </div>
      </div>
    );
  }

  const locked = busy || started; // apre premye esè a, pwojè a fikse (non, kalite, pochèt)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {coverToCrop && (
        <ImageCropper
          file={coverToCrop}
          options={{ aspect: 1, outputWidth: 1000, title: `✂️ Santre pochèt ${label.label} a` }}
          onCancel={() => setCoverToCrop(null)}
          onDone={(f) => {
            setCover(f);
            setCoverToCrop(null);
          }}
        />
      )}

      {/* Kalite pwojè a */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={locked}
            onClick={() => setKind(k)}
            className={`rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
              kind === k ? "border-citron-400 bg-citron-400/10" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span className="block text-sm font-semibold text-white">
              {RELEASE_LABELS[k].icon} {RELEASE_LABELS[k].label}
            </span>
            <span className="block text-[11px] text-zinc-500">{RELEASE_LABELS[k].hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        {/* Yon sèl pochèt pou tout pwojè a */}
        <label
          className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 text-center transition hover:border-fuchsia-500 ${locked ? "pointer-events-none opacity-70" : ""}`}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Apèsi pochèt" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-3xl">🖼️</span>
              <span className="mt-1 px-2 text-xs text-zinc-400">Pochèt {label.label} a</span>
              <span className="px-2 text-[10px] text-zinc-500">Li parèt sou tout chante yo</span>
            </>
          )}
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

        <div className="space-y-4">
          <Field label={`Non ${label.label} a`}>
            <input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              disabled={locked}
              maxLength={120}
              placeholder="Egz: Lakay Mwen"
              className={inputClass}
            />
          </Field>
          <Field label="Jan mizik (pou tout chante yo)">
            <GenreSelect disabled={locked} />
          </Field>
        </div>
      </div>

      {/* Chante yo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-white">
          🎶 Chante yo <span className="text-sm font-normal text-zinc-500">({tracks.length}/{MAX_TRACKS})</span>
        </p>
        <label className={`cursor-pointer rounded-full border border-fuchsia-500/50 px-3 py-1.5 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/10 ${busy ? "pointer-events-none opacity-50" : ""}`}>
          📂 Chwazi plizyè odyo yon sèl kou
          <input
            type="file"
            multiple
            accept=".mp3,.m4a,.wav,.ogg,.flac"
            className="sr-only"
            onChange={(e) => {
              pickMany(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <ol className="space-y-3">
        {tracks.map((t, i) => {
          const done = t.status === "done";
          const off = busy || done;
          const shares = featuringTotal(t.featuring) + splitsTotal(t.splits);
          return (
            <li
              key={t.key}
              className={`rounded-xl border p-3 ${
                done ? "border-emerald-500/40 bg-emerald-500/5" : t.status === "error" ? "border-red-500/50 bg-red-500/5" : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-black text-citron-300">
                  {done ? "✓" : i + 1}
                </span>
                <input
                  value={t.title}
                  onChange={(e) => patch(t.key, { title: e.target.value })}
                  disabled={off}
                  maxLength={200}
                  placeholder={`Tit chante #${i + 1}`}
                  aria-label={`Tit chante #${i + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500 disabled:opacity-70"
                />
                {!off && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md px-1.5 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" aria-label="Monte l">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} className="rounded-md px-1.5 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30" aria-label="Desann li">
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setTracks((list) => list.filter((x) => x.key !== t.key))}
                      disabled={tracks.length === 1}
                      className="rounded-md px-1.5 py-1 text-zinc-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-30"
                      aria-label="Retire chante sa a"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              <label className={`mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm hover:border-fuchsia-500 ${off ? "pointer-events-none opacity-70" : ""}`}>
                <span>🎵</span>
                {t.audio ? (
                  <span className="min-w-0 flex-1 truncate text-zinc-200">
                    {t.audio.name} <span className="text-xs text-zinc-500">· {formatMB(t.audio.size)}</span>
                  </span>
                ) : (
                  <span className="flex-1 text-zinc-400">Chwazi fichye odyo a · Maks {pro ? "100" : "50"} MB</span>
                )}
                <input
                  type="file"
                  accept=".mp3,.m4a,.wav,.ogg,.flac"
                  className="sr-only"
                  onChange={(e) => {
                    pickAudio(t.key, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>

              {t.status === "uploading" && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-citron-400 transition-all" style={{ width: `${t.progress * 100}%` }} />
                </div>
              )}
              {t.status === "error" && <p className="mt-2 text-xs text-red-300">⚠️ {t.error}</p>}

              {!done && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patch(t.key, { open: !t.open })}
                    className="mt-2 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    {t.open ? "▾" : "▸"} Featuring, royalties, YouTube
                    {(t.featuring.length > 0 || t.splits.length > 0 || t.youtube) && (
                      <span className="ml-1 text-citron-300">
                        ({[t.featuring.length && `${t.featuring.length} feat`, t.splits.length && `${t.splits.length} kolaboratè`, t.youtube && "YouTube"].filter(Boolean).join(" · ")})
                      </span>
                    )}
                  </button>
                  {t.open && (
                    <div className="mt-3 space-y-3">
                      <input
                        value={t.youtube}
                        onChange={(e) => patch(t.key, { youtube: e.target.value })}
                        disabled={busy}
                        placeholder="▶ Lyen YouTube (opsyonèl)"
                        className={inputClass}
                      />
                      <FeaturingEditor value={t.featuring} onChange={(v) => patch(t.key, { featuring: v })} otherTotal={splitsTotal(t.splits)} disabled={busy} />
                      <SplitsEditor splits={t.splits} onChange={(v) => patch(t.key, { splits: v })} disabled={busy} reserved={featuringTotal(t.featuring)} max={maxSplits(pro)} />
                      {shares > 100 && <p className="text-xs text-red-300">⛔ Total pousantaj yo depase 100%.</p>}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>

      {tracks.length < MAX_TRACKS && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setTracks((list) => [...list, newTrack()])}
          className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:border-citron-400 hover:text-white disabled:opacity-50"
        >
          ➕ Ajoute yon lòt chante
        </button>
      )}

      {busy && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
          ⏳ {doneCount}/{tracks.length} chante monte. Pa fèmen paj la. Si koneksyon an koupe, upload la ap kontinye poukont li lè l tounen.
        </p>
      )}
      {finished && !busy && failed > 0 && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-200">
          {doneCount} chante pibliye, {failed} pa pase. Tcheke chante ki an wouj yo, epi peze bouton an ankò: se sèlman yo k ap remonte.
        </p>
      )}

      <FormMessage error={error} />

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg btn-primary px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Upload ap fèt..." : started ? "🔁 Re-eseye chante ki pa pase yo" : `Pibliye ${label.label} a`}
      </button>
    </form>
  );
}
