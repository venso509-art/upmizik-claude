"use client";

import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { DailyQuoteCard } from "@/components/quotes/DailyQuoteCard";
import { FORMAT_SIZE, type QuoteFormat, type QuoteTemplate } from "@/lib/dailyQuotes";

// Tès ekspò (devlopman sèlman): fè imaj PNG la menm jan ak espas atis la, epi montre rezilta a
export function ExportTest({ template, format, avatarUrl }: { template: QuoteTemplate; format: QuoteFormat; avatarUrl: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string>();
  const [info, setInfo] = useState("ap fè imaj la…");

  useEffect(() => {
    (async () => {
      const node = ref.current?.firstElementChild as HTMLElement | null;
      if (!node) return;
      await document.fonts.ready;
      await Promise.all(Array.from(node.querySelectorAll("img")).map((i) => i.decode().catch(() => undefined)));
      const t0 = performance.now();
      const { w, h } = FORMAT_SIZE[format];
      const blob = await toBlob(node, { width: w, height: h, pixelRatio: 2, cacheBust: true });
      if (!blob) return setInfo("echèk");
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await img.decode();
      setUrl(img.src);
      setInfo(`ok ${img.naturalWidth}x${img.naturalHeight} ${Math.round(blob.size / 1024)}KB ${Math.round(performance.now() - t0)}ms`);
    })().catch((e) => setInfo(`erè: ${e}`));
  }, [format]);

  return (
    <div>
      <p id="export-info" style={{ color: "#fff", fontSize: 14 }}>{info}</p>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: 1080 * 0.45, border: "1px solid #888" }} />
      )}
      <div ref={ref} style={{ position: "fixed", left: -20000, top: 0 }}>
        <DailyQuoteCard
          template={template}
          format={format}
          day="2026-10-28"
          quote={{ teks: "Pa janm kite moun di w rèv ou twò gwo.", kategori: "motivasyon", etiket: "Motivasyon", sous: "Pwovèb ayisyen" }}
          artist={{ name: "Sè Glorya", avatarUrl, genre: "Gospel" }}
        />
      </div>
    </div>
  );
}
