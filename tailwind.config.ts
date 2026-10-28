import type { Config } from "tailwindcss";
import twColors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

// ===== Tema "Karayib Nwit" =====
// Nou redefini koulè Tailwind yo nan rasin lan, konsa TOUT paj yo chanje ansanm:
//   zinc    → nwa ble (fon + tèks gri)       fon prensipal: #0B132B
//   fuchsia → vèt Karayib (koulè prensipal)   vèt fonse:     #0A5C36
//   violet  → vèt lanmè (pou gradyan yo)
//   citron  → jòn sitwon (aksan, bouton prensipal yo, ak tèks nwa ladan yo)
const navy = {
  50: "#F3F5FA",
  100: "#E4E8F2",
  200: "#C8D0E2",
  300: "#A7B2CC", // tèks gri klè
  400: "#8592B0",
  500: "#68769A",
  600: "#46526F",
  700: "#2D3854",
  800: "#1C2642",
  900: "#121B37",
  950: "#0B132B", // fon an
};

const caribGreen = {
  50: "#E9F9F0",
  100: "#CBF1DC",
  200: "#9BE3BA",
  300: "#63CF91",
  400: "#34B86F",
  500: "#179A54",
  600: "#0E7C43",
  700: "#0A5C36", // vèt fonse prensipal la
  800: "#08492B",
  900: "#063821",
  950: "#032015",
};

const seaGreen = {
  50: "#E7F8F5",
  100: "#C4EEE6",
  200: "#8FDDCF",
  300: "#55C6B2",
  400: "#25A891",
  500: "#108C78",
  600: "#0B7062",
  700: "#095A50",
  800: "#08473F",
  900: "#063631",
  950: "#03211E",
};

const citron = {
  50: "#FFFCE5",
  100: "#FFF6B8",
  200: "#FFEE85",
  300: "#FFE34D",
  400: "#FFD700", // jòn sitwon an
  500: "#E6C000",
  600: "#B89A00",
  700: "#8A7300",
};

// ===== MÒD LIGHT / DARK =====
// Koulè yo se varyab CSS (--c-<koulè>-<nyans>): mòd sonb (default) = palèt ki anlè yo.
// Mòd light (klas "light" sou <html>): fon an blan, tèks yo fonse, epi nyans klè yo (100-400)
// vin fonse pou yo li byen sou blan. "white" vin nwa ble (tèks + vè yo), konsa tout sit la chanje ansanm.
type Palette = Record<string, string>;
const rgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const { red, emerald, amber, sky, rose } = twColors;
const PALETTES: Record<string, Palette> = { zinc: navy, fuchsia: caribGreen, violet: seaGreen, citron, red, emerald, amber, sky, rose };

// Mòd light: fon blan → tèks nwa ble (gri yo envèse)
const lightZinc: Palette = {
  50: "#0B132B",
  100: "#172140",
  200: "#26314F",
  300: "#3B4766",
  400: "#56627F",
  500: "#76819C",
  600: "#A3ACC1",
  700: "#CDD3E1",
  800: "#E3E7F0",
  900: "#F3F5F9",
  950: "#FFFFFF",
};
// Koulè aksan yo: nyans klè yo (tèks sou fon fonse) vin fonse sou fon blan; 500+ pa chanje (bouton yo)
const deepen = (p: Palette): Palette => ({ ...p, 50: p[900] ?? p[700], 100: p[800] ?? p[700], 200: p[700], 300: p[700], 400: p[600] });
const LIGHT: Record<string, Palette> = {
  zinc: lightZinc,
  fuchsia: deepen(caribGreen),
  violet: deepen(seaGreen),
  citron: { ...citron, 50: "#5C4D00", 100: "#6E5C00", 200: "#7A6600", 300: "#8A7300" },
  red: deepen(red),
  emerald: deepen(emerald),
  amber: deepen(amber),
  sky: deepen(sky),
  rose: deepen(rose),
};

