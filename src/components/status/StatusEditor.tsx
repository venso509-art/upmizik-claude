"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { OverlayItemView } from "@/components/status/StatusOverlayLayer";
import { LEGEND_COLORS, STATUS_ASPECT, STICKER_PACKS, type OverlayItem } from "@/lib/statuses";

export type EditedStatus = {
  file: File; // foto a deja koupe 9:16; videyo a jan l ye a
  items: OverlayItem[];
  focusX: number;
  focusY: number;
  trimStart: number | null;
  trimEnd: number | null;
};

const MAX_VIDEO_SECONDS = 60; // yon stati videyo pa ka depase 1 minit

// Editè stati a (foto oswa videyo): santre/koupe, stickers, lejand, epi koupe longè videyo a
export function StatusEditor({
  file,
  kind,
  onDone,
  onCancel,
}: {
  file: File;
  kind: "image" | "video";
  onDone: (r: EditedStatus) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState<string>();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frameW, setFrameW] = useState(300);
  // Foto: rapwoche + deplase. Videyo: ki pati ki rete nan kad la (focus %)
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  // Videyo: dire ak moso ki chwazi a
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  // Stickers ak lejand
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<"stickers" | "text" | "trim">("stickers");
  const [pack, setPack] = useState(0);
  const [legend, setLegend] = useState("");
  const [color, setColor] = useState(LEGEND_COLORS[0]);
  const [busy, setBusy] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drag = useRef<{ mode: "pan" | "item"; index?: number; x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    if (kind === "image") {
      const i = new Image();
      i.onload = () => setImg(i);
      i.src = u;
    }
    return () => URL.revokeObjectURL(u);
  }, [file, kind]);

  useEffect(() => {
    const fit = () => setFrameW(Math.min(window.innerWidth - 32, 340, window.innerHeight * 0.52 * STATUS_ASPECT));
    fit();
    window.addEventListener("resize", fit);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      document.body.style.overflow = overflow;
    };
  }, []);

  const fw = frameW;
  const fh = fw / STATUS_ASPECT;

  // ===== Foto: menm kalkil ak ImageCropper =====
  const base = img ? Math.max(fw / img.naturalWidth, fh / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dispW = img ? img.naturalWidth * scale : fw;
  const dispH = img ? img.naturalHeight * scale : fh;
  const clamp = (x: number, y: number) => ({
    x: Math.min((dispW - fw) / 2, Math.max(-(dispW - fw) / 2, x)),
    y: Math.min((dispH - fh) / 2, Math.max(-(dispH - fh) / 2, y)),
  });
  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, fw, img]);

  // ===== Videyo: jwe sèlman moso ki chwazi a, an bouk =====
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const onTime = () => {
      if (v.currentTime < trim.start || v.currentTime >= trim.end) v.currentTime = trim.start;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trim, duration]);

  // ===== Glise: foto/videyo a, oswa yon sticker =====
  function down(e: React.PointerEvent, index?: number) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (index !== undefined) {
      setSelected(index);
      drag.current = { mode: "item", index, x: e.clientX, y: e.clientY, ox: items[index].x, oy: items[index].y };
    } else {
      setSelected(null);
      drag.current = { mode: "pan", x: e.clientX, y: e.clientY, ox: kind === "image" ? offset.x : focus.x, oy: kind === "image" ? offset.y : focus.y };
    }
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.mode === "item" && d.index !== undefined) {
      const x = Math.min(100, Math.max(0, d.ox + (dx / fw) * 100));
      const y = Math.min(100, Math.max(0, d.oy + (dy / fh) * 100));
      setItems((list) => list.map((it, i) => (i === d.index ? { ...it, x, y } : it)));
    } else if (kind === "image") {
      setOffset(clamp(d.ox + dx, d.oy + dy));
    } else {
      // Videyo: glise adwat = montre pati agoch la (tankou yon foto)
      setFocus({ x: Math.min(100, Math.max(0, d.ox - (dx / fw) * 100)), y: Math.min(100, Math.max(0, d.oy - (dy / fh) * 100)) });
    }
  }
  const up = () => (drag.current = null);

  function addSticker(v: string) {
    setItems((list) => [...list, { t: "sticker", v, x: 50, y: 40 + (list.length % 5) * 6, s: 16 }]);
    setSelected(items.length);
  }
  function addLegend() {
    const v = legend.trim().slice(0, 80);
    if (!v) return;
    setItems((list) => [...list, { t: "text", v, x: 50, y: 78, s: 6.5, c: color }]);
    setSelected(items.length);
    setLegend("");
  }
  function resize(delta: number) {
    if (selected === null) return;
    setItems((list) =>
      list.map((it, i) => (i === selected ? { ...it, s: Math.min(it.t === "text" ? 14 : 40, Math.max(it.t === "text" ? 3.5 : 6, it.s + delta)) } : it)),
    );
  }
  function removeSelected() {
    if (selected === null) return;
    setItems((list) => list.filter((_, i) => i !== selected));
    setSelected(null);
  }

  async function done() {
    setBusy(true);
    let out = file;
    if (kind === "image" && img) {
      // Koupe foto a an 9:16 (1080 × 1920)
      const sx = (dispW / 2 - fw / 2 - offset.x) / scale;
      const sy = (dispH / 2 - fh / 2 - offset.y) / scale;
      const sw = fw / scale;
      const sh = fh / scale;
      const outW = Math.min(1080, Math.round(sw)) || 1080;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = Math.round(outW / STATUS_ASPECT);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
      if (blob) out = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    }
    setBusy(false);
    const trimmed = kind === "video" && duration > 0 && (trim.start > 0.2 || trim.end < duration - 0.2);
    onDone({
      file: out,
      items,
      focusX: Math.round(focus.x),
      focusY: Math.round(focus.y),
      trimStart: trimmed ? Math.round(trim.start * 10) / 10 : null,
      trimEnd: trimmed ? Math.round(trim.end * 10) / 10 : null,
    });
  }

  const tooLong = kind === "video" && trim.end - trim.start > MAX_VIDEO_SECONDS + 0.1;
  const sel = selected !== null ? items[selected] : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex flex-col items-center overflow-y-auto bg-black p-3" role="dialog" aria-modal="true" aria-label="Editè stati">
        <div className="flex w-full max-w-md items-center justify-between py-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white">
            ✕ Anile
          </button>
          <p className="text-sm font-bold text-white">✨ Prepare stati a</p>
          <button type="button" onClick={done} disabled={busy || tooLong || (kind === "image" && !img)} className="btn-primary rounded-full px-4 py-2 text-sm disabled:opacity-50">
            {busy ? "…" : "Kontinye ✓"}
          </button>
        </div>

        {/* KAD 9:16 la */}
        <div
          ref={frameRef}
          className="relative shrink-0 touch-none overflow-hidden rounded-2xl bg-zinc-900"
          style={{ width: fw, height: fh, containerType: "inline-size" }}
          onPointerDown={(e) => down(e)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(e) => kind === "image" && setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)))}
        >
          {kind === "image" && url && img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{ width: dispW, height: dispH, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            />
          )}
          {kind === "video" && url && (
            <video
              ref={videoRef}
              src={url}
              autoPlay
              muted
              playsInline
              loop
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration || 0;
                setDuration(d);
                setTrim({ start: 0, end: Math.min(d, MAX_VIDEO_SECONDS) });
              }}
            />
          )}
          {items.map((it, i) => (
            <span key={i} className="absolute inset-0" style={{ pointerEvents: "none" }}>
              <span className="pointer-events-auto cursor-move touch-none" onPointerDown={(e) => down(e, i)}>
                <OverlayItemView item={it} selected={selected === i} />
              </span>
            </span>
          ))}
        </div>

        {/* Zouti pou sticker/lejand ki chwazi a */}
        <div className="mt-2 flex h-10 items-center gap-2">
          {sel ? (
            <>
              <button type="button" onClick={() => resize(sel.t === "text" ? -1 : -3)} className="h-9 w-9 rounded-full bg-zinc-800 text-white" aria-label="Pi piti">
                ➖
              </button>
              <button type="button" onClick={() => resize(sel.t === "text" ? 1 : 3)} className="h-9 w-9 rounded-full bg-zinc-800 text-white" aria-label="Pi gwo">
                ➕
              </button>
              <button type="button" onClick={removeSelected} className="h-9 rounded-full bg-red-600/90 px-3 text-sm font-semibold text-white">
                🗑 Retire
              </button>
            </>
          ) : (
            <p className="text-xs text-zinc-500">
              {kind === "image" ? "Glise foto a pou santre l" : "Glise videyo a pou santre l"} · tape yon sticker pou chanje gwosè l
            </p>
          )}
        </div>
        {kind === "image" && (
          <div className="flex w-full max-w-xs items-center gap-3">
            <span className="text-zinc-400">➖</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-citron-400" aria-label="Rapwoche" />
            <span className="text-zinc-400">➕</span>
          </div>
        )}

        {/* Onglet zouti yo */}
        <div className="mt-3 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["stickers", "😀 Stickers"],
                ["text", "Aa Lejand"],
                ...(kind === "video" ? ([["trim", "✂️ Koupe"]] as const) : []),
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-xl px-2 py-2 text-sm font-semibold ${tab === key ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "stickers" && (
            <div className="mt-3">
              <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                {STICKER_PACKS.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPack(i)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${pack === i ? "bg-citron-400 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1">
                {STICKER_PACKS[pack].items.map((st) => (
                  <button key={st} type="button" onClick={() => addSticker(st)} className="rounded-xl py-2 text-3xl transition hover:bg-zinc-800 active:scale-90">
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "text" && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={legend}
                  onChange={(e) => setLegend(e.target.value.slice(0, 80))}
                  onKeyDown={(e) => e.key === "Enter" && addLegend()}
                  placeholder="Ekri yon lejand…"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:border-citron-400"
                />
                <button type="button" onClick={addLegend} className="btn-primary rounded-xl px-4 text-sm">
                  Ajoute
                </button>
              </div>
              <div className="flex gap-2">
                {LEGEND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full ring-2 ${color === c ? "ring-citron-400" : "ring-white/20"}`}
                    style={{ background: c }}
                    aria-label={`Koulè ${c}`}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "trim" && kind === "video" && (
            <div className="mt-3 space-y-3 text-sm">
              {duration > 0 ? (
                <>
                  <label className="block text-zinc-300">
                    Kòmanse: <span className="font-semibold text-white">{trim.start.toFixed(1)} s</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={trim.start}
                      onChange={(e) => setTrim((t) => ({ start: Math.min(Number(e.target.value), t.end - 1), end: t.end }))}
                      className="mt-1 w-full accent-citron-400"
                    />
                  </label>
                  <label className="block text-zinc-300">
                    Fini: <span className="font-semibold text-white">{trim.end.toFixed(1)} s</span>
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={trim.end}
                      onChange={(e) => setTrim((t) => ({ start: t.start, end: Math.max(Number(e.target.value), t.start + 1) }))}
                      className="mt-1 w-full accent-citron-400"
                    />
                  </label>
                  <p className={tooLong ? "text-red-300" : "text-zinc-400"}>
                    Dire stati a: <span className="font-semibold">{(trim.end - trim.start).toFixed(1)} s</span>
                    {tooLong ? ` · maksimòm ${MAX_VIDEO_SECONDS} s` : ""}
                  </p>
                </>
              ) : (
                <p className="text-zinc-400">Ap chaje videyo a…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
