"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/sosyal/actions";
import { DailyQuoteCard } from "@/components/quotes/DailyQuoteCard";
import { FORMAT_SIZE, TEMPLATE_NAMES, categoryLabel, type DailyQuote, type QuoteFormat, type QuoteTemplate } from "@/lib/dailyQuotes";

// ===== "Mesaj jounen an" nan espas atis la: aperçu + telechaje (Feed/Story) + pataje + pòs + stati =====

type Card = { day: string; template: QuoteTemplate; quote: DailyQuote };
type Artist = { id: string; name: string; avatarUrl: string | null; genre: string | null };

const TEMPLATE_DOT: Record<QuoteTemplate, string> = { 1: "#FFD700", 2: "#1C7AD8", 3: "#B0102E", 4: "#0A5C36", 5: "#E8338A", 6: "#111318" };

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "atis";

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Ikòn yo (SVG, menm epesè liy)
const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden>
    {d}
  </svg>
);
const Icon = {
  download: () => svg(<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />),
  share: () => svg(<path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />),
  copy: () =>
    svg(
      <>
        <rect x="9" y="9" width="11" height="11" rx="2.5" />
        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
      </>,
    ),
  check: () => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  megaphone: () =>
    svg(
      <>
        <path d="m3 11 15-6v14L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>,
    ),
  status: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="9" strokeDasharray="4 3" />
        <circle cx="12" cy="12" r="4" />
      </>,
    ),
  star: () => svg(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />),
};

const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] animate-spin" aria-hidden>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Reflè limyè ki pase sou bouton an lè w pase sourit la
const Shine = () => (
  <span
    className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/40 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100"
    aria-hidden
  />
);

// Yon bouton aksyon: wonn ikòn ak degrade + non + ti esplikasyon
function ActionTile({
  label,
  sub,
  color,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl bg-white/[0.04] px-2 py-4 text-center ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:ring-white/20 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${color} text-white shadow-lg shadow-black/30 transition duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
        {busy ? <Spinner /> : icon}
      </span>
      <span className="text-sm font-black text-white">{label}</span>
      <span className="text-[11px] leading-tight text-zinc-400">{sub}</span>
    </button>
  );
}

