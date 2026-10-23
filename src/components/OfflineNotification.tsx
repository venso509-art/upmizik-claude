"use client";

import { useEffect, useRef, useState } from "react";
import { NETWORK_ERROR_EVENT, isNetworkError, pingServer } from "@/lib/network";

type Status = "ok" | "offline" | "back";

const POLL_MS = 4000; // pandan entènèt la koupe: tcheke chak 4 segonn si l tounen
const BACK_MS = 3000; // mesaj vèt "Ou rekonekte!" la rete 3 segonn

// Bouton ki pa bezwen entènèt: fèmen yon fenèt, louvri yon meni...
function worksOffline(el: Element) {
  if (el.closest("[data-offline-ok]")) return true;
  const link = el.closest("a[href]");
  if (link) {
    const href = link.getAttribute("href") ?? "";
    // Mizik offline yo (/telechaje) ak lyen # nan menm paj la mache san entènèt
    return href.startsWith("#") || href.startsWith("/telechaje");
  }
  const button = el.closest("button, [role=button]");
  if (!button) return true; // tèks, imaj... pa gen anyen pou bloke
  if (button.hasAttribute("aria-expanded")) return true;
  const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim();
  return /^✕$|fèmen|close|meni|menu|pita|anile/i.test(label);
}

// Ti bwat anlè ekran an lè entènèt la koupe oswa fèb (olye gwo paj erè teknik la).
// Paj la rete jan l te ye a, men klik ki bezwen entènèt yo bloke jiskaske koneksyon an tounen.
export function OfflineNotification() {
  const [status, setStatus] = useState<Status>("ok");
  const [nudge, setNudge] = useState(0); // fè bwat la souke lè moun nan klike sou yon bagay ki bloke
  const statusRef = useRef<Status>("ok");
  const brokenPage = useRef(false); // yon paj pa t ka chaje: rechaje l lè entènèt la tounen

  useEffect(() => {
    statusRef.current = status;
    document.documentElement.classList.toggle("up-offline", status === "offline");
  }, [status]);

  // Detekte koupi yo
  useEffect(() => {
    const goOffline = () => setStatus("offline");
    const onOnline = async () => {
      // navigator.onLine ka di "wi" twò bonè: n ap tann sèvè a reponn vre
      if (statusRef.current === "offline" && (await pingServer())) setStatus("back");
    };
    const onError = (e: ErrorEvent) => {
      if (isNetworkError(e.error ?? e.message)) goOffline();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isNetworkError(e.reason)) goOffline();
    };
    const onBrokenPage = () => {
      brokenPage.current = true;
      goOffline();
    };

    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener(NETWORK_ERROR_EVENT, onBrokenPage);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener(NETWORK_ERROR_EVENT, onBrokenPage);
    };
  }, []);

  // Pandan koupi a: tcheke regilyèman si sèvè a reponn ankò (pou entènèt fèb tou)
  useEffect(() => {
    if (status !== "offline") return;
    const t = setInterval(async () => {
      if (navigator.onLine && (await pingServer())) setStatus("back");
    }, POLL_MS);
    return () => clearInterval(t);
  }, [status]);

  // "Ou rekonekte!" disparèt pou kont li (epi paj ki te kraze a rechaje)
  useEffect(() => {
    if (status !== "back") return;
    const t = setTimeout(() => {
      if (brokenPage.current) window.location.reload();
      else setStatus("ok");
    }, brokenPage.current ? 1200 : BACK_MS);
    return () => clearTimeout(t);
  }, [status]);

  // Bloke klik ak fòm ki bezwen entènèt pandan koupi a
  useEffect(() => {
    if (status !== "offline") return;
    const block = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest("[data-offline-toast]")) return;
      if (e.type === "click" && worksOffline(target)) return;
      e.preventDefault();
      e.stopPropagation();
      setNudge((n) => n + 1);
    };
    document.addEventListener("click", block, true);
    document.addEventListener("submit", block, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("submit", block, true);
    };
  }, [status]);

  if (status === "ok") return null;

  const offline = status === "offline";
  return (
    <div
      data-offline-toast
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[95] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        key={nudge}
        className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md motion-safe:animate-fade-up ${
          nudge > 0 && offline ? "motion-safe:animate-shake" : ""
        } ${offline ? "border-amber-400/40 bg-zinc-900/95 text-zinc-100" : "border-emerald-400/50 bg-emerald-600/95 text-white"}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${offline ? "bg-amber-400/15" : "bg-white/20"}`}
          aria-hidden
        >
          {offline ? "📡" : "✅"}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          {offline ? (
            <>
              <p className="font-semibold">Entènèt ou a fèb oswa li koupe.</p>
              <p className="text-zinc-400">{nudge > 0 ? "Aksyon sa a bezwen entènèt. Tanpri tann yon ti moman." : "Tanpri tann yon ti moman."}</p>
            </>
          ) : (
            <p className="font-semibold">Ou rekonekte!</p>
          )}
        </div>
        {offline && <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-400" aria-hidden />}
      </div>
    </div>
  );
}
