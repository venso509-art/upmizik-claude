"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { EditorIcon, ToolButton } from "@/components/media/EditorIcons";

// ===== Zouti pou KOUPE / SANTRE / VIRE yon foto anvan li monte (stil pwofesyonèl, plen ekran) =====
// - Kad koupe a gen 4 KWEN (ak 4 BÒ lè fòma a lib): rale yo ak dwèt ou pou koupe agoch, adwat, anlè, anba.
// - Glise ANDEDAN kad la pou deplase l; glise DEYÒ kad la pou deplase foto a.
// - Ba zoom nan rapwoche foto a; bouton "Vire" vire l 90°.
// - Fòma lib (prèv, elatriye): moun nan ka chwazi Lib / 1:1 / 4:5 / 16:9 / 9:16.
// Rezilta a: yon nouvo fichye JPEG nan bon fòma a.

export type CropOptions = {
  aspect: number | "original"; // lajè / wotè (1 = kare); "original" = fòma lib (moun nan chwazi)
  outputWidth: number; // lajè maksimòm fichye final la (piksèl)
  round?: boolean; // kad won (foto pwofil)
  title?: string;
};

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

const MIN = 56; // pi piti gwosè kad la (piksèl ekran)
const PAD = 24;

const FREE_RATIOS: { label: string; value: number | null }[] = [
  { label: "Lib", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

// Pi gwo rektang ki gen fòma "ratio" a, santre nan "box"
function fitRatio(box: Rect, ratio: number | null): Rect {
  if (!ratio) return { ...box };
  let w = box.w;
  let h = w / ratio;
  if (h > box.h) {
    h = box.h;
    w = h * ratio;
  }
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

export function ImageCropper({ file, options, onDone, onCancel }: { file: File; options: CropOptions; onDone: (f: File) => void; onCancel: () => void }) {
  const free = options.aspect === "original";
  const [ratio, setRatio] = useState<number | null>(free ? null : (options.aspect as number));
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = tout foto a parèt nan espas travay la
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // deplasman foto a (piksèl ekran)
  const [crop, setCrop] = useState<Rect | null>(null); // kad la (koòdone espas travay la)
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const observer = useRef<ResizeObserver | null>(null);
  const urls = useRef<string[]>([]);
  const gesture = useRef<{ kind: "image" | "frame" | Handle; px: number; py: number; crop: Rect; offset: { x: number; y: number } } | null>(null);

  const keepUrl = (u: string) => {
    urls.current.push(u);
    return u;
  };

  // ===== Jeyometri: kote foto a ye sou ekran an =====
  const base = img && stage.w ? Math.min((stage.w - PAD * 2) / img.naturalWidth, (stage.h - PAD * 2) / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dispW = img ? img.naturalWidth * scale : 0;
  const dispH = img ? img.naturalHeight * scale : 0;
  const imgRect: Rect = { x: stage.w / 2 - dispW / 2 + offset.x, y: stage.h / 2 - dispH / 2 + offset.y, w: dispW, h: dispH };
  // Kad la pa ka soti deyò foto a ni deyò espas travay la
  const bounds: Rect = (() => {
    const x1 = Math.max(imgRect.x, PAD / 2);
    const y1 = Math.max(imgRect.y, PAD / 2);
    const x2 = Math.min(imgRect.x + imgRect.w, stage.w - PAD / 2);
    const y2 = Math.min(imgRect.y + imgRect.h, stage.h - PAD / 2);
    return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
  })();

  const resetFrame = useCallback(
    (r: number | null) => {
      if (!img || !stage.w) return;
      const b = Math.min((stage.w - PAD * 2) / img.naturalWidth, (stage.h - PAD * 2) / img.naturalHeight);
      const w = img.naturalWidth * b;
      const h = img.naturalHeight * b;
      setCrop(fitRatio({ x: stage.w / 2 - w / 2, y: stage.h / 2 - h / 2, w, h }, r));
    },
    [img, stage.w, stage.h],
  );

  const loadOriginal = useCallback(async () => {
    setImg(await loadImage(keepUrl(URL.createObjectURL(file))));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCrop(null);
  }, [file]);

  useEffect(() => {
    void loadOriginal();
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, [loadOriginal]);

  // Gwosè espas travay la (pou tout bagay toujou rantre nan ekran an). Ref "callback":
  // espas la parèt yon ti moman apre (Portal), kidonk nou mezire l depi li sou ekran an.
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    observer.current = ro;
  }, []);
  useEffect(() => {
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      observer.current?.disconnect();
      document.documentElement.style.overflow = overflow;
    };
  }, []);

  // Kad la rekòmanse (tout foto a, nan fòma a) chak fwa foto a oswa gwosè ekran an chanje
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  useEffect(() => {
    if (!img || !stage.w) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    resetFrame(ratioRef.current);
  }, [img, stage.w, stage.h, resetFrame]);

  // Foto a dwe toujou kouvri kad la (lè w deplase l oswa w zoume)
  const clampOffset = useCallback(
    (o: { x: number; y: number }, z: number, c: Rect | null) => {
      if (!img || !c) return o;
      const s = base * z;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      const minX = c.x + c.w - (stage.w / 2 + w / 2);
      const maxX = c.x - (stage.w / 2 - w / 2);
      const minY = c.y + c.h - (stage.h / 2 + h / 2);
      const maxY = c.y - (stage.h / 2 - h / 2);
      return { x: Math.min(maxX, Math.max(minX, o.x)), y: Math.min(maxY, Math.max(minY, o.y)) };
    },
    [img, base, stage.w, stage.h],
  );

  function changeZoom(z: number) {
    if (!img) return;
    const nz = Math.min(5, Math.max(1, z));
    // Si foto a vin pi piti pase kad la (elwanye), kad la rapetise pou l rete sou foto a
    let c = crop;
    if (c) {
      const s = base * nz;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      const k = Math.min(1, w / c.w, h / c.h);
      if (k < 1) {
        const cw = c.w * k;
        const ch = c.h * k;
        c = { x: c.x + (c.w - cw) / 2, y: c.y + (c.h - ch) / 2, w: cw, h: ch };
        setCrop(c);
      }
    }
    setZoom(nz);
    setOffset((o) => clampOffset(o, nz, c));
  }

  // ===== Jès yo: kwen/bò = koupe; andedan kad la = deplase kad la; deyò = deplase foto a =====
  function start(kind: "image" | "frame" | Handle, e: React.PointerEvent) {
    if (!crop) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = { kind, px: e.clientX, py: e.clientY, crop: { ...crop }, offset: { ...offset } };
    setActive(true);
  }

  function move(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    const c = g.crop;

    if (g.kind === "image") {
      setOffset(clampOffset({ x: g.offset.x + dx, y: g.offset.y + dy }, zoom, crop));
      return;
    }
    if (g.kind === "frame") {
      setCrop({
        ...c,
        x: Math.min(bounds.x + bounds.w - c.w, Math.max(bounds.x, c.x + dx)),
        y: Math.min(bounds.y + bounds.h - c.h, Math.max(bounds.y, c.y + dy)),
      });
      return;
    }

    // Koupe: bò ki pa bouje yo rete fiks (lank), lòt yo swiv dwèt la
    const k = g.kind;
    let left = c.x;
    let top = c.y;
    let right = c.x + c.w;
    let bottom = c.y + c.h;
    if (k.includes("w")) left = Math.min(right - MIN, Math.max(bounds.x, c.x + dx));
    if (k.includes("e")) right = Math.max(left + MIN, Math.min(bounds.x + bounds.w, c.x + c.w + dx));
    if (k.includes("n")) top = Math.min(bottom - MIN, Math.max(bounds.y, c.y + dy));
    if (k.includes("s")) bottom = Math.max(top + MIN, Math.min(bounds.y + bounds.h, c.y + c.h + dy));

    if (ratio && k.length === 2) {
      // Fòma fiks: kwen yo grandi/rapetise kad la san chanje fòma a (kwen opoze a rete fiks)
      let w = right - left;
      let h = bottom - top;
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      // pa depase limit yo
      const maxW = k.includes("w") ? c.x + c.w - bounds.x : bounds.x + bounds.w - c.x;
      const maxH = k.includes("n") ? c.y + c.h - bounds.y : bounds.y + bounds.h - c.y;
      const s = Math.min(1, maxW / w, maxH / h);
      w *= s;
      h *= s;
      left = k.includes("w") ? c.x + c.w - w : c.x;
      top = k.includes("n") ? c.y + c.h - h : c.y;
      right = left + w;
      bottom = top + h;
    }
    setCrop({ x: left, y: top, w: right - left, h: bottom - top });
  }

  function end() {
    gesture.current = null;
    setActive(false);
  }

  function chooseRatio(r: number | null) {
    setRatio(r);
    if (!crop) return;
    // Nouvo fòma a santre sou kad aktyèl la, nan limit foto a
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    const next = fitRatio(bounds, r);
    if (r) {
      const w = Math.min(next.w, Math.max(crop.w, crop.h * r));
      const h = w / r;
      setCrop({
        w,
        h,
        x: Math.min(bounds.x + bounds.w - w, Math.max(bounds.x, cx - w / 2)),
        y: Math.min(bounds.y + bounds.h - h, Math.max(bounds.y, cy - h / 2)),
      });
    } else setCrop(next);
  }

  // Vire foto a 90° (nou kreye yon nouvo imaj vire)
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
    setCrop(null);
  }

  async function confirm() {
    if (!img || !crop) return;
    setBusy(true);
    const sx = (crop.x - imgRect.x) / scale;
    const sy = (crop.y - imgRect.y) / scale;
    const sw = crop.w / scale;
    const sh = crop.h / scale;
    const outW = Math.max(1, Math.round(Math.min(options.outputWidth, sw)));
    const outH = Math.max(1, Math.round(ratio ? outW / ratio : outW * (sh / sw)));
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

  const handles: Handle[] = ratio ? ["nw", "ne", "sw", "se"] : ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
  // Chak manch se yon gwo zòn 44px (pou dwèt la) santre sou kwen an oswa sou mitan bò a
  const pos: Record<Handle, string> = {
    nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    e: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-ew-resize",
    w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  };
  // Mak "L" blan an kole sou kwen kad la
  const bracket: Record<"nw" | "ne" | "sw" | "se", string> = {
    nw: "left-[calc(50%-3px)] top-[calc(50%-3px)] border-l-4 border-t-4",
    ne: "right-[calc(50%-3px)] top-[calc(50%-3px)] border-r-4 border-t-4",
    sw: "bottom-[calc(50%-3px)] left-[calc(50%-3px)] border-b-4 border-l-4",
    se: "bottom-[calc(50%-3px)] right-[calc(50%-3px)] border-b-4 border-r-4",
  };

  return (
    <Portal>
      <div className="force-dark fixed inset-0 z-[95] flex select-none flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Koupe foto a">
        {/* Ba anlè */}
        <div className="flex items-center justify-between px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button type="button" onClick={onCancel} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Anile">
            <EditorIcon name="close" />
          </button>
          <p className="text-sm font-semibold tracking-wide">{options.title ?? "Koupe foto a"}</p>
          <button
            type="button"
            onClick={confirm}
            disabled={!img || !crop || busy}
            className="flex items-center gap-1.5 rounded-full bg-citron-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-citron-300 disabled:opacity-50"
          >
            <EditorIcon name="check" className="h-4 w-4" strokeWidth={2.6} />
            {busy ? "…" : "Fini"}
          </button>
        </div>

        {/* Espas travay la */}
        <div
          ref={stageRef}
          className="relative flex-1 touch-none overflow-hidden"
          onPointerDown={(e) => start("image", e)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onWheel={(e) => changeZoom(zoom - e.deltaY * 0.0015)}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: imgRect.x, top: imgRect.y, width: dispW, height: dispH }}
            />
          )}

          {crop && (
            <div
              className={`absolute cursor-move ${options.round ? "rounded-full" : ""}`}
              style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)", outline: "1.5px solid rgba(255,255,255,0.9)" }}
              onPointerDown={(e) => start("frame", e)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              {/* Griy twa tyè (pandan w ap travay) */}
              <div className={`pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 overflow-hidden transition-opacity ${options.round ? "rounded-full" : ""} ${active ? "opacity-100" : "opacity-0"}`}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="border-[0.5px] border-white/45" />
                ))}
              </div>
              {/* Kwen ak bò yo: gwo zòn pou dwèt la, ti mak blan vizib */}
              {handles.map((h) => (
                <span
                  key={h}

                  aria-label={`Koupe ${h}`}
                  className={`absolute z-10 flex h-11 w-11 items-center justify-center ${pos[h]}`}
                  onPointerDown={(e) => start(h, e)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                >
                  {h.length === 2 ? (
                    <span className={`pointer-events-none absolute h-6 w-6 border-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${bracket[h as "nw" | "ne" | "sw" | "se"]}`} />
                  ) : (
                    <span className={`pointer-events-none rounded-full bg-white shadow ${h === "n" || h === "s" ? "h-1.5 w-7" : "h-7 w-1.5"}`} />
                  )}
                </span>
              ))}
            </div>
          )}

          {!img && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </span>
          )}
        </div>

        {/* Zouti yo anba */}
        <div className="border-t border-white/10 bg-zinc-950 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          {free && (
            <div className="mx-auto mb-3 flex max-w-md justify-center gap-1.5">
              {FREE_RATIOS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => chooseRatio(r.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${ratio === r.value ? "bg-citron-400 text-zinc-950" : "bg-white/10 text-white/80 hover:bg-white/15"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button type="button" onClick={() => changeZoom(zoom - 0.25)} className="text-zinc-400 hover:text-white" aria-label="Elwanye">
              <EditorIcon name="zoomOut" />
            </button>
            <input
              type="range"
              min={1}
              max={5}
              step={0.01}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-citron-400"
              aria-label="Rapwoche"
            />
            <button type="button" onClick={() => changeZoom(zoom + 0.25)} className="text-zinc-400 hover:text-white" aria-label="Rapwoche">
              <EditorIcon name="zoomIn" />
            </button>
            <span className="w-11 text-right text-xs tabular-nums text-zinc-400">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="mx-auto mt-3 flex max-w-md justify-center gap-6">
            <ToolButton icon="rotate" label="Vire" onClick={() => void rotate()} disabled={!img || busy} />
            <ToolButton
              icon="reset"
              label="Rekòmanse"
              onClick={() => {
                setRatio(free ? null : (options.aspect as number));
                void loadOriginal();
              }}
              disabled={busy}
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-zinc-500">Rale kwen yo pou koupe · glise kad la pou deplase l · ba a pou rapwoche</p>
        </div>
      </div>
    </Portal>
  );
}
