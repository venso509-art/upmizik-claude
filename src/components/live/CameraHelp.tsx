"use client";

import { useEffect, useState } from "react";

// Lè kamera a / mikwo a pa louvri: eksplike poukisa, ak etap egzak pou telefòn moun nan
// (app enstale a pa gen ba adrès ak 🔒, kidonk etap yo diferan)

type Platform = "android-app" | "android" | "ios-app" | "ios" | "desktop";

function platform(): Platform {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (/android/i.test(ua)) return standalone ? "android-app" : "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return standalone ? "ios-app" : "ios";
  return "desktop";
}

export function cameraErrorKind(e: unknown): "denied" | "busy" | "missing" | "insecure" | "other" {
  const name = (e as { name?: string })?.name ?? "";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "denied";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "busy";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") return "missing";
  return "other";
}

const STEPS: Record<Platform, string[]> = {
  "android-app": [
    "Kenbe ikòn app UpMizik la sou ekran akèy la, epi peze ⓘ (Enfòmasyon app)",
    "Peze « Otorizasyon » (Permissions)",
    "Mete « Kamera » ak « Mikwo » sou « Pèmèt pandan w ap itilize app la »",
    "Si sa pa mache: Paramèt telefòn → Aplikasyon → Chrome → Otorizasyon → pèmèt Kamera ak Mikwo",
    "Tounen nan app la epi peze « Eseye ankò »",
  ],
  android: [
    "Peze 🔒 (oswa ⚙️) bò kote adrès sit la anlè a",
    "Peze « Otorizasyon » oswa « Paramèt sit »",
    "Mete « Kamera » ak « Mikwo » sou « Pèmèt »",
    "Si sa pa mache: Paramèt telefòn → Aplikasyon → Chrome → Otorizasyon → pèmèt Kamera ak Mikwo",
    "Peze « Eseye ankò »",
  ],
  "ios-app": [
    "Ouvri « Réglages / Settings » iPhone nan",
    "Desann jis nan « Safari », peze l",
    "Nan « Caméra » ak « Micro », chwazi « Demander » oswa « Autoriser »",
    "Fèmen app UpMizik la nèt epi louvri l ankò",
    "Lè iPhone nan mande, peze « Autoriser »",
  ],
  ios: [
    "Peze « aA » bò kote adrès la → « Réglages du site web »",
    "Mete « Caméra » ak « Micro » sou « Autoriser »",
    "Peze « Eseye ankò »",
  ],
  desktop: [
    "Klike sou 🔒 bò kote adrès sit la",
    "Mete « Kamera » ak « Mikwo » sou « Pèmèt »",
    "Rechaje paj la oswa klike « Eseye ankò »",
  ],
};

export function CameraHelp({ error, onRetry, compact }: { error: unknown; onRetry: () => void; compact?: boolean }) {
  const [plat, setPlat] = useState<Platform>("desktop");
  useEffect(() => setPlat(platform()), []);
  const kind = cameraErrorKind(error);

  const title =
    kind === "busy"
      ? "Yon lòt app ap itilize kamera a"
      : kind === "missing"
        ? "Nou pa jwenn kamera oswa mikwo"
        : kind === "insecure"
          ? "Kamera a bezwen yon koneksyon sekirize (https)"
          : "Bay UpMizik otorizasyon pou kamera ak mikwo";

  return (
    <div className={`w-full rounded-2xl bg-zinc-900/95 text-left ring-1 ring-white/10 ${compact ? "p-3" : "p-4"}`}>
      <p className="flex items-center gap-2 font-bold text-white">
        <span className="text-xl">📷</span> {title}
      </p>
      {kind === "busy" ? (
        <p className="mt-2 text-sm text-zinc-300">Fèmen WhatsApp, kamera telefòn nan oswa nenpòt lòt app ki ka ap itilize kamera a, epi eseye ankò.</p>
      ) : kind === "missing" ? (
        <p className="mt-2 text-sm text-zinc-300">Verifye aparèy la gen yon kamera ak yon mikwo ki mache.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-zinc-400">Pou fè live, telefòn nan dwe kite UpMizik itilize kamera a ak mikwo a. Swiv etap sa yo:</p>
          <ol className="mt-3 space-y-1.5 text-sm text-zinc-200">
            {STEPS[plat].map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <button type="button" onClick={onRetry} className="mt-4 w-full rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition active:scale-95">
        📷 Eseye ankò / Aktive kamera a
      </button>
    </div>
  );
}