const vars = (pals: Record<string, Palette>) =>
  Object.fromEntries(Object.entries(pals).flatMap(([name, p]) => Object.entries(p).map(([shade, hex]) => [`--c-${name}-${shade}`, rgb(hex)])));
const asVars = (name: string, p: Palette) => Object.fromEntries(Object.keys(p).map((shade) => [shade, `rgb(var(--c-${name}-${shade}) / <alpha-value>)`]));

const themePlugin = plugin(({ addBase }) => {
  addBase({
    ":root": { ...vars(PALETTES), "--c-white": "255 255 255" },
    "html.light": { ...vars(LIGHT), "--c-white": rgb("#0B132B") },
    // Ekran videyo plen ekran yo (live, stati, lektè) rete fonse menm an mòd light
    ".force-dark": { ...vars(PALETTES), "--c-white": "255 255 255", colorScheme: "dark" },
  });
});

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Koulè ki nan lib/ (egz: MonCash/NatCash nan lib/donations.ts)
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: asVars("zinc", navy),
        fuchsia: asVars("fuchsia", caribGreen),
        violet: asVars("violet", seaGreen),
        citron: asVars("citron", citron),
        red: asVars("red", red),
        emerald: asVars("emerald", emerald),
        amber: asVars("amber", amber),
        sky: asVars("sky", sky),
        rose: asVars("rose", rose),
        white: "rgb(var(--c-white) / <alpha-value>)",
      },
      keyframes: {
        // Ba egalizè yo k ap monte desann nan hero a
        equalizer: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        // Eleman ki parèt lè paj la chaje: fade-in + ti glisman anlè
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // ===== Piblisite: ti men ki "klike", vag ki gaye, flèch ki bouje =====
        // Men an rive, peze (45%), epi rete; vag la soti nan menm moman an (ad-ripple)
        "ad-tap": {
          "0%": { transform: "translate(14px, 14px) scale(1)", opacity: "0" },
          "20%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "40%": { transform: "translate(0, 0) scale(1)" },
          "47%": { transform: "translate(0, 0) scale(0.82)" },
          "56%": { transform: "translate(0, 0) scale(1)" },
          "85%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "100%": { transform: "translate(14px, 14px) scale(1)", opacity: "0" },
        },
        "ad-ripple": {
          "0%, 46%": { transform: "translate(-50%, -50%) scale(0)", opacity: "0" },
          "48%": { transform: "translate(-50%, -50%) scale(0.02)", opacity: "0.95" },
          "75%": { opacity: "0.55" },
          "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0" },
        },
        "ad-nudge": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(5px)" },
        },
        // Bouton don Top 3 a: bat tankou yon kè (de ti kou, epi yon poz)
        heartbeat: {
          "0%, 40%, 100%": { transform: "scale(1)" },
          "10%": { transform: "scale(1.14)" },
          "20%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.1)" },
        },
        // Sèk limyè ki gaye toutotan bouton don an
        "donate-glow": {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "70%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        // Ti pwen ki klere sou bouton an pandan men an peze
        "ad-press": {
          "0%, 44%, 60%, 100%": { transform: "scale(1)" },
          "48%": { transform: "scale(0.94)" },
        },
        // Live: kado ki glise antre, gwo kado nan mitan ekran an, kè k ap monte
        "gift-in": {
          "0%": { opacity: "0", transform: "translateX(-120%)" },
          "10%, 85%": { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateY(-20px)" },
        },
        "gift-big": {
          "0%": { opacity: "0", transform: "scale(0.2) rotate(-15deg)" },
          "25%": { opacity: "1", transform: "scale(1.15) rotate(5deg)" },
          "40%, 80%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
          "100%": { opacity: "0", transform: "scale(1.6) translateY(-60px)" },
        },
        // Kè ki parèt kote dwèt la touche ekran an (tap doub), epi ki monte
        "heart-pop": {
          "0%": { opacity: "0", transform: "translate(-50%, -50%) scale(0.3) rotate(var(--rot, 0deg))" },
          "18%": { opacity: "1", transform: "translate(-50%, -50%) scale(1.25) rotate(var(--rot, 0deg))" },
          "35%": { opacity: "1", transform: "translate(-50%, -50%) scale(1) rotate(var(--rot, 0deg))" },
          "100%": { opacity: "0", transform: "translate(-50%, -180%) scale(0.85) rotate(var(--rot, 0deg))" },
        },
        "heart-float": {
          "0%": { opacity: "1", transform: "translateY(0) scale(0.6)" },
          "100%": { opacity: "0", transform: "translateY(-220px) scale(1.3)" },
        },
        // Gwo kado (250+ goud): reyon limyè k ap vire, konfeti, lyon ki antre epi ki gwonde
        "rays-spin": { from: { transform: "translate(-50%, -50%) rotate(0deg)" }, to: { transform: "translate(-50%, -50%) rotate(360deg)" } },
        "premium-in": {
          "0%": { opacity: "0" },
          "8%, 85%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "premium-gift": {
          "0%": { opacity: "0", transform: "scale(0.1) translateY(120px)" },
          "22%": { opacity: "1", transform: "scale(1.25) translateY(0)" },
          "32%, 82%": { opacity: "1", transform: "scale(1) translateY(0)" },
          "100%": { opacity: "0", transform: "scale(1.8) translateY(-80px)" },
        },
        // Lyon an antre vit (anvan premye gwonde a 0.35 s), li grandi chak fwa l gwonde, epi l soti
        "lion-enter": {
          "0%": { opacity: "0", transform: "translateY(40%) scale(0.5)" },
          "6%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "10%, 26%": { transform: "scale(1.12)" },
          "32%, 50%": { transform: "scale(1)" },
          "55%, 70%": { transform: "scale(1.12)" },
          "76%, 90%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-30%) scale(1.4)" },
        },
        "roar-ring": {
          "0%": { opacity: "0.9", transform: "translate(-50%, -50%) scale(0.3)" },
          "100%": { opacity: "0", transform: "translate(-50%, -50%) scale(2.6)" },
        },
        "screen-shake": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%, 50%, 90%": { transform: "translate(-7px, 3px)" },
          "30%, 70%": { transform: "translate(7px, -3px)" },
        },
        "confetti-fall": {
          "0%": { opacity: "1", transform: "translateY(-10vh) rotate(0deg)" },
          "100%": { opacity: "0", transform: "translateY(105vh) rotate(720deg)" },
        },
        // Notifikasyon boost (anlè sit la): kat la desann epi l rebondi
        "toast-drop": {
          "0%": { opacity: "0", transform: "translateY(-28px) scale(0.92)" },
          "60%": { opacity: "1", transform: "translateY(4px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Ti kado a ki souke pou di "louvri m!"
        "gift-wiggle": {
          "0%, 60%, 100%": { transform: "rotate(0deg) scale(1)" },
          "70%": { transform: "rotate(-12deg) scale(1.1)" },
          "80%": { transform: "rotate(10deg) scale(1.1)" },
          "90%": { transform: "rotate(-6deg) scale(1.05)" },
        },
        // Anvlòp kado a: rabat la louvri (3D), lèt la (kouvèti mizik la) monte soti ladan l
        "flap-open": {
          "0%": { transform: "rotateX(0deg)", zIndex: "30" },
          "49%": { zIndex: "30" },
          "50%": { zIndex: "5" },
          "100%": { transform: "rotateX(180deg)", zIndex: "5" },
        },
        "letter-rise": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-62%)" },
        },
        "envelope-in": {
          "0%": { opacity: "0", transform: "scale(0.6) translateY(30px)" },
          "60%": { opacity: "1", transform: "scale(1.05) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // Meni ☰: chak eleman desann epi parèt youn apre lòt (stagger)
        "menu-item": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Pwofil atis: liy jòn nan trase poukont li, epi ikòn yo parèt youn apre lòt
        // Rapò admin: ba yo grandi soti agoch
        "bar-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "none" },
        },
        "orbit-draw": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        "orbit-pop": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "70%": { opacity: "1", transform: "scale(1.12)" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Chanjman paj: paj la parèt dousman epi l glise monte yon ti kras
        // NB: fen an se "transform: none" (+ fill "backwards"): yon transform ki rete ta kase eleman "fixed" nan paj yo (live, modal...)
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(22px)" },
          "40%": { opacity: "0.6" },
          "100%": { opacity: "1", transform: "none" },
        },
        // Meni ☰: panèl la desann dousman
        "menu-drop": {
          "0%": { opacity: "0", transform: "translateY(-10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Notifikasyon: kat la monte epi l "rebondi" yon ti kras
        "toast-pop": {
          "0%": { opacity: "0", transform: "translateY(28px) scale(0.92)" },
          "60%": { opacity: "1", transform: "translateY(-4px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Ti zetwal fon an k ap klere
        twinkle: {
          "0%, 100%": { opacity: "0.15", transform: "scale(0.7)" },
          "50%": { opacity: "1", transform: "scale(1.25)" },
        },
        // Fon paj yo: limyè ki flote dousman
        // 3 pwen chemen (pa sèlman ale-vini): boul limyè a fè yon ti sèk dous, li grandi epi l retresi
        "blob-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "33%": { transform: "translate3d(var(--dx, 12%), calc(var(--dy, 10%) * -1), 0) scale(1.15)" },
          "66%": { transform: "translate3d(calc(var(--dx, 12%) * -0.7), var(--dy, 10%), 0) scale(0.92)" },
        },
        // Disk vinil lektè a k ap woule
        "vinyl-spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        // Bwat "pa gen entènèt" la souke lè yon klik bloke
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "gift-in": "gift-in 4.2s ease-out both",
        "gift-big": "gift-big 2.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "heart-float": "heart-float 1.8s ease-out both",
        "heart-pop": "heart-pop 1.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        "rays-spin": "rays-spin 6s linear infinite",
        "premium-in": "premium-in 5s ease-out both",
        "premium-gift": "premium-gift 5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "lion-enter": "lion-enter 5.2s ease-out both",
        "roar-ring": "roar-ring 1.2s ease-out both",
        "screen-shake": "screen-shake 0.5s ease-in-out 3",
        "confetti-fall": "confetti-fall 3.2s linear both",
        "blob-drift": "blob-drift 22s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        "toast-pop": "toast-pop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "menu-drop": "menu-drop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
        "page-in": "page-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "menu-item": "menu-item 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "bar-grow": "bar-grow 1s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "orbit-draw": "orbit-draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "orbit-pop": "orbit-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        "toast-drop": "toast-drop 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "gift-wiggle": "gift-wiggle 1.6s ease-in-out infinite",
        "flap-open": "flap-open 0.7s ease-in-out 0.35s both",
        "letter-rise": "letter-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.95s both",
        "envelope-in": "envelope-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        vinyl: "vinyl-spin 5s linear infinite",
        shake: "shake 0.4s ease-in-out",
        equalizer: "equalizer 1.2s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ad-tap": "ad-tap 2.8s ease-in-out infinite",
        "ad-ripple": "ad-ripple 2.8s cubic-bezier(0.2, 0.7, 0.3, 1) infinite",
        "ad-nudge": "ad-nudge 1s ease-in-out infinite",
        "ad-press": "ad-press 2.8s ease-in-out infinite",
        heartbeat: "heartbeat 1.8s ease-in-out infinite",
        "donate-glow": "donate-glow 1.8s ease-out infinite",
      },
    },
  },
  plugins: [themePlugin],
};
export default config;
