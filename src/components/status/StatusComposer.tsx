"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fileExtension, uploadResumable } from "@/lib/upload";
import { timeAgo } from "@/lib/posts";
import { ProBadge } from "@/components/pro/ProBadge";
import { StatusViewer } from "@/components/status/StatusViewer";
import {
  STATUSES_PER_DAY,
  STATUS_BACKGROUNDS,
  STATUS_MAX_BYTES,
  STATUS_MEDIA,
  STATUS_TEXT_MAX,
  statusMediaUrl,
  type ArtistStatus,
  type StatusKind,
} from "@/lib/statuses";

const KINDS: { key: StatusKind; label: string; icon: string }[] = [
  { key: "text", label: "Tèks", icon: "✍️" },
  { key: "image", label: "Foto", icon: "🖼️" },
  { key: "video", label: "Videyo", icon: "🎬" },
  { key: "audio", label: "Odyo", icon: "🎙️" },
];

const KIND_LABEL: Record<StatusKind, string> = { text: "✍️ Tèks", image: "🖼️ Foto", video: "🎬 Videyo", audio: "🎙️ Odyo" };

// Dashboard: atis Pro a poste stati 24 è (5 pa jou). Atis ki pa Pro wè yon kat pou l vin Pro.
export function StatusComposer({ pro, artist }: { pro: boolean; artist: { id: string; name: string; avatarUrl: string | null; verified?: boolean } }) {
  const supabase = createClient();
  const [kind, setKind] = useState<StatusKind>("text");
  const [body, setBody] = useState("");
  const [bg, setBg] = useState(STATUS_BACKGROUNDS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [mine, setMine] = useState<ArtistStatus[]>([]);
  const [viewing, setViewing] = useState(false);

  // Stati m yo ki poko ekspire, ak konbyen m poste nan dènye 24 è yo
  const refresh = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("artist_statuses")
      .select("id, artist_id, kind, media_path, body, bg, created_at, expires_at")
      .eq("artist_id", artist.id)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .returns<ArtistStatus[]>();
    setMine(data ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist.id]);

  useEffect(() => {
    if (pro) void refresh();
  }, [pro, refresh]);

  useEffect(() => {
    if (!file || kind === "audio") return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  if (!pro) {
    return (
      <section className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-citron-400/30 bg-gradient-to-r from-citron-400/10 to-transparent p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-citron-400/20 text-2xl" aria-hidden>
          📸
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-bold text-white">
            Stati 24 è <ProBadge />
          </p>
          <p className="text-sm text-zinc-400">Poste yon foto, yon videyo, yon odyo oswa yon tèks ki parèt nan wonn ou sou paj akèy la, tankou sou WhatsApp.</p>
        </div>
        <Link href="/pwofil" className="btn-primary rounded-full px-4 py-2 text-sm">
          ⭐ Vin Pro
        </Link>
      </section>
    );
  }

  const used = mine.length;
  const left = Math.max(0, STATUSES_PER_DAY - used);
  const live = mine.filter((s) => new Date(s.expires_at).getTime() > Date.now());

  function pick(f: File | undefined) {
    setError(undefined);
    if (!f || kind === "text") return;
    const media = STATUS_MEDIA[kind];
    if (!media.types[fileExtension(f)]) return setError(`Fichye sa a pa bon pou yon stati ${KINDS.find((k) => k.key === kind)?.label.toLowerCase()}.`);
    if (f.size > STATUS_MAX_BYTES) return setError("Fichye a twò gwo. Maksimòm: 30 MB.");
    setFile(f);
  }

  async function publish() {
    setError(undefined);
    setMessage(undefined);
    if (kind === "text" && !body.trim()) return setError("Ekri yon ti mesaj.");
    if (kind !== "text" && !file) return setError("Chwazi yon fichye.");
    setBusy(true);
    setProgress(0);
    try {
      let mediaPath: string | null = null;
      if (kind !== "text" && file) {
        const ext = fileExtension(file);
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error("Ou dwe konekte.");
        mediaPath = await uploadResumable({
          bucket: "statuses",
          path: `${artist.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`,
          file,
          contentType: STATUS_MEDIA[kind].types[ext],
          accessToken: session.session.access_token,
          onProgress: setProgress,
        });
      }
      const { error: err } = await supabase.from("artist_statuses").insert({
        artist_id: artist.id,
        kind,
        media_path: mediaPath,
        body: body.trim() || null,
        bg: kind === "text" ? bg : null,
      });
      if (err) {
        if (mediaPath) await supabase.storage.from("statuses").remove([mediaPath]);
        throw new Error(err.message);
      }
      setBody("");
      setFile(null);
      setMessage("Stati ou pibliye! Li parèt nan wonn ou pou 24 è. 🎉");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stati a pa pibliye. Eseye ankò.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: ArtistStatus) {
    if (!confirm("Efase stati sa a?")) return;
    const { error: err } = await supabase.from("artist_statuses").delete().eq("id", s.id);
    if (err) return setError(err.message);
    if (s.media_path) await supabase.storage.from("statuses").remove([s.media_path]);
    await refresh();
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            📸 Stati 24 è <ProBadge />
          </h2>
          <p className="text-sm text-zinc-400">Fanatik ou yo wè l lè yo klike sou wonn ou. Li disparèt apre 24 è.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${left > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
          {used}/{STATUSES_PER_DAY} jodi a
        </span>
      </div>

      {/* Kalite stati a */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            disabled={busy}
            onClick={() => {
              setKind(k.key);
              setFile(null);
              setError(undefined);
            }}
            className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
              kind === k.key ? "border-citron-400 bg-citron-400/10 text-white" : "border-zinc-700 text-zinc-400 hover:text-white"
            }`}
          >
            <span className="block text-lg" aria-hidden>
              {k.icon}
            </span>
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {kind === "text" ? (
          <>
            <div className="flex min-h-[10rem] items-center justify-center rounded-2xl p-4 transition-colors" style={{ background: bg }}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, STATUS_TEXT_MAX))}
                disabled={busy}
                rows={3}
                placeholder="Sa k ap pase jodi a?"
                className="w-full resize-none bg-transparent text-center text-xl font-bold text-white placeholder:text-white/60 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_BACKGROUNDS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBg(c)}
                  className={`h-8 w-8 rounded-full ring-2 transition ${bg === c ? "ring-white" : "ring-white/15"}`}
                  style={{ background: c }}
                  aria-label={`Koulè ${c}`}
                />
              ))}
              <span className="ml-auto text-xs text-zinc-500">
                {body.length}/{STATUS_TEXT_MAX}
              </span>
            </div>
          </>
        ) : (
          <>
            <label
              className={`relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-citron-400 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {file && preview && kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="max-h-60 w-full object-contain" />
              ) : file && preview && kind === "video" ? (
                <video src={preview} muted playsInline className="max-h-60 w-full object-contain" />
              ) : file ? (
                <span className="px-4 text-sm text-white">🎙️ {file.name}</span>
              ) : (
                <>
                  <span className="text-3xl">{KINDS.find((k) => k.key === kind)?.icon}</span>
                  <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi {kind === "image" ? "yon foto" : kind === "video" ? "yon ti videyo" : "yon odyo"}</span>
                  <span className="text-xs text-zinc-500">Maks 30 MB</span>
                </>
              )}
              <input type="file" accept={STATUS_MEDIA[kind].accept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 200))}
              disabled={busy}
              placeholder="Yon ti mesaj (opsyonèl)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-citron-400"
            />
          </>
        )}

        {busy && kind !== "text" && (
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-citron-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

        <button type="button" onClick={publish} disabled={busy || left === 0} className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-50">
          {busy ? (kind === "text" ? "Ap pibliye…" : `Ap voye… ${Math.round(progress * 100)}%`) : left === 0 ? "Ou rive nan 5 stati jodi a" : "📸 Pibliye stati a"}
        </button>
      </div>

      {/* Stati m yo ki vivan */}
      {live.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Stati ou yo ({live.length})</p>
            <button type="button" onClick={() => setViewing(true)} className="text-sm font-semibold text-citron-300 hover:text-citron-200">
              ▶ Gade yo
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {live.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 text-lg"
                  style={s.kind === "text" ? { background: s.bg ?? undefined } : undefined}
                >
                  {s.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={statusMediaUrl(supabase, s.media_path) ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : s.kind === "text" ? (
                    "✍️"
                  ) : s.kind === "video" ? (
                    "🎬"
                  ) : (
                    "🎙️"
                  )}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate text-white">{s.body || KIND_LABEL[s.kind]}</p>
                  <p className="text-xs text-zinc-500">
                    {KIND_LABEL[s.kind]} · {timeAgo(s.created_at)}
                  </p>
                </div>
                <button type="button" onClick={() => remove(s)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10">
                  ✕ Efase
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {viewing && <StatusViewer artist={artist} onClose={() => setViewing(false)} />}
    </section>
  );
}
