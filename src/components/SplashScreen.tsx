"use client";

import { useEffect, useState } from "react";

const MAX_MS = 2500; // pa janm plis pase 2.5 s
const FADE_MS = 300;

// Splash UpMizik la. HTML + CSS li yo rann sou sèvè a (li parèt menm anvan JavaScript),
// e CSS la fè l disparèt poukont li apre 2.5 s si JavaScript pa ta janm chaje.
// Konpozan sa a fè l disparèt PI BONÈ depi paj la pare, epi li retire l nèt nan DOM an.
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    // Deja wè nan sesyon an: retire l touswit
    if (document.documentElement.classList.contains("up-splash-seen")) {
      setPhase("gone");
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const leave = () => {
      setPhase((p) => (p === "visible" ? "leaving" : p));
      timer = setTimeout(() => setPhase("gone"), FADE_MS);
    };
    // Pi ta posib: 2.5 s apre paj la kòmanse chaje (pa okenn reta atifisyèl)
    const cap = setTimeout(leave, Math.max(0, MAX_MS - performance.now()));
    if (document.readyState === "complete") leave();
    else window.addEventListener("load", leave, { once: true });
    return () => {
      clearTimeout(cap);
      if (timer) clearTimeout(timer);
      window.removeEventListener("load", leave);
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
