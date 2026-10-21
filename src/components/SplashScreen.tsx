"use client";

import { useEffect, useState } from "react";

// Splash la rete vizib ant 1.5 s ak 2 s depi li parèt sou ekran an (demann Venso)
const MIN_MS = 1500;
const MAX_MS = 2000;
const FADE_MS = 300;

// Splash UpMizik la. HTML + CSS li yo rann sou sèvè a (li parèt menm anvan JavaScript),
// e CSS la fè l disparèt poukont li apre 2 s si JavaScript pa ta janm chaje.
// Konpozan sa a kenbe l vizib 1.5–2 s, fè l disparèt dousman, epi li retire l nèt nan DOM an.
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    // Deja wè nan sesyon an: retire l touswit
    if (document.documentElement.classList.contains("up-splash-seen")) {
      setPhase("gone");
      return;
    }
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let minTimer: ReturnType<typeof setTimeout> | undefined;
    const leave = () => {
      setPhase((p) => (p === "visible" ? "leaving" : p));
      if (!fadeTimer) fadeTimer = setTimeout(() => setPhase("gone"), FADE_MS);
    };
    // Moman splash la parèt sou ekran an (premye pent), pou kontwole konbyen tan li rete vizib
    const shownAt =
      performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint")?.startTime ?? performance.now();
    const minEnd = shownAt + MIN_MS;
    const maxEnd = shownAt + MAX_MS;
    // Paj la pare: tann jiskaske splash la te vizib omwen 1.5 s
    const onReady = () => {
      minTimer = setTimeout(leave, Math.max(0, minEnd - performance.now()));
    };
    // Pi ta posib: 2 s, menm si paj la poko fin chaje
    const cap = setTimeout(leave, Math.max(0, maxEnd - performance.now()));
    if (document.readyState === "complete") onReady();
    else window.addEventListener("load", onReady, { once: true });
    return () => {
      clearTimeout(cap);
      if (minTimer) clearTimeout(minTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
      window.removeEventListener("load", onReady);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`up-splash${phase === "leaving" ? " is-leaving" : ""}`} role="status" aria-label="UpMizik ap chaje">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpg" alt="" width={108} height={108} className="up-splash__logo" />
      <p className="up-splash__name">
        <span>Up</span>Mizik
      </p>
      <div className="up-splash__bars" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <p className="up-splash__tagline">Platfòm mizik 100% ayisyen</p>
    </div>
  );
}
