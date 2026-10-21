import type { Config } from "tailwindcss";

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

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: navy,
        fuchsia: caribGreen,
        violet: seaGreen,
        citron,
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
        // Ti pwen ki klere sou bouton an pandan men an peze
        "ad-press": {
          "0%, 44%, 60%, 100%": { transform: "scale(1)" },
          "48%": { transform: "scale(0.94)" },
        },
      },
      animation: {
        equalizer: "equalizer 1.2s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ad-tap": "ad-tap 2.8s ease-in-out infinite",
        "ad-ripple": "ad-ripple 2.8s cubic-bezier(0.2, 0.7, 0.3, 1) infinite",
        "ad-nudge": "ad-nudge 1s ease-in-out infinite",
        "ad-press": "ad-press 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
