"use client";

import { useEffect } from "react";

// Anrejistre Service Worker la (public/sw.js) depi sit la louvri
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si l echwe (pa egzanp navigatè prive), sit la mache kanmenm, jis san mòd offline
      });
    }
  }, []);
  return null;
}
