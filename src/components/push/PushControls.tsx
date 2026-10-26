"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LineIcon } from "@/components/LineIcon";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/pushClient";

const DISMISS_KEY = "upmizik-push-later";
const DELAY_MS = 25_000;

// Ti kat ki mande moun ki konekte a aktive notifikasyon yo (menm stil ak notifikasyon yo: blan + kare jòn).
// Li parèt apre 25 segonn, sèlman si navigatè a kapab, epi pa plis pase yon fwa chak 7 jou si moun nan di "Pita".
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const later = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (Date.now() - later < 7 * 86400000) return;
      } catch {}
      const { data } = await createClient().auth.getSession();
      if (!data.session) return;
      if ((await pushState()) === "off") setShow(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  function later() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  }

  async function activate() {
    setBusy(true);
    setError(undefined);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) setShow(false);
    else setError(res.error);
  }

  return (
    <div className="fixed inset-x-3 top-[calc(4.75rem+env(safe-area-inset-top))] z-[84] flex justify-center sm:inset-x-auto sm:right-4 sm:w-[24rem]" role="dialog" aria-label="Aktive notifikasyon">
      <div className="w-full rounded-[1.25rem] bg-[#FFFFFF] p-3.5 shadow-[0_18px_45px_-12px_rgba(11,19,43,0.55),0_4px_14px_rgba(11,19,43,0.18)] ring-1 ring-[#0B132B]/5 motion-safe:animate-toast-drop">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-[#0B132B]" aria-hidden>
            <LineIcon name="bell" className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold leading-tight text-[#0B132B]">Pa rate anyen sou UpMizik</span>
            <span className="mt-1 block text-[13px] leading-snug text-[#64708A]">Resevwa nouvo mizik, live, like ak don sou telefòn ou, menm lè sit la fèmen.</span>
          </span>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={later} className="flex-1 rounded-full bg-[#F1F3F8] px-4 py-2.5 text-sm font-semibold text-[#3B4766]">
            Pita
          </button>
          <button type="button" disabled={busy} onClick={() => void activate()} className="flex-1 rounded-full bg-[#FFD700] px-4 py-2.5 text-sm font-black text-[#0B132B] disabled:opacity-60">
            {busy ? "…" : "🔔 Aktive"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bouton paramèt (paj Mesaj yo): aktive / dezaktive notifikasyon sou aparèy sa a
export function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void pushState().then(setState);
  }, []);

  if (!state || state === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    setError(undefined);
    if (state === "on") {
      await disablePush();
      setState("off");
    } else {
      const res = await enablePush();
      if (res.ok) setState("on");
      else setError(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/10">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD700] text-[#0B132B]" aria-hidden>
        <LineIcon name="bell" className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">Notifikasyon sou telefòn sa a</span>
        <span className="block text-sm text-zinc-400">
          {state === "on"
            ? "✓ Aktive: ou resevwa yo menm lè sit la fèmen."
            : state === "denied"
              ? "Bloke: ale nan paramèt telefòn nan → UpMizik (oswa Chrome) → Notifikasyon → Pèmèt."
              : state === "ios-install"
                ? "Sou iPhone: enstale app UpMizik la sou ekran akèy la anvan (Pataje → Ajoute sou ekran akèy)."
                : "Resevwa nouvo mizik, live, like ak don menm lè sit la fèmen."}
        </span>
        {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
      </span>
      {(state === "on" || state === "off") && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className={`rounded-full px-4 py-2 text-sm font-black disabled:opacity-60 ${state === "on" ? "bg-white/10 text-white" : "bg-[#FFD700] text-[#0B132B]"}`}
        >
          {busy ? "…" : state === "on" ? "Dezaktive" : "🔔 Aktive"}
        </button>
      )}
    </div>
  );
}
