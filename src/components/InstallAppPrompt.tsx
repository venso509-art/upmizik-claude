"use client";

import { useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import { isMobileOrTablet, promptInstall, useInstallState } from "@/lib/installPrompt";

const DISMISS_KEY = "upmizik-install-dismissed";
const DISMISS_DAYS = 7; // si moun nan di "Pita", nou pa montre kat la ankò pandan 7 jou
const SHOW_AFTER_MS = 12000; // kat la parèt apre 12 segonn sou sit la

// Etap pou enstale app la lè navigatè a pa ofri yon bouton otomatik (iPhone/iPad, oswa lòt navigatè)
export function InstallSteps({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  const steps = ios
    ? [
        <>
          Peze bouton <strong>Pataje</strong>{" "}
          <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px] text-sky-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
          </svg>{" "}
          anba (oswa anlè) ekran an, nan <strong>Safari</strong>.
        </>,
        <>
          Chwazi <strong>« Sur l’écran d’accueil »</strong> / <strong>« Add to Home Screen »</strong> ➕
        </>,
        <>
          Peze <strong>Ajouter / Add</strong>. Ikòn UpMizik la ap parèt sou ekran akèy ou! 🎉
        </>,
      ]
    : [
        <>
          Peze bouton meni navigatè a <strong>⋮</strong> (anlè adwat).
        </>,
        <>
          Chwazi <strong>« Installer l’application »</strong>, <strong>« Install app »</strong> oswa <strong>« Ajouter à l’écran d’accueil »</strong>.
        </>,
        <>
          Konfime. Ikòn UpMizik la ap parèt sou ekran akèy ou! 🎉
        </>,
      ];

  return (
    <Portal>
      <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enstale UpMizik"
          className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] motion-safe:animate-fade-up sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl bg-white" />
            <div>
              <p className="font-bold text-white">Enstale UpMizik</p>
              <p className="text-xs text-zinc-400">3 ti etap senp</p>
            </div>
          </div>
          <ol className="mt-5 space-y-4 text-sm text-zinc-200">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-citron-400 font-bold text-zinc-950">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
            Dakò
          </button>
        </div>
      </div>
    </Portal>
  );
}

// Kat "Enstale UpMizik" pou telefòn ak tablèt: Android → fenèt enstalasyon an dirèkteman;
// iPhone/iPad → 3 etap senp (Safari pa pèmèt yon bouton enstale otomatik).
export function InstallAppPrompt() {
  const { ready, canPrompt, ios, installed } = useInstallState();
  const [visible, setVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (!ready || installed || !isMobileOrTablet()) return;
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (last && Date.now() - last < DISMISS_DAYS * 86400 * 1000) return;
    } catch {}
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [ready, installed]);

  function dismiss() {
    setVisible(false);
    setShowSteps(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "accepted") setVisible(false);
    else if (outcome === "dismissed") dismiss();
    else setShowSteps(true); // iPhone/iPad: montre etap yo
  }

  if (showSteps) return <InstallSteps ios={ios} onClose={dismiss} />;
  // Android ki poko bay evènman an, epi se pa iOS: pa gen anyen nou ka fè pou kounye a
  if (!visible || installed || (!canPrompt && !ios)) return null;

  return (
    <Portal>
      {/* Kat la: anlè ba navigasyon an ak lektè a */}
      <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] z-[60] mx-auto max-w-md motion-safe:animate-fade-up sm:bottom-6">
        <div className="flex items-center gap-3 rounded-2xl border border-citron-400/40 bg-zinc-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Enstale UpMizik</p>
            <p className="text-xs text-zinc-400">Mizik ayisyen an sou ekran akèy ou, tankou yon vrè app. Gratis!</p>
          </div>
          <button type="button" onClick={install} className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm">
            Enstale
          </button>
          <button type="button" onClick={dismiss} className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-white" aria-label="Pita">
            ✕
          </button>
        </div>
      </div>
    </Portal>
  );
}

// Bouton "📲 Enstale app la" nan meni itilizatè a (toujou disponib, pa gen 12 segonn ni "pita")
export function InstallAppButton({ className = "" }: { className?: string }) {
  const { ready, ios, installed } = useInstallState();
  const [showSteps, setShowSteps] = useState(false);
  if (!ready) return null;
  if (installed) {
    return <p className={`px-3 py-3 text-sm text-emerald-300 ${className}`}>✓ App UpMizik la enstale sou aparèy sa a</p>;
  }
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if ((await promptInstall()) === null) setShowSteps(true);
        }}
        className={`flex w-full items-center gap-3 rounded-xl border border-citron-400/40 bg-citron-400/10 px-3 py-3 text-left text-base font-semibold text-citron-200 transition hover:bg-citron-400/20 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-lg bg-white" />
        📲 Enstale app la
      </button>
      {showSteps && <InstallSteps ios={ios} onClose={() => setShowSteps(false)} />}
    </>
  );
}
