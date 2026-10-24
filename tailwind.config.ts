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
    // Koulè ki nan lib/ (egz: MonCash/NatCash nan lib/donations.ts)
    "./src/lib/**/*.{js,ts,jsx,tsx}",
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
        "heart-float": {
          "0%": { opacity: "1", transform: "translateY(0) scale(0.6)" },
          "100%": { opacity: "0", transform: "translateY(-220px) scale(1.3)" },
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
  plugins: [],
};
export default config;
