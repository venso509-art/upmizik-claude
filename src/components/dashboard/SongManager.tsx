"use client";

import { useState, useTransition } from "react";
import { deleteSong, updateSong } from "@/app/dashboard/actions";
import { GENRES } from "@/lib/genres";
import { formatDuration } from "@/lib/songs";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";

export type ManagedSong = {
  id: string;
  title: string;
  genre: string | null;
  coverUrl: string | null;
  plays: number;
  durationSeconds: number | null;
  createdAt: string;
};

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
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

export function SongManager({ songs }: { songs: ManagedSong[] }) {
  const [editing, setEditing] = useState<ManagedSong | null>(null);
  const [deleting, setDeleting] = useState<ManagedSong | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    setEditing(null);
    setDeleting(null);
    setError(undefined);
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSong(editing.id, String(form.get("title") ?? ""), String(form.get("genre") ?? ""));
      if (res.error) setError(res.error);
      else close();
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
              <p className="truncate font-medium text-white">{s.title}</p>
              <p className="truncate text-xs text-zinc-500">
                {s.genre ?? "San jan"} · {formatDuration(s.durationSeconds)} ·{" "}
                {new Date(s.createdAt).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-semibold tabular-nums text-white">{s.plays.toLocaleString("fr-HT")}</p>
              <p className="text-xs text-zinc-500">koute</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setEditing(s)}
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
            <Field label="Tit">
              <input name="title" defaultValue={editing.title} required maxLength={200} className={inputClass} />
            </Field>
            <Field label="Jan mizik">
              <select name="genre" defaultValue={editing.genre ?? ""} className={inputClass}>
                <option value="">San jan</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <FormMessage error={error} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="rounded-lg px-4 py-2.5 text-zinc-300 hover:text-white">
                Anile
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Ap sove..." : "Sove"}
              </button>
            </div>
          </form>
        </Modal>
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
