"use client";

import { useEffect, useState } from "react";

// ===== Enstale app la (PWA): kenbe evènman "beforeinstallprompt" la pou tout sit la =====
// Chrome/Android voye evènman an YON sèl fwa, byen bonè: nou sere l isit la pou kat la
// ak bouton meni an ka itilize l nenpòt lè.

export type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // nou montre pwòp bouton pa nou an
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    emit();
  });
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  const ua = navigator.userAgent;
  // iPadOS 13+ di l se "Macintosh" men li gen ekran touche
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isMobileOrTablet() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) <= 1024;
}

// Louvri fenèt enstalasyon navigatè a. Retounen "accepted" / "dismissed", oswa null si navigatè a pa ofri l.
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  if (!deferred) return null;
  const e = deferred;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  emit();
  return outcome;
}

export function useInstallState() {
  const [state, setState] = useState({ ready: false, canPrompt: false, ios: false, installed: false });
  useEffect(() => {
    const update = () => setState({ ready: true, canPrompt: !!deferred, ios: isIos(), installed: installedNow || isStandalone() });
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  return state;
}
