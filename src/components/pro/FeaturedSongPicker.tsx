"use client";

import { useState, useTransition } from "react";
import { setFeaturedSong } from "@/app/pro/actions";

// Atis Pro a chwazi chante ki parèt gwo anlè paj pwofil li
export function FeaturedSongPicker({ songs, current }: { songs: { id: string; title: string }[]; current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  function save(next: string) {
    setValue(next);
    setMessage(undefined);
    startTransition(async () => {
      const res = await setFeaturedSong(next || null);
      setMessage(res.error ? { ok: false, text: res.error } : { ok: true, text: next ? "✓ Chante an vedèt la anrejistre." : "✓ Chante an vedèt la retire." });
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <label htmlFor="featured-song" className="flex items-center gap-2 text-sm font-semibold text-white">
        📌 Chante an vedèt sou pwofil ou
      </label>
      {songs.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">Pibliye yon chante anvan, epi w ap ka chwazi l isit la.</p>
      ) : (
        <select
          id="featured-song"
          value={value}
          disabled={pending}
          onChange={(e) => save(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-citron-400 disabled:opacity-60"
        >
          <option value="">Okenn (pa montre chante an vedèt)</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      )}
      {message && <p className={`mt-2 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
    </div>
  );
}
