"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/auth/ui";
import { RELEASE_LABELS, type ReleaseChoice, type ReleaseKind } from "@/lib/releases";

export type ReleaseValue = {
  kind: ReleaseChoice;
  releaseId: string | null; // piblikasyon ki deja egziste
  newTitle: string; // oswa tit yon nouvo piblikasyon
  trackNumber: string;
};

export const EMPTY_RELEASE: ReleaseValue = { kind: "single", releaseId: null, newTitle: "", trackNumber: "" };
const NEW = "__nouvo__";

// Chwa: Single, EP, Mixtape oswa Album. Pou yon piblikasyon, atis la chwazi youn li te deja kreye
// (tout chante ki ladan l ap gen menm non an) oswa li kreye yon nouvo.
export function ReleasePicker({ artistId, value, onChange, disabled }: { artistId: string; value: ReleaseValue; onChange: (v: ReleaseValue) => void; disabled?: boolean }) {
  const [existing, setExisting] = useState<{ id: string; title: string; kind: ReleaseKind; tracks: number }[]>([]);

  // Piblikasyon atis la deja genyen yo
  useEffect(() => {
    void (async () => {
      const { data } = await createClient()
        .from("releases")
        .select("id, title, kind, songs(count)")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      setExisting(
        ((data ?? []) as { id: string; title: string; kind: ReleaseKind; songs: { count: number }[] }[]).map((r) => ({
          id: r.id,
          title: r.title,
          kind: r.kind,
          tracks: r.songs?.[0]?.count ?? 0,
        })),
      );
    })();
  }, [artistId]);

  const ofKind = value.kind === "single" ? [] : existing.filter((r) => r.kind === value.kind);
  const label = RELEASE_LABELS[value.kind];
  const selectValue = value.releaseId ?? NEW;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="font-semibold text-white">💿 Kalite piblikasyon</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(RELEASE_LABELS) as ReleaseChoice[]).map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => {
              const first = k === "single" ? null : existing.find((r) => r.kind === k)?.id ?? null;
              onChange({ ...value, kind: k, releaseId: first, newTitle: "" });
            }}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${
              value.kind === k ? "border-citron-400 bg-citron-400/10" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span className="block text-sm font-semibold text-white">
              {RELEASE_LABELS[k].icon} {RELEASE_LABELS[k].label}
            </span>
            <span className="block text-[11px] text-zinc-500">{RELEASE_LABELS[k].hint}</span>
          </button>
        ))}
      </div>

      {value.kind !== "single" && (
        <div className="mt-4 space-y-3">
          <select
            value={selectValue}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, releaseId: e.target.value === NEW ? null : e.target.value })}
            className={inputClass}
            aria-label={`Chwazi ${label.label} a`}
          >
            {ofKind.map((r) => (
              <option key={r.id} value={r.id}>
                {label.icon} {r.title} ({r.tracks} chante)
              </option>
            ))}
            <option value={NEW}>➕ Nouvo {label.label}…</option>
          </select>
          {!value.releaseId && (
            <input
              value={value.newTitle}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, newTitle: e.target.value })}
              maxLength={120}
              placeholder={`Non ${label.label} a (egz: Lakay Mwen)`}
              className={inputClass}
              aria-label={`Non nouvo ${label.label} a`}
            />
          )}
          <div className="flex items-center gap-3">
            <label className="text-sm text-zinc-400" htmlFor="track-number">
              Nimewo chante a nan lis la
            </label>
            <input
              id="track-number"
              inputMode="numeric"
              value={value.trackNumber}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, trackNumber: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              placeholder="Oto"
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-white outline-none focus:border-fuchsia-500"
            />
          </div>
          <p className="text-xs text-zinc-500">Si w pa mete nimewo, chante a ap vin apre dènye chante ki deja nan {label.label} a.</p>
        </div>
      )}
    </div>
  );
}