export function DailyQuoteStudio({ card, artist, pro }: { card: Card | null; artist: Artist; pro: boolean }) {
  const [template, setTemplate] = useState<QuoteTemplate>(card?.template ?? 1);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const previewBox = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const nodes = useRef<Partial<Record<QuoteFormat, HTMLDivElement | null>>>({});

  // Aperçu a: kat 1080 px la rapetise pou l antre nan lajè ekran an
  useEffect(() => {
    const el = previewBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1080));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // Fè imaj la (apre font yo ak foto yo fin chaje). hd = 2 fwa pi gwo (2160 px lajè), pou yon imaj byen fen
  const render = useCallback(async (format: QuoteFormat, type: "image/png" | "image/jpeg" = "image/png", hd = false) => {
    const node = nodes.current[format]?.firstElementChild as HTMLElement | null | undefined;
    if (!node) throw new Error("Kat la poko pare.");
    await document.fonts.ready;
    await Promise.all(Array.from(node.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
    const { w, h } = FORMAT_SIZE[format];
    const blob = await toBlob(node, { width: w, height: h, pixelRatio: hd ? 2 : 1, cacheBust: true, type, quality: 0.92 });
    if (!blob) throw new Error("Imaj la pa fèt. Eseye ankò.");
    return blob;
  }, []);

  if (!card) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
        <p className="text-4xl">✨</p>
        <p className="mt-2 font-bold text-white">Mesaj jounen an ap vini byento</p>
        <p className="mt-1 text-sm text-zinc-400">Chak jou w ap jwenn yon bèl kat sitasyon ak foto w, pou w pataje l ak fanatik ou yo.</p>
      </section>
    );
  }

  const fileName = (format: QuoteFormat, ext = "png") => `upmizik-mesaj-jounen-an-${slug(artist.name)}-${card.day}-${format}.${ext}`;

  async function run(key: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      flash(false, e instanceof Error ? e.message : "Sa pa mache. Eseye ankò.");
    } finally {
      setBusy(null);
    }
  }

  const download = (format: QuoteFormat) =>
    run(`dl-${format}`, async () => {
      downloadBlob(await render(format, "image/png", true), fileName(format));
      flash(true, `✓ Imaj HD ${FORMAT_SIZE[format].label} la telechaje (${FORMAT_SIZE[format].w * 2}×${FORMAT_SIZE[format].h * 2}).`);
    });

  const share = () =>
    run("share", async () => {
      const blob = await render("feed", "image/png", true);
      const file = new File([blob], fileName("feed"), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch {
          // moun nan anile
        }
        return;
      }
      downloadBlob(blob, file.name);
      flash(true, "✓ Imaj la telechaje: mete l sou Instagram, TikTok oswa WhatsApp ou.");
    });

  const copy = () =>
    run("copy", async () => {
      const png = render("feed", "image/png", true);
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          // Safari mande pou nou bay "promès" imaj la touswit (pandan klik la)
          await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          flash(true, "✓ Imaj HD la kopye: kole l (Ctrl+V) kote w vle.");
          return;
        } catch {
          // navigatè a pa kite kopye imaj: nou telechaje l pito
        }
      }
      downloadBlob(await png, fileName("feed"));
      flash(true, "✓ Telefòn ou pa kite kopye imaj: nou telechaje l pou ou.");
    });

  // Pòs nan UpMizik Sosyal: imaj kare a (pòs yo se kare) + sitasyon an kòm tèks
  const post = () =>
    run("post", async () => {
      const blob = await render("square", "image/jpeg");
      const supabase = createClient();
      const path = `${artist.id}/${Date.now()}-pawol.jpg`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error(`Imaj la pa monte: ${upErr.message}`);
      const res = await createPost({ content: `✨ Mesaj jounen an\n\n${card.quote.teks}${card.quote.sous ? ` — ${card.quote.sous}` : ""}`, imagePath: path, linkUrl: null });
      if (res.error) {
        await supabase.storage.from("post-images").remove([path]);
        throw new Error(res.error);
      }
      flash(true, "✓ Pòs la pibliye nan UpMizik Sosyal!");
    });

  // Stati 24 è (atis Pro): imaj Story a (9:16)
  const status = () =>
    run("status", async () => {
      const blob = await render("story", "image/jpeg");
      const supabase = createClient();
      const path = `${artist.id}/${Date.now()}-pawol.jpg`;
      const { error: upErr } = await supabase.storage.from("statuses").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error(`Imaj la pa monte: ${upErr.message}`);
      const { error } = await supabase.from("artist_statuses").insert({ artist_id: artist.id, kind: "image", media_path: path, body: null });
      if (error) {
        await supabase.storage.from("statuses").remove([path]);
        throw new Error(error.message);
      }
      flash(true, "✓ Stati a pibliye! Li parèt nan wonn ou pou 24 è.");
    });

  const props = { template, quote: card.quote, artist: { name: artist.name, avatarUrl: artist.avatarUrl, genre: artist.genre }, day: card.day };
  const tile = "group relative overflow-hidden rounded-2xl p-3 text-left sm:p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60";

  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl border border-citron-400/30 bg-gradient-to-br from-[#0A5C36]/30 via-zinc-900/70 to-zinc-900/60 p-5 sm:p-6">
      <span className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-citron-400/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-citron-300">✨ Mesaj jounen an</p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Kat ou pou jodi a</h2>
          <p className="mt-1 max-w-md text-sm text-zinc-400">Yon nouvo sitasyon chak jou ak foto w. Pataje l pou fanatik ou yo wè w chak jou.</p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10">{categoryLabel(card.quote.kategori)}</span>
      </div>

      <div className="relative mt-5 grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        {/* Aperçu */}
        <div ref={previewBox} className="w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/40" style={{ height: 1350 * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1080, height: 1350 }}>
            <DailyQuoteCard {...props} format="feed" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* 6 desen yo */}
          <div>
            <p className="text-xs font-semibold text-zinc-400">Chwazi desen an</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {([1, 2, 3, 4, 5, 6] as QuoteTemplate[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemplate(t)}
                  aria-pressed={template === t}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                    template === t ? "bg-white/10 text-white ring-2 ring-citron-400" : "bg-white/[0.03] text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/30" style={{ background: TEMPLATE_DOT[t] }} aria-hidden />
                  <span className="min-w-0 truncate">{TEMPLATE_NAMES[t]}</span>
                  {t === card.template && <span className="ml-auto text-[10px] text-citron-300" title="Desen jou a">★</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Telechaje: 2 gwo bouton (Feed / Story) */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => download("feed")} disabled={!!busy} className={`${tile} bg-gradient-to-br from-[#FFE34D] to-[#E6C000] text-[#0B132B] shadow-lg shadow-[#FFD700]/20`}>
              <Shine />
              <span className="relative flex items-center gap-2.5 sm:gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B132B] text-[#FFD700] transition group-hover:scale-110 sm:h-11 sm:w-11">
                  {busy === "dl-feed" ? <Spinner /> : <Icon.download />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-tight sm:text-[15px]">Telechaje imaj</span>
                  <span className="block text-[11px] font-bold opacity-70">Feed · HD</span>
                </span>
                <span className="ml-auto hidden h-9 w-7 shrink-0 rounded-md border-2 border-[#0B132B]/40 sm:block" aria-hidden />
              </span>
            </button>
            <button type="button" onClick={() => download("story")} disabled={!!busy} className={`${tile} bg-gradient-to-br from-[#16224A] to-[#0B132B] text-white ring-1 ring-[#FFD700]/40`}>
              <Shine />
              <span className="relative flex items-center gap-2.5 sm:gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-[#0B132B] transition group-hover:scale-110 sm:h-11 sm:w-11">
                  {busy === "dl-story" ? <Spinner /> : <Icon.download />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-tight sm:text-[15px]">Telechaje imaj</span>
                  <span className="block text-[11px] font-bold text-white/60">Story · HD</span>
                </span>
                <span className="ml-auto hidden h-10 w-6 shrink-0 rounded-md border-2 border-[#FFD700]/50 sm:block" aria-hidden />
              </span>
            </button>
          </div>

          {/* Pataje, kopye, pòs, stati */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ActionTile label="Pataje imaj" sub="Insta · TikTok · WhatsApp" color="from-sky-400 to-blue-600" busy={busy === "share"} disabled={!!busy} onClick={share} icon={<Icon.share />} />
            <ActionTile label={copied ? "Kopye!" : "Kopye imaj"} sub="Imaj HD · kole l" color="from-zinc-300 to-zinc-500" busy={false} disabled={!!busy} onClick={copy} icon={copied ? <Icon.check /> : <Icon.copy />} />
            <ActionTile label="Fè yon pòs" sub="UpMizik Sosyal" color="from-emerald-400 to-[#0A5C36]" busy={busy === "post"} disabled={!!busy} onClick={post} icon={<Icon.megaphone />} />
            {pro ? (
              <ActionTile label="Voye sou stati" sub="24 è · Story" color="from-fuchsia-500 via-[#E6C000] to-emerald-500" busy={busy === "status"} disabled={!!busy} onClick={status} icon={<Icon.status />} />
            ) : (
              <Link
                href="/pwofil"
                className="group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-dashed border-[#FFD700]/60 bg-[#FFD700]/[0.06] px-2 py-4 text-center transition duration-300 hover:-translate-y-0.5 hover:bg-[#FFD700]/10"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE34D] to-[#E6C000] text-[#0B132B] shadow-lg shadow-[#FFD700]/30 transition duration-300 group-hover:rotate-12 group-hover:scale-110">
                  <Icon.star />
                </span>
                <span className="text-sm font-black text-[#FFD700]">Stati: vin Pro</span>
                <span className="text-[11px] leading-tight text-zinc-400">Debloke stati 24 è</span>
              </Link>
            )}
          </div>
          {!pro && <p className="text-xs text-zinc-500">Stati 24 è yo se pou atis Pro. Peze « Stati: vin Pro » pou w wè plan an.</p>}
          {msg && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`} role="status">
              {msg.text}
            </p>
          )}
        </div>
      </div>

      {/* Kat yo nan gwosè reyèl la, kache deyò ekran an: se yo ki vin imaj yo */}
      <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
        {(["feed", "story", "square"] as QuoteFormat[]).map((f) => (
          <div key={f} ref={(el) => void (nodes.current[f] = el)}>
            <DailyQuoteCard {...props} format={f} />
          </div>
        ))}
      </div>
    </section>
  );
}
