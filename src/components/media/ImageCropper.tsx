"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { EditorIcon, ToolButton } from "@/components/media/EditorIcons";

// ===== Zouti pou SANTRE / KOUPE / VIRE yon foto anvan li monte (stil pwofesyonèl, plen ekran) =====
// Moun nan glise foto a, rapwoche l ak ba a (oswa woulèt sourit la), epi l ka vire l 90°.
// Pati ki deyò kad la parèt fonse, pou l wè egzakteman sa k ap rete.
// Rezilta a: yon nouvo fichye JPEG nan bon fòma a (kare, wonn, banyè, 9:16...).

export type CropOptions = {
  aspect: number | "original"; // lajè / wotè (1 = kare); "original" = menm fòma ak foto a
  outputWidth: number; // lajè fichye final la (piksèl)
  round?: boolean; // kad won (foto pwofil)
  title?: string;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

export function ImageCropper({ file, options, onDone, onCancel }: { file: File; options: CropOptions; onDone: (f: File) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = foto a jis kouvri kad la
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [stage, setStage] = useState({ w: 360, h: 480 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const keepUrl = (u: string) => {
    urls.current.push(u);
    return u;
  };

  const loadOriginal = useCallback(async () => {
    setImg(await loadImage(keepUrl(URL.createObjectURL(file))));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [file]);

  useEffect(() => {
    void loadOriginal();
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, [loadOriginal]);

  // Gwosè espas travay la (pou kad la toujou rantre nan ekran an)
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

  const aspect = options.aspect === "original" ? (img ? img.naturalWidth / img.naturalHeight : 1) : options.aspect;
  const pad = 28;
  const fw = Math.max(80, Math.min(stage.w - pad * 2, (stage.h - pad * 2) * aspect));
  const fh = fw / aspect;

  // Echèl ki fè foto a kouvri kad la nèt
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

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y));
  }
  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  // Vire foto a 90° (nou kreye yon nouvo imaj vire, konsa rès kalkil yo pa chanje)
  async function rotate() {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = img.naturalHeight;
    c.height = img.naturalWidth;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.95));
    if (!blob) return;
    setImg(await loadImage(keepUrl(URL.createObjectURL(blob))));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    const sx = (dispW / 2 - fw / 2 - offset.x) / scale;
    const sy = (dispH / 2 - fh / 2 - offset.y) / scale;
    const sw = fw / scale;
    const sh = fh / scale;
    const outW = Math.min(options.outputWidth, Math.round(sw)) || options.outputWidth;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    setBusy(false);
    if (!blob) return onCancel();
    onDone(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
  }

  const corner = "pointer-events-none absolute h-5 w-5 border-white";

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex select-none flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Santre foto a">
        {/* Ba anlè */}
        <div className="flex items-center justify-between px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button type="button" onClick={onCancel} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Anile">
            <EditorIcon name="close" />
          </button>
          <p className="text-sm font-semibold tracking-wide">{options.title ?? "Santre foto a"}</p>
          <button
            type="button"
            onClick={confirm}
            disabled={!img || busy}
            className="flex items-center gap-1.5 rounded-full bg-citron-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-citron-300 disabled:opacity-50"
          >
            <EditorIcon name="check" className="h-4 w-4" strokeWidth={2.6} />
            {busy ? "…" : "Fini"}
          </button>
        </div>

        {/* Espas travay la */}
        <div
          ref={stageRef}
          className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)))}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{ width: dispW, height: dispH, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            />
          )}

          {/* Kad la: deyò a fonse, kwen yo make, griy twa tyè pandan w ap glise */}
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${options.round ? "rounded-full" : "rounded-sm"}`}
            style={{ width: fw, height: fh, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)", outline: "1px solid rgba(255,255,255,0.75)" }}
          >
            <div className={`absolute inset-0 grid grid-cols-3 grid-rows-3 overflow-hidden transition-opacity ${options.round ? "rounded-full" : ""} ${dragging ? "opacity-100" : "opacity-0"}`}>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="border-[0.5px] border-white/40" />
              ))}
            </div>
            {!options.round && (
              <>
                <span className={`${corner} -left-[3px] -top-[3px] border-l-[3px] border-t-[3px]`} />
                <span className={`${corner} -right-[3px] -top-[3px] border-r-[3px] border-t-[3px]`} />
                <span className={`${corner} -bottom-[3px] -left-[3px] border-b-[3px] border-l-[3px]`} />
                <span className={`${corner} -bottom-[3px] -right-[3px] border-b-[3px] border-r-[3px]`} />
              </>
            )}
          </div>

          {!img && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </span>
          )}
        </div>

        {/* Zouti yo anba */}
        <div className="border-t border-white/10 bg-zinc-950 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="text-zinc-400 hover:text-white" aria-label="Elwanye">
              <EditorIcon name="zoomOut" />
            </button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-citron-400"
              aria-label="Rapwoche"
            />
            <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="text-zinc-400 hover:text-white" aria-label="Rapwoche">
              <EditorIcon name="zoomIn" />
            </button>
            <span className="w-11 text-right text-xs tabular-nums text-zinc-400">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="mx-auto mt-3 flex max-w-md justify-center gap-6">
            <ToolButton icon="rotate" label="Vire" onClick={() => void rotate()} disabled={!img || busy} />
            <ToolButton icon="reset" label="Rekòmanse" onClick={() => void loadOriginal()} disabled={busy} />
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-500">Glise foto a pou santre l · rapwoche ak ba a</p>
        </div>
      </div>
    </Portal>
  );
}
