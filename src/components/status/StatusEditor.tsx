"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { EditorIcon, ToolButton } from "@/components/media/EditorIcons";
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

type Tool = "frame" | "stickers" | "text" | "trim";

const MAX_VIDEO_SECONDS = 60; // yon stati videyo pa ka depase 1 minit
const THUMBS = 8; // ti imaj nan timeline videyo a

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}.${Math.floor((t % 1) * 10)}`;

// Editè stati a (foto oswa videyo), tankou CapCut/Instagram: santre, stickers, lejand, koupe videyo a
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
  const [stage, setStage] = useState({ w: 320, h: 560 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState({ x: 50, y: 50 });
  const [duration, setDuration] = useState(0);
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool | null>(kind === "video" ? "trim" : "stickers");
  const [pack, setPack] = useState(0);
  const [legend, setLegend] = useState("");
  const [color, setColor] = useState(LEGEND_COLORS[0]);
  const [legendBg, setLegendBg] = useState(true);
  const [busy, setBusy] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drag = useRef<{ mode: "pan" | "item"; index?: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const trimDrag = useRef<"start" | "end" | null>(null);

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
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      ro.disconnect();
      document.body.style.overflow = overflow;
    };
  }, []);

  // Kad 9:16 la rantre nan espas la
  const fw = Math.max(120, Math.min(stage.w - 24, (stage.h - 16) * STATUS_ASPECT));
  const fh = fw / STATUS_ASPECT;

  // ===== Foto: rapwoche + deplase =====
  const base = img ? Math.max(fw / img.naturalWidth, fh / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dispW = img ? img.naturalWidth * scale : fw;
  const dispH = img ? img.naturalHeight * scale : fh;
  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min((dispW - fw) / 2, Math.max(-(dispW - fw) / 2, x)),
      y: Math.min((dispH - fh) / 2, Math.max(-(dispH - fh) / 2, y)),
    }),
    [dispW, dispH, fw, fh],
  );
  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
  }, [clamp]);

  // ===== Videyo: jwe sèlman moso ki chwazi a, an bouk =====
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const onTime = () => {
      if (v.currentTime < trim.start - 0.05 || v.currentTime >= trim.end) v.currentTime = trim.start;
      setPlayhead(v.currentTime);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [trim, duration]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [playing]);

  // Ti imaj timeline yo: nou pran 8 foto nan videyo a
  useEffect(() => {
    if (kind !== "video" || !url || !duration) return;
    let cancelled = false;
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const canvas = document.createElement("canvas");
    canvas.width = 72;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const seek = (t: number) =>
      new Promise<void>((r) => {
        v.onseeked = () => r();
        v.currentTime = t;
      });
    void (async () => {
      await new Promise<void>((r) => (v.readyState >= 1 ? r() : (v.onloadedmetadata = () => r())));
      const out: string[] = [];
      for (let i = 0; i < THUMBS && !cancelled; i++) {
        await seek(((i + 0.5) / THUMBS) * duration);
        const s = Math.max(canvas.width / v.videoWidth, canvas.height / v.videoHeight);
        const w = v.videoWidth * s;
        const h = v.videoHeight * s;
        ctx.drawImage(v, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        out.push(canvas.toDataURL("image/jpeg", 0.6));
        if (!cancelled) setThumbs([...out]);
      }
    })();
    return () => {
      cancelled = true;
      v.removeAttribute("src");
      v.load();
    };
  }, [kind, url, duration]);

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
      setFocus({ x: Math.min(100, Math.max(0, d.ox - (dx / fw) * 100)), y: Math.min(100, Math.max(0, d.oy - (dy / fh) * 100)) });
    }
  }
  const up = () => (drag.current = null);

  // ===== Timeline: glise manch yo =====
  function trimMove(e: React.PointerEvent) {
    const which = trimDrag.current;
    const el = timelineRef.current;
    if (!which || !el || !duration) return;
    const r = el.getBoundingClientRect();
    const t = Math.min(duration, Math.max(0, ((e.clientX - r.left) / r.width) * duration));
    setTrim((cur) => {
      if (which === "start") return { start: Math.min(t, cur.end - 1, cur.end), end: cur.end };
      return { start: cur.start, end: Math.max(t, cur.start + 1) };
    });
    if (videoRef.current) videoRef.current.currentTime = which === "start" ? t : Math.max(0, t - 0.5);
  }

  function addSticker(v: string) {
    setItems((list) => [...list, { t: "sticker", v, x: 50, y: 42 + (list.length % 5) * 5, s: 18 }]);
    setSelected(items.length);
  }
  function addLegend() {
    const v = legend.trim().slice(0, 80);
    if (!v) return;
    setItems((list) => [...list, { t: "text", v, x: 50, y: 76, s: 6.5, c: color, b: legendBg }]);
    setSelected(items.length);
    setLegend("");
  }
  function resize(delta: number) {
    if (selected === null) return;
    setItems((list) =>
      list.map((it, i) => (i === selected ? { ...it, s: Math.min(it.t === "text" ? 14 : 42, Math.max(it.t === "text" ? 3.5 : 6, it.s + delta)) } : it)),
    );
  }
  function updateSelected(patch: Partial<OverlayItem>) {
    if (selected === null) return;
    setItems((list) => list.map((it, i) => (i === selected ? { ...it, ...patch } : it)));
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
  const pct = (t: number) => (duration ? (t / duration) * 100 : 0);

  return (
    <Portal>
      <div className="force-dark fixed inset-0 z-[95] flex select-none flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Editè stati">
        {/* Ba anlè */}
        <div className="flex items-center justify-between px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button type="button" onClick={onCancel} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Anile">
            <EditorIcon name="close" />
          </button>
          <p className="text-sm font-semibold tracking-wide">Edite stati a</p>
          <button
            type="button"
            onClick={done}
            disabled={busy || tooLong || (kind === "image" && !img)}
            className="flex items-center gap-1.5 rounded-full bg-citron-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-citron-300 disabled:opacity-50"
          >
            <EditorIcon name="check" className="h-4 w-4" strokeWidth={2.6} />
            {busy ? "…" : "Fini"}
          </button>
        </div>

        {/* Espas travay la ak kad 9:16 la */}
        <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center">
          <div
            className="relative touch-none overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10"
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
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
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
              <span key={i} className="pointer-events-none absolute inset-0">
                <span className="pointer-events-auto cursor-move touch-none" onPointerDown={(e) => down(e, i)}>
                  <OverlayItemView item={it} selected={selected === i} />
                </span>
              </span>
            ))}
          </div>

          {/* Ba flotan pou sticker/lejand ki chwazi a */}
          {sel && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-zinc-900/95 p-1 shadow-xl backdrop-blur">
              <button type="button" onClick={() => resize(sel.t === "text" ? -1 : -3)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Pi piti">
                <EditorIcon name="minus" />
              </button>
              <button type="button" onClick={() => resize(sel.t === "text" ? 1 : 3)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Pi gwo">
                <EditorIcon name="plus" />
              </button>
              {sel.t === "text" && (
                <button
                  type="button"
                  onClick={() => updateSelected({ b: sel.b === false })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${sel.b === false ? "hover:bg-white/10" : "bg-white/15"}`}
                  aria-label="Fon dèyè tèks la"
                >
                  <EditorIcon name="background" />
                </button>
              )}
              <span className="mx-1 h-5 w-px bg-white/15" />
              <button type="button" onClick={removeSelected} className="flex h-9 w-9 items-center justify-center rounded-full text-red-400 hover:bg-red-500/15" aria-label="Retire">
                <EditorIcon name="trash" />
              </button>
            </div>
          )}
        </div>

        {/* Panno zouti ki louvri a */}
        <div className="border-t border-white/10 bg-zinc-950">
          {tool === "frame" && (
            <div className="mx-auto max-w-md px-4 pt-3">
              {kind === "image" ? (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="text-zinc-400 hover:text-white" aria-label="Elwanye">
                    <EditorIcon name="zoomOut" />
                  </button>
                  <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-1 flex-1 accent-citron-400" aria-label="Rapwoche" />
                  <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="text-zinc-400 hover:text-white" aria-label="Rapwoche">
                    <EditorIcon name="zoomIn" />
                  </button>
                  <span className="w-11 text-right text-xs tabular-nums text-zinc-400">{Math.round(zoom * 100)}%</span>
                </div>
              ) : null}
              <p className="py-2 text-center text-xs text-zinc-400">Glise {kind === "image" ? "foto" : "videyo"} a nan kad la pou santre l</p>
            </div>
          )}

          {tool === "stickers" && (
            <div className="mx-auto max-w-md px-3 pt-3">
              <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
                {STICKER_PACKS.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPack(i)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${pack === i ? "bg-white text-zinc-950" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
              <div className="grid max-h-32 grid-cols-6 gap-1 overflow-y-auto">
                {STICKER_PACKS[pack].items.map((st) => (
                  <button key={st} type="button" onClick={() => addSticker(st)} className="rounded-xl py-1.5 text-[28px] transition hover:bg-white/10 active:scale-90">
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === "text" && (
            <div className="mx-auto max-w-md space-y-3 px-4 pt-3">
              <div className="flex gap-2">
                <input
                  value={legend}
                  onChange={(e) => setLegend(e.target.value.slice(0, 80))}
                  onKeyDown={(e) => e.key === "Enter" && addLegend()}
                  placeholder="Ekri yon lejand…"
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-citron-400"
                />
                <button type="button" onClick={addLegend} disabled={!legend.trim()} className="rounded-full bg-citron-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-40">
                  Ajoute
                </button>
              </div>
              <div className="flex items-center gap-2">
                {LEGEND_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      if (sel?.t === "text") updateSelected({ c });
                    }}
                    className={`h-7 w-7 rounded-full ring-2 transition ${color === c ? "scale-110 ring-white" : "ring-white/20"}`}
                    style={{ background: c }}
                    aria-label={`Koulè ${c}`}
                  />
                ))}
                <span className="mx-1 h-5 w-px bg-white/15" />
                <button
                  type="button"
                  onClick={() => {
                    setLegendBg((b) => !b);
                    if (sel?.t === "text") updateSelected({ b: !legendBg });
                  }}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${legendBg ? "bg-white/15 text-white" : "text-zinc-400"}`}
                >
                  <EditorIcon name="background" className="h-4 w-4" /> Fon
                </button>
              </div>
            </div>
          )}

          {tool === "trim" && kind === "video" && (
            <div className="mx-auto max-w-md px-4 pt-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
                  aria-label={playing ? "Poz" : "Jwe"}
                >
                  <EditorIcon name={playing ? "pause" : "play"} className="h-4 w-4" />
                </button>
                <span className="tabular-nums text-zinc-300">
                  {fmt(trim.start)} – {fmt(trim.end)}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${tooLong ? "bg-red-500/20 text-red-300" : "bg-citron-400/15 text-citron-300"}`}>
                  {(trim.end - trim.start).toFixed(1)} s{tooLong ? ` · maks ${MAX_VIDEO_SECONDS} s` : ""}
                </span>
              </div>
              {/* Timeline: ti imaj yo + 2 manch pou chwazi moso a */}
              <div
                ref={timelineRef}
                className="relative h-14 touch-none overflow-hidden rounded-lg bg-zinc-800"
                onPointerMove={trimMove}
                onPointerUp={() => (trimDrag.current = null)}
                onPointerCancel={() => (trimDrag.current = null)}
              >
                <div className="absolute inset-0 flex">
                  {Array.from({ length: THUMBS }).map((_, i) =>
                    thumbs[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={thumbs[i]} alt="" className="h-full flex-1 object-cover" draggable={false} />
                    ) : (
                      <span key={i} className="h-full flex-1 animate-pulse border-r border-black/30 bg-zinc-700" />
                    ),
                  )}
                </div>
                {/* Pati ki pa chwazi yo fonse */}
                <span className="absolute inset-y-0 left-0 bg-black/65" style={{ width: `${pct(trim.start)}%` }} />
                <span className="absolute inset-y-0 right-0 bg-black/65" style={{ width: `${100 - pct(trim.end)}%` }} />
                {/* Kad moso a */}
                <span
                  className="pointer-events-none absolute inset-y-0 border-y-[3px] border-citron-400"
                  style={{ left: `${pct(trim.start)}%`, width: `${pct(trim.end) - pct(trim.start)}%` }}
                />
                {/* Liy lekti a */}
                {duration > 0 && <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pct(playhead)}%` }} />}
                {(["start", "end"] as const).map((h) => (
                  <span
                    key={h}
                    onPointerDown={(e) => {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      trimDrag.current = h;
                      setPlaying(false);
                    }}
                    onPointerMove={trimMove}
                    onPointerUp={() => {
                      trimDrag.current = null;
                      setPlaying(true);
                    }}
                    className={`absolute inset-y-0 flex w-4 cursor-ew-resize touch-none items-center justify-center bg-citron-400 ${h === "start" ? "rounded-l-md" : "-translate-x-full rounded-r-md"}`}
                    style={{ left: `${pct(h === "start" ? trim.start : trim.end)}%` }}
                    role="slider"
                    aria-label={h === "start" ? "Kòmansman" : "Fen"}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(h === "start" ? trim.start : trim.end)}
                  >
                    <span className="h-5 w-0.5 rounded bg-zinc-950/70" />
                  </span>
                ))}
              </div>
              <p className="py-2 text-center text-[11px] text-zinc-500">Glise manch jòn yo pou chwazi moso videyo a</p>
            </div>
          )}

          {/* Dock zouti yo */}
          <div className="mx-auto flex max-w-md justify-around px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
            <ToolButton icon="crop" label="Santre" active={tool === "frame"} onClick={() => setTool(tool === "frame" ? null : "frame")} />
            <ToolButton icon="sticker" label="Stickers" active={tool === "stickers"} onClick={() => setTool(tool === "stickers" ? null : "stickers")} />
            <ToolButton icon="text" label="Tèks" active={tool === "text"} onClick={() => setTool(tool === "text" ? null : "text")} />
            {kind === "video" && <ToolButton icon="scissors" label="Koupe" active={tool === "trim"} onClick={() => setTool(tool === "trim" ? null : "trim")} />}
          </div>
        </div>
      </div>
    </Portal>
  );
}
