"use client";

import { useEffect, useState } from "react";
import { Portal } from "@/components/Portal";

// Evènman Chrome/Android/Edge ki pèmèt nou louvri fenèt "Enstale app la" a nou menm
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "upmizik-install-dismissed";
const DISMISS_DAYS = 7; // si moun nan di "Pita", nou pa montre l ankò pandan 7 jou
const SHOW_AFTER_MS = 12000; // kat la parèt apre 12 segonn sou sit la

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS 13+ di l se "Macintosh" men li gen ekran touche
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isMobileOrTablet() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) <= 1024;
}

// Kat "Enstale UpMizik" pou telefòn ak tablèt: Android → fenèt enstalasyon an dirèkteman;
// iPhone/iPad → 3 etap senp (Safari pa pèmèt yon bouton enstale otomatik).
export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileOrTablet()) return;
    try {
      const last = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (last && Date.now() - last < DISMISS_DAYS * 86400 * 1000) return;
    } catch {}

    const iosDevice = isIos();
    setIos(iosDevice);
    const onPrompt = (e: Event) => {
      e.preventDefault(); // nou montre pwòp bouton pa nou an
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setShowIosSteps(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") setVisible(false);
      else dismiss();
      return;
    }
    // iPhone/iPad, oswa navigatè ki pa bay fenèt otomatik la: montre etap yo
    setShowIosSteps(true);
  }

  // Android ki poko bay evènman an, epi se pa iOS: pa gen anyen nou ka fè pou kounye a
  if (!visible || installed || (!deferred && !ios)) return null;

  return (
    <Portal>
      {/* Kat la: anlè ba navigasyon an ak lektè a */}
      {!showIosSteps && (
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
      )}

      {/* iPhone/iPad: 3 etap pou ajoute l sou ekran akèy la */}
      {showIosSteps && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={dismiss}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enstale UpMizik sou iPhone"
            className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] motion-safe:animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl bg-white" />
              <div>
                <p className="font-bold text-white">Enstale UpMizik</p>
                <p className="text-xs text-zinc-400">3 ti etap nan Safari</p>
              </div>
            </div>
            <ol className="mt-5 space-y-4 text-sm text-zinc-200">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-citron-400 font-bold text-zinc-950">1</span>
                <span>
                  Peze bouton <strong>Pataje</strong>{" "}
                  <svg viewBox="0 0 24 24" className="inline h-5 w-5 align-[-4px] text-sky-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3v12" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                  </svg>{" "}
                  anba (oswa anlè) ekran an.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-citron-400 font-bold text-zinc-950">2</span>
                <span>
                  Chwazi <strong>« Sur l’écran d’accueil »</strong> / <strong>« Add to Home Screen »</strong> ➕
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-citron-400 font-bold text-zinc-950">3</span>
                <span>
                  Peze <strong>Ajouter / Add</strong>. Ikòn UpMizik la ap parèt sou ekran akèy ou! 🎉
                </span>
              </li>
            </ol>
            <button type="button" onClick={dismiss} className="mt-6 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:text-white">
              Dakò
            </button>
          </div>
        </div>
      )}
    </Portal>
  );
}
