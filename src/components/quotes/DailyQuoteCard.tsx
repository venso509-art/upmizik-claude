/* eslint-disable @next/next/no-img-element */
import localFont from "next/font/local";
import {
  FORMAT_SIZE,
  dayParts,
  initials,
  quoteScale,
  shortName,
  splitHighlight,
  type DailyQuote,
  type QuoteArtist,
  type QuoteFormat,
  type QuoteTemplate,
} from "@/lib/dailyQuotes";

// ===== Kat "Mesaj jounen an": 6 desen (kopye egzakteman sou designs/1…6.html) × 3 fòma =====
// Tout mezi yo an piksèl reyèl (1080 lajè): aperçu a rapetise l ak CSS, ekspò a pran l nan gwosè nòmal.

const fraunces = localFont({
  src: [
    { path: "../../app/fonts/quote/fraunces-normal.woff2", weight: "600", style: "normal" },
    { path: "../../app/fonts/quote/fraunces-italic.woff2", weight: "500", style: "italic" },
  ],
  display: "block",
  preload: false,
});

const GEIST = "var(--font-geist-sans), Geist, Inter, system-ui, sans-serif";
const SERIF = `${fraunces.style.fontFamily}, Georgia, serif`;
const LOGO = "/logo.jpg";

type Props = { template: QuoteTemplate; format: QuoteFormat; quote: DailyQuote; artist: QuoteArtist; day: string };

// Foto atis la (oswa inisyal li yo si l pa gen foto)
function Avatar({ src, name, size, style, fallbackBg, fallbackColor }: { src: string | null; name: string; size: number; style?: React.CSSProperties; fallbackBg: string; fallbackColor: string }) {
  const base: React.CSSProperties = { width: size, height: size, borderRadius: size / 2, objectFit: "cover", boxSizing: "border-box", display: "block", flexShrink: 0, ...style };
  if (src) return <img src={src} alt="Foto pwofil atis la" crossOrigin="anonymous" style={base} />;
  return (
    <div
      role="img"
      aria-label="Foto pwofil atis la"
      style={{ ...base, background: fallbackBg, color: fallbackColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GEIST, fontWeight: 800, fontSize: size * 0.38, letterSpacing: "-0.02em" }}
    >
      {initials(name)}
    </div>
  );
}

const Logo = ({ size }: { size: number }) => (
  <img src={LOGO} alt="Logo UpMizik" style={{ width: size, height: size, borderRadius: size / 2, background: "#ffffff", objectFit: "cover", display: "block", flexShrink: 0 }} />
);

// Ti liy sous la ("— Pwovèb ayisyen"), anba sitasyon an
const Source = ({ sous, color, center }: { sous: string | null; color: string; center?: boolean }) =>
  sous ? <span style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 28, color, textAlign: center ? "center" : "left" }}>— {sous}</span> : null;

const subline = (genre: string | null, withSite = true) => `Atis${genre ? ` ${genre}` : ""}${withSite ? " · sou UpMizik" : ""}`;

// ---------- 1. JÒN SOLÈY ----------
function T1({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "#FFD700", padding: "76px 80px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#0B132B", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", right: -160, top: -160, width: 520, height: 520, borderRadius: 260, background: "rgba(255, 255, 255, 0.22)" }} />
      <div aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 320, height: 320, borderRadius: 160, border: "3px solid rgba(11, 19, 43, 0.12)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <span style={{ fontWeight: 700, fontSize: 26, letterSpacing: "0.14em", padding: "14px 26px", borderRadius: 999, background: "#0B132B", color: "#FFD700" }}>MESAJ JOUNEN AN</span>
        <span style={{ fontWeight: 600, fontSize: 28, color: "rgba(11, 19, 43, 0.7)" }}>
          {p.d} {p.mon} {p.y}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative" }}>
        <svg aria-hidden width="120" height="96" viewBox="0 0 60 48" fill="#0B132B">
          <path d="M0 48V28C0 12 8 3 24 0l3 7C18 10 13 16 13 24h11v24H0zm33 0V28C33 12 41 3 57 0l3 7c-9 3-14 9-14 17h11v24H33z" />
        </svg>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 76 * quoteScale(quote.teks), lineHeight: 1.08, letterSpacing: "-0.03em" }}>{quote.teks}</p>
        <Source sous={quote.sous} color="rgba(11, 19, 43, 0.7)" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 44, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Avatar src={artist.avatarUrl} name={artist.name} size={132} style={{ border: "6px solid #0B132B" }} fallbackBg="#0B132B" fallbackColor="#FFD700" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
            <span style={{ fontWeight: 500, fontSize: 28, color: "rgba(11, 19, 43, 0.72)" }}>{subline(artist.genre)}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 32, borderTop: "3px solid rgba(11, 19, 43, 0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Logo size={68} />
            <span style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em" }}>
              Up<span style={{ color: "#ffffff" }}>Mizik</span>
            </span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 28 }}>upmizik.com</span>
        </div>
      </div>
    </div>
  );
}

