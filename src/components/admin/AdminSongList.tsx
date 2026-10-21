"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { adminDeleteSong, adminUpdateSong } from "@/app/admin/mizik/actions";
import { setArchived } from "@/app/admin/achiv/actions";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { Portal } from "@/components/Portal";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { createClient } from "@/lib/supabase/client";
import { GENRES } from "@/lib/genres";
import { IMAGE_TYPES, fileExtension } from "@/lib/upload";
import { formatDuration } from "@/lib/songs";

export type AdminSong = {
  track: Track;
  plays: number;
  createdAt: string;
  paused: boolean;
  youtubeUrl: string | null;
};

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
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

// Fenèt pou modifye yon chante (tit, jan, YouTube, pochèt)
function EditSong({ song, onClose }: { song: AdminSong; onClose: () => void }) {
  const t = song.track;
  const [title, setTitle] = useState(t.title);
  const [genre, setGenre] = useState(t.genre ?? "");
  const [youtube, setYoutube] = useState(song.youtubeUrl ?? "");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!cover) return setCoverPreview(null);
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function pickCover(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Pochèt la dwe JPG, PNG oswa WebP.");
    if (file.size > MAX_COVER_BYTES) return setError("Pochèt la twò gwo (maks 5 MB).");
    setCover(file);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      let coverPath: string | null = null;
      const supabase = createClient();
      if (cover) {
        const ext = fileExtension(cover);
        coverPath = `${t.artistId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(coverPath, cover, { contentType: IMAGE_TYPES[ext] });
        if (upErr) return setError(`Pochèt la pa monte: ${upErr.message}`);
      }
      const res = await adminUpdateSong(t.id, { title, genre, youtubeUrl: youtube, coverPath });
      if (res.error) {
        if (coverPath) await supabase.storage.from("covers").remove([coverPath]);
        return setError(res.error);
      }
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-white">✏️ Modifye chante a</h2>
      <p className="mt-1 text-sm text-zinc-400">
        🎤 {t.artistName} · Atis la ap wè chanjman yo sou dashboard li.
      </p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="flex items-center gap-4">
          <span className="block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40">
            {coverPreview || t.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview ?? t.coverUrl ?? ""} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl">🎵</span>
            )}
          </span>
          <label className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
            🖼️ Chanje pochèt la
            <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
          </label>
        </div>
        <Field label="Tit">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={inputClass} />
        </Field>
        <Field label="Jan mizik">
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputClass}>
            <option value="">— San jan —</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lyen YouTube (si genyen)">
          <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputClass} />
        </Field>
        <FormMessage error={error} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Anile
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Ap sove…" : "💾 Sove"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Konfimasyon pou efase: admin nan dwe tape tit chante a
function DeleteSong({ song, onClose }: { song: AdminSong; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const ok = typed.trim().toLowerCase() === song.track.title.trim().toLowerCase();

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold text-white">🗑️ Efase chante a nèt?</h2>
      <p className="mt-2 text-sm text-zinc-300">
        « <strong>{song.track.title}</strong> » pa {song.track.artistName} ap efase nèt, ak fichye odyo a, pochèt la, likes yo ak kòmantè yo.{" "}
        <strong className="text-red-300">Ou p ap ka retabli l.</strong>
      </p>
      <p className="mt-3 text-sm text-zinc-400">
        Si w jis vle kache l pou yon ti tan, itilize <strong className="text-zinc-200">⏸ Poz</strong> pito.
      </p>
      <Field label={`Tape tit la pou konfime: ${song.track.title}`}>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoFocus />
      </Field>
      <FormMessage error={error} />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:text-white">
          Anile
        </button>
        <button
          type="button"
          disabled={!ok || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await adminDeleteSong(song.track.id);
              if (res.error) setError(res.error);
              else onClose();
            })
          }
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
        >
          {pending ? "Ap efase…" : "🗑️ Efase nèt"}
        </button>
      </div>
    </Modal>
  );
}

function SongRow({ song, queue, onEdit, onDelete }: { song: AdminSong; queue: Track[]; onEdit: () => void; onDelete: () => void }) {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const t = song.track;
  const isCurrent = current?.id === t.id;

  return (
    <li
      className={`rounded-2xl border p-3 transition sm:p-4 ${song.paused ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/40"} ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (isCurrent ? toggle() : playTrack(t, queue))}
          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600/40 to-violet-800/40"
          aria-label={`${isCurrent && isPlaying ? "Poz" : "Jwe"} ${t.title}`}
        >
          {t.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.coverUrl} alt="" className={`h-full w-full object-cover ${song.paused ? "grayscale" : ""}`} />
          ) : (
            <span className="flex h-full items-center justify-center text-xl">🎵</span>
          )}
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/50 text-lg text-white transition ${
              isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isCurrent && isPlaying ? "⏸" : "▶"}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/chante/${t.id}`} className={`truncate font-semibold hover:underline ${isCurrent ? "text-fuchsia-400" : "text-white"}`}>
              {t.title}
            </Link>
            {song.paused && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">⏸ An poz</span>
            )}
          </div>
          <p className="truncate text-sm text-zinc-400">
            <Link href={`/atis/${t.artistId}`} className="hover:text-white hover:underline">
              🎤 {t.artistName}
            </Link>
            {t.genre ? ` · ${t.genre}` : ""}
          </p>
          <p className="text-xs text-zinc-500">
            🎧 {song.plays.toLocaleString("fr-HT")} · ⏱ {formatDuration(t.durationSeconds)} ·{" "}
            {new Date(song.createdAt).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:ml-[4.25rem]">
        <button type="button" onClick={onEdit} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
          ✏️ Modifye
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(undefined);
              const res = await setArchived("songs", t.id, !song.paused);
              if (res.error) setError(res.error);
            })
          }
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:cursor-wait ${
            song.paused ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
          }`}
        >
          {song.paused ? "▶ Reaktive" : "⏸ Poz"}
        </button>
        <button type="button" onClick={onDelete} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10">
          🗑️ Efase
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </li>
  );
}

export function AdminSongList({ songs }: { songs: AdminSong[] }) {
  const [editing, setEditing] = useState<AdminSong | null>(null);
  const [deleting, setDeleting] = useState<AdminSong | null>(null);
  const queue = songs.filter((s) => !s.paused).map((s) => s.track);

  if (songs.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center text-zinc-400">Pa gen mizik isit la.</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {songs.map((s) => (
          <SongRow key={s.track.id} song={s} queue={queue.length ? queue : [s.track]} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
        ))}
      </ul>
      {editing && <EditSong song={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteSong song={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}
