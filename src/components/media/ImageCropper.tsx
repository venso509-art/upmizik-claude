"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";

// ===== Zouti pou SANTRE / KOUPE yon foto anvan li monte =====
// Moun nan glise foto a ak dwèt li (oswa sourit la) epi l itilize ba a pou rapwoche.
// Rezilta a: yon nouvo fichye JPEG ki gen bon fòma a (kare, wonn, banyè, 9:16...).

export type CropOptions = {
  aspect: number | "original"; // lajè / wotè (1 = kare); "original" = menm fòma ak foto a
  outputWidth: number; // lajè fichye final la (piksèl)
  round?: boolean; // montre yon kad won (foto pwofil)
  title?: string;
};

export function ImageCropper({ file, options, onDone, onCancel }: { file: File; options: CropOptions; onDone: (f: File) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string>();
  const [zoom, setZoom] = useState(1); // 1 = foto a jis kouvri kad la
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // deplasman an piksèl ekran
  const [frameW, setFrameW] = useState(320);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    const fit = () => setFrameW(Math.min(window.innerWidth - 48, 380));
    fit();
    window.addEventListener("resize", fit);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      document.body.style.overflow = overflow;
    };
  }, []);

  const aspect = options.aspect === "original" ? (img ? img.naturalWidth / img.naturalHeight : 1) : options.aspect;
  // Kad la pa dwe twò wo sou telefòn
  const maxH = typeof window !== "undefined" ? window.innerHeight * 0.55 : 500;
  const fw = Math.min(frameW, maxH * aspect);
  const fh = fw / aspect;

  // Echèl ki fè foto a kouvri kad la nèt
  const base = img ? Math.max(fw / img.naturalWidth, fh / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dispW = img ? img.naturalWidth * scale : fw;
  const dispH = img ? img.naturalHeight * scale : fh;

  // Pa kite yon espas vid parèt nan kad la
  const clamp = (x: number, y: number) => ({
    x: Math.min((dispW - fw) / 2, Math.max(-(dispW - fw) / 2, x)),
    y: Math.min((dispH - fh) / 2, Math.max(-(dispH - fh) / 2, y)),
  });

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, fw, fh, img]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y));
  }
  function onWheel(e: React.WheelEvent) {
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)));
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    // Pati foto orijinal la ki nan kad la
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
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    onDone(new File([blob], name, { type: "image/jpeg" }));
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Santre foto a">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
          <p className="text-center font-bold text-white">{options.title ?? "✂️ Santre foto a"}</p>
          <p className="mt-1 text-center text-xs text-zinc-400">Glise foto a pou santre l · itilize ba a pou rapwoche</p>

          <div className="mt-4 flex justify-center">
            <div
              className="relative cursor-grab touch-none overflow-hidden bg-black active:cursor-grabbing"
              style={{ width: fw, height: fh, borderRadius: options.round ? "9999px" : "16px" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onWheel={onWheel}
            >
              {url && img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{ width: dispW, height: dispH, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
                />
              )}
              {/* Liy gid (règ twa tyè) */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="border border-white/20" />
                ))}
              </div>
              {!img && <span className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">Ap chaje…</span>}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-zinc-400" aria-hidden>
              ➖
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-citron-400"
              aria-label="Rapwoche"
            />
            <span className="text-zinc-400" aria-hidden>
              ➕
            </span>
          </div>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Anile
            </button>
            <button type="button" onClick={confirm} disabled={!img || busy} className="btn-primary flex-1 rounded-xl px-4 py-3 text-sm disabled:opacity-60">
              {busy ? "…" : "✓ Itilize foto sa a"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