// ---------- 2. BLE LANMÈ ----------
function T2({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "linear-gradient(160deg, #1C7AD8 0%, #06326E 100%)", padding: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", color: "#ffffff", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 40px 80px rgba(6, 50, 110, 0.25)" }}>
      <div aria-hidden style={{ position: "absolute", left: -200, bottom: -260, width: 700, height: 700, borderRadius: 350, border: "2px solid rgba(255, 255, 255, 0.12)" }} />
      <div aria-hidden style={{ position: "absolute", left: -120, bottom: -180, width: 540, height: 540, borderRadius: 270, border: "2px solid rgba(255, 255, 255, 0.10)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, position: "relative" }}>
        <div style={{ width: 184, height: 184, borderRadius: 92, padding: 8, boxSizing: "border-box", background: "linear-gradient(135deg, #FFE34D, #E6C000)" }}>
          <Avatar src={artist.avatarUrl} name={artist.name} size={168} style={{ border: "6px solid #0A56B0" }} fallbackBg="#0A56B0" fallbackColor="#FFE34D" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
        <span style={{ fontWeight: 500, fontSize: 26, letterSpacing: "0.16em", color: "rgba(255, 255, 255, 0.7)" }}>
          MESAJ JOUNEN AN · {p.d} {p.mon.toUpperCase()}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, position: "relative" }}>
        <div aria-hidden style={{ width: 80, height: 4, borderRadius: 2, background: "#FFE34D" }} />
        <p style={{ margin: 0, fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 74 * quoteScale(quote.teks), lineHeight: 1.12, letterSpacing: "-0.01em" }}>“{quote.teks}”</p>
        <Source sous={quote.sous} color="rgba(255, 255, 255, 0.75)" center />
        <div aria-hidden style={{ width: 80, height: 4, borderRadius: 2, background: "#FFE34D" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", padding: "14px 28px 14px 14px", borderRadius: 999, background: "rgba(255, 255, 255, 0.12)" }}>
        <Logo size={64} />
        <span style={{ fontWeight: 800, fontSize: 38, letterSpacing: "-0.02em" }}>
          <span style={{ color: "#FFE34D" }}>Up</span>Mizik
        </span>
        <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.75)" }}>· upmizik.com</span>
      </div>
    </div>
  );
}

// ---------- 3. WOUJ KONPA ----------
function T3({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  const [head, tail] = splitHighlight(quote.teks);
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "#B0102E", padding: "72px 76px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#ffffff", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: 18, background: "repeating-linear-gradient(90deg, #FFD700 0 60px, #0B132B 60px 120px)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 22, position: "relative" }}>
        <Avatar src={artist.avatarUrl} name={artist.name} size={112} style={{ border: "5px solid #ffffff" }} fallbackBg="#0B132B" fallbackColor="#FFD700" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 42, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
          <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.75)" }}>
            Mesaj jounen an · {p.d} {p.mon} {p.y}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 96 * quoteScale(quote.teks), lineHeight: 0.98, letterSpacing: "-0.045em" }}>
          {head}
          {tail && <span style={{ color: "#FFD700" }}>{tail}</span>}
        </p>
        <Source sous={quote.sous} color="rgba(255, 255, 255, 0.75)" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo size={64} />
            <span style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#FFD700" }}>Up</span>Mizik
            </span>
          </div>
          <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.75)" }}>Koute l sou upmizik.com</span>
        </div>
        <div aria-hidden style={{ width: 300, height: 170, borderRadius: 24, background: "rgba(0, 0, 0, 0.22)", border: "3px solid rgba(255, 255, 255, 0.25)", display: "flex", alignItems: "center", justifyContent: "space-around", boxSizing: "border-box" }}>
          <div style={{ width: 86, height: 86, borderRadius: 43, border: "10px solid #ffffff", boxSizing: "border-box" }} />
          <div style={{ width: 86, height: 86, borderRadius: 43, border: "10px solid #ffffff", boxSizing: "border-box" }} />
        </div>
      </div>
    </div>
  );
}

