import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
