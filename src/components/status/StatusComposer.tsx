"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fileExtension, uploadResumable } from "@/lib/upload";
import { timeAgo } from "@/lib/posts";
import { ProBadge } from "@/components/pro/ProBadge";
import { StatusViewer } from "@/components/status/StatusViewer";
import { StatusEditor, type EditedStatus } from "@/components/status/StatusEditor";
import { StatusOverlayLayer } from "@/components/status/StatusOverlayLayer";
import { STATUS_FONTS, statusFontClass } from "@/lib/statusFonts";
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
  const [font, setFont] = useState(STATUS_FONTS[0].key); // stil ekriti stati tèks la
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [mine, setMine] = useState<ArtistStatus[]>([]);
  const [viewing, setViewing] = useState(false);
  // Editè a: fichye orijinal la (pou re-modifye) ak rezilta a (foto koupe, stickers, videyo koupe)
  const [source, setSource] = useState<File | null>(null);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<EditedStatus | null>(null);
  // Like ak repons fanatik yo sou chak stati
  const [activity, setActivity] = useState<Record<string, { likes: number; replies: { id: string; body: string; created_at: string; name: string }[] }>>({});

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
    // Like + repons (vid si migration repons yo poko kouri)
    const ids = (data ?? []).map((s) => s.id);
    if (ids.length) {
      const [{ data: likes }, { data: replies }] = await Promise.all([
        supabase.from("status_likes").select("status_id").in("status_id", ids),
        supabase
          .from("status_replies")
          .select("id, status_id, body, created_at, profiles!status_replies_user_id_fkey(display_name)")
          .in("status_id", ids)
          .order("created_at", { ascending: false }),
      ]);
      const act: Record<string, { likes: number; replies: { id: string; body: string; created_at: string; name: string }[] }> = {};
      for (const id of ids) act[id] = { likes: 0, replies: [] };
      for (const l of (likes ?? []) as { status_id: string }[]) act[l.status_id].likes++;
      type R = { id: string; status_id: string; body: string; created_at: string; profiles: { display_name: string } | { display_name: string }[] | null };
      for (const r of (replies ?? []) as R[]) {
        const pr = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        act[r.status_id].replies.push({ id: r.id, body: r.body, created_at: r.created_at, name: pr?.display_name ?? "Fanatik" });
      }
      setActivity(act);
    }
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
    if (kind === "audio") return setFile(f);
    // Foto ak videyo: louvri editè a (santre, stickers, lejand, koupe)
    setSource(f);
    setEdited(null);
    setFile(null);
    setEditing(true);
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
      const row = { artist_id: artist.id, kind, media_path: mediaPath, body: body.trim() || null, bg: kind === "text" ? bg : null };
      const extra =
        edited && (kind === "image" || kind === "video")
          ? {
              overlay: edited.items.length ? { items: edited.items } : null,
              focus_x: edited.focusX,
              focus_y: edited.focusY,
              trim_start: edited.trimStart,
              trim_end: edited.trimEnd,
            }
          : kind === "text" && font !== STATUS_FONTS[0].key
            ? { overlay: { items: [], font } }
            : {};
      let { error: err } = await supabase.from("artist_statuses").insert({ ...row, ...extra });
      // Migration editè a poko kouri: pibliye l san stickers yo
      if (err && (err.code === "42703" || err.code === "PGRST204")) ({ error: err } = await supabase.from("artist_statuses").insert(row));
      if (err) {
        if (mediaPath) await supabase.storage.from("statuses").remove([mediaPath]);
        throw new Error(err.message);
      }
      setBody("");
      setFile(null);
      setSource(null);
      setEdited(null);
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
    <section id="stati" className="mt-6 scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
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
              setSource(null);
              setEdited(null);
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
                className={`w-full resize-none bg-transparent text-center text-2xl text-white placeholder:text-white/60 outline-none ${statusFontClass(font)}`}
              />
            </div>
            {/* Stil ekriti yo: chak bouton ekri nan pwòp font li */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {STATUS_FONTS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFont(f.key)}
                  disabled={busy}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-base transition ${f.className} ${
                    font === f.key ? "border-citron-400 bg-citron-400 text-zinc-950" : "border-zinc-700 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {f.label}
                </button>
              ))}
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
              {file && preview && (kind === "image" || kind === "video") ? (
                // Apèsi 9:16 ak stickers yo, jan fanatik yo ap wè l
                <span className="relative my-3 block w-36 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "9 / 16", containerType: "inline-size" }}>
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video
                      src={preview}
                      muted
                      playsInline
                      autoPlay
                      loop
                      className="h-full w-full object-cover"
                      style={{ objectPosition: `${edited?.focusX ?? 50}% ${edited?.focusY ?? 50}%` }}
                    />
                  )}
                  <StatusOverlayLayer items={edited?.items ?? []} />
                </span>
              ) : file ? (
                <span className="px-4 text-sm text-white">🎙️ {file.name}</span>
              ) : (
                <>
                  <span className="text-3xl">{KINDS.find((k) => k.key === kind)?.icon}</span>
                  <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi {kind === "image" ? "yon foto" : kind === "video" ? "yon ti videyo" : "yon odyo"}</span>
                  <span className="text-xs text-zinc-500">Maks 30 MB</span>
                </>
              )}
              <input
                type="file"
                accept={STATUS_MEDIA[kind].accept}
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {source && edited && !busy && (
              <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-citron-300 hover:text-citron-200">
                ✏️ Modifye ankò (stickers, lejand, santraj{kind === "video" ? ", longè" : ""})
              </button>
            )}
            {edited?.trimStart != null && edited.trimEnd != null && (
              <p className="text-xs text-zinc-400">
                ✂️ Videyo a ap jwe de {edited.trimStart.toFixed(1)} s rive {edited.trimEnd.toFixed(1)} s
              </p>
            )}
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
                    {KIND_LABEL[s.kind]} · {timeAgo(s.created_at)} · ❤️ {activity[s.id]?.likes ?? 0} · 💬 {activity[s.id]?.replies.length ?? 0}
                  </p>
                  {(activity[s.id]?.replies.length ?? 0) > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-citron-300">Wè repons yo</summary>
                      <ul className="mt-1 space-y-1">
                        {activity[s.id].replies.map((r) => (
                          <li key={r.id} className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                            <span className="font-semibold text-white">{r.name}:</span> {r.body} <span className="text-zinc-500">· {timeAgo(r.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
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
      {editing && source && (kind === "image" || kind === "video") && (
        <StatusEditor
          file={source}
          kind={kind}
          onCancel={() => {
            setEditing(false);
            if (!edited) setSource(null);
          }}
          onDone={(r) => {
            setEdited(r);
            setFile(r.file);
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}