// ---------- 4. VÈT RASIN ----------
function T4({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  const [head, tail] = splitHighlight(quote.teks);
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "radial-gradient(120% 90% at 100% 0%, #1E9E63 0%, #0A5C36 45%, #063821 100%)", padding: 80, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#ffffff", position: "relative", overflow: "hidden", border: "2px solid rgba(167, 243, 208, 0.25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <span style={{ fontWeight: 600, fontSize: 28, color: "#A7F3D0", padding: "14px 28px", borderRadius: 999, border: "2px solid rgba(110, 231, 183, 0.45)", background: "rgba(6, 40, 30, 0.45)" }}>Mesaj jounen an</span>
        <span style={{ fontWeight: 600, fontSize: 28, color: "rgba(255, 255, 255, 0.7)" }}>
          {p.d} · {p.m} · {p.y}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 34, position: "relative" }}>
        <span aria-hidden style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 220, lineHeight: 0.6, color: "#6EE7B7", height: 110 }}>
          “
        </span>
        <p style={{ margin: 0, fontFamily: SERIF, fontWeight: 600, fontSize: 78 * quoteScale(quote.teks), lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {head}
          {tail && <span style={{ fontStyle: "italic", fontWeight: 500, color: "#A7F3D0" }}>{tail}</span>}
        </p>
        <Source sous={quote.sous} color="#A7F3D0" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 40, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <Avatar src={artist.avatarUrl} name={artist.name} size={128} style={{ boxShadow: "0 0 0 6px #6EE7B7, 0 0 0 14px rgba(110, 231, 183, 0.25)" }} fallbackBg="#063821" fallbackColor="#A7F3D0" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 44, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
            <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.75)" }}>{subline(artist.genre)}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 30, borderTop: "2px solid rgba(167, 243, 208, 0.25)" }}>
          <Logo size={60} />
          <span style={{ fontWeight: 800, fontSize: 38, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#FFE34D" }}>Up</span>Mizik
          </span>
          <span style={{ marginLeft: "auto", fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.75)" }}>upmizik.com</span>
        </div>
      </div>
    </div>
  );
}

// ---------- 5. WOZ GOSPEL ----------
function T5({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  const [head, tail] = splitHighlight(quote.teks);
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "linear-gradient(180deg, #E8338A 0%, #9E1550 100%)", padding: "84px 80px 72px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", color: "#ffffff", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 40px 80px rgba(158, 21, 80, 0.25)" }}>
      <div aria-hidden style={{ position: "absolute", left: "50%", top: -420, width: 900, height: 900, marginLeft: -450, borderRadius: 450, background: "radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 65%)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative" }}>
        <Avatar src={artist.avatarUrl} name={artist.name} size={176} style={{ border: "8px solid #ffffff", boxShadow: "0 20px 40px rgba(80, 0, 30, 0.35)" }} fallbackBg="#9E1550" fallbackColor="#ffffff" />
        <span style={{ fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
        <span style={{ fontWeight: 600, fontSize: 24, letterSpacing: "0.18em", padding: "10px 22px", borderRadius: 999, background: "rgba(255, 255, 255, 0.18)" }}>MESAJ JOUNEN AN</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, position: "relative" }}>
        <p style={{ margin: 0, fontFamily: SERIF, fontWeight: 600, fontSize: 80 * quoteScale(quote.teks), lineHeight: 1.08, letterSpacing: "-0.02em" }}>
          {head}
          {tail && <span style={{ fontStyle: "italic", fontWeight: 500 }}>{tail}</span>}
        </p>
        <Source sous={quote.sous} color="rgba(255, 255, 255, 0.8)" center />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo size={64} />
          <span style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#FFE34D" }}>Up</span>Mizik
          </span>
        </div>
        <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.8)" }}>
          {p.d} {p.mon} {p.y} · upmizik.com
        </span>
      </div>
    </div>
  );
}

// ---------- 6. NWA VINIL ----------
function T6({ quote, artist, day }: Omit<Props, "template" | "format">) {
  const p = dayParts(day);
  const [head, tail] = splitHighlight(quote.teks);
  const bars = [24, 48, 34, 60, 28, 44, 18];
  return (
    <div style={{ width: 940, height: 1210, boxSizing: "border-box", borderRadius: 64, background: "#111318", padding: "76px 80px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#ffffff", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", right: -230, top: -230, width: 760, height: 760, borderRadius: 380, background: "repeating-radial-gradient(circle, #1B1E26 0 3px, #0C0D11 3px 9px)", boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.06)" }} />
      <div style={{ position: "absolute", right: 70, top: 70, width: 220, height: 220, borderRadius: 110, padding: 10, boxSizing: "border-box", background: "linear-gradient(135deg, #FFE34D, #E6C000)" }}>
        <Avatar src={artist.avatarUrl} name={artist.name} size={200} fallbackBg="#111318" fallbackColor="#FFE34D" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
        <span style={{ fontWeight: 600, fontSize: 26, letterSpacing: "0.16em", color: "#FFE34D" }}>MESAJ JOUNEN AN</span>
        <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.6)" }}>
          {p.d} {p.mon} {p.y}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, position: "relative" }}>
        <div aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
          {bars.map((h, i) => (
            <i key={i} style={{ display: "block", width: 10, height: h, borderRadius: 5, background: "#FFE34D" }} />
          ))}
        </div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 84 * quoteScale(quote.teks), lineHeight: 1.02, letterSpacing: "-0.04em" }}>
          {head}
          {tail && <span style={{ background: "linear-gradient(90deg, #FFE34D, #E6C000)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{tail}</span>}
        </p>
        <Source sous={quote.sous} color="rgba(255, 255, 255, 0.65)" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, position: "relative", paddingTop: 32, borderTop: "2px solid rgba(255, 255, 255, 0.12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 44, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{shortName(artist.name)}</span>
          <span style={{ fontWeight: 500, fontSize: 26, color: "rgba(255, 255, 255, 0.65)" }}>{subline(artist.genre, false)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <Logo size={64} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 800, fontSize: 36, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#FFE34D" }}>Up</span>Mizik
            </span>
            <span style={{ fontWeight: 500, fontSize: 22, color: "rgba(255, 255, 255, 0.6)" }}>upmizik.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARDS = { 1: T1, 2: T2, 3: T3, 4: T4, 5: T5, 6: T6 } as const;
// Koulè fon deyò kat la (menm jan ak desen yo) + koulè tèks anba a nan fòma Story
const STAGE: Record<QuoteTemplate, { bg: string; ink: string }> = {
  1: { bg: "#0B132B", ink: "rgba(255, 255, 255, 0.75)" },
  2: { bg: "#F4EEE2", ink: "#06326E" },
  3: { bg: "#16070B", ink: "rgba(255, 255, 255, 0.75)" },
  4: { bg: "#0B132B", ink: "rgba(255, 255, 255, 0.75)" },
  5: { bg: "#FFF1F6", ink: "#9E1550" },
  6: { bg: "#FFD700", ink: "#111318" },
};

export function DailyQuoteCard({ template, format, quote, artist, day }: Props) {
  const Card = CARDS[template];
  const { w, h } = FORMAT_SIZE[format];
  const stage = STAGE[template];
  const card = <Card quote={quote} artist={artist} day={day} />;

  return (
    <div
      style={{ width: w, height: h, boxSizing: "border-box", background: stage.bg, fontFamily: GEIST, position: "relative", overflow: "hidden" }}
    >
      {format === "feed" && <div style={{ position: "absolute", left: 70, top: 70 }}>{card}</div>}
      {format === "story" && (
        <>
          <div style={{ position: "absolute", left: 70, top: 300 }}>{card}</div>
          <p style={{ position: "absolute", left: 0, right: 0, top: 120, margin: 0, textAlign: "center", fontWeight: 800, fontSize: 44, letterSpacing: "0.16em", color: stage.ink }}>
            {dayParts(day).d} {dayParts(day).mon.toUpperCase()} {dayParts(day).y}
          </p>
          <p style={{ position: "absolute", left: 0, right: 0, bottom: 150, margin: 0, textAlign: "center", fontWeight: 600, fontSize: 38, color: stage.ink }}>
            🎧 Koute m sou upmizik.com
          </p>
        </>
      )}
      {format === "square" && (
        // Kat la rapetise (80 %) pou l antre nan kare a
        <div style={{ position: "absolute", left: 70, top: -65, transform: "scale(0.8)", transformOrigin: "center" }}>{card}</div>
      )}
    </div>
  );
}
