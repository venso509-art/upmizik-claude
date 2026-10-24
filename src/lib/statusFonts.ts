import localFont from "next/font/local";

// ===== Stil ekriti (font) pou stati tèks yo =====
// Fichye yo nan src/app/fonts/status (Google Fonts, lisans OFL): yo chaje sèlman lè yon stati itilize yo.
// Kle a ("anton", "pacifico"...) se sa ki sove nan baz done a (artist_statuses.overlay.font).

const anton = localFont({ src: "../app/fonts/status/anton.woff2", display: "swap" });
const pacifico = localFont({ src: "../app/fonts/status/pacifico.woff2", display: "swap" });
const marker = localFont({ src: "../app/fonts/status/marker.woff2", display: "swap" });
const playfair = localFont({ src: "../app/fonts/status/playfair.woff2", weight: "700", display: "swap" });
const typewriter = localFont({ src: "../app/fonts/status/typewriter.woff2", display: "swap" });
const fredoka = localFont({ src: "../app/fonts/status/fredoka.woff2", weight: "600", display: "swap" });
const bangers = localFont({ src: "../app/fonts/status/bangers.woff2", display: "swap" });
const dancing = localFont({ src: "../app/fonts/status/dancing.woff2", weight: "700", display: "swap" });
const righteous = localFont({ src: "../app/fonts/status/righteous.woff2", display: "swap" });
const caveat = localFont({ src: "../app/fonts/status/caveat.woff2", weight: "700", display: "swap" });

export type StatusFont = { key: string; label: string; className: string };

export const STATUS_FONTS: StatusFont[] = [
  { key: "klasik", label: "Klasik", className: "font-sans font-bold" },
  { key: "anton", label: "Gwo", className: `${anton.className} uppercase tracking-wide` },
  { key: "pacifico", label: "Bèl men", className: pacifico.className },
  { key: "marker", label: "Makè", className: marker.className },
  { key: "playfair", label: "Elegan", className: playfair.className },
  { key: "typewriter", label: "Machin", className: typewriter.className },
  { key: "fredoka", label: "Won", className: fredoka.className },
  { key: "bangers", label: "Komik", className: `${bangers.className} tracking-wider` },
  { key: "dancing", label: "Dans", className: dancing.className },
  { key: "righteous", label: "Retro", className: righteous.className },
  { key: "caveat", label: "Kaye", className: caveat.className },
];

export function statusFontClass(key: string | null | undefined) {
  return (STATUS_FONTS.find((f) => f.key === key) ?? STATUS_FONTS[0]).className;
}
