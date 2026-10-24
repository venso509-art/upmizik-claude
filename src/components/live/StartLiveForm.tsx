"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Atis Pro a prepare live li: tcheke kamera a, mete yon tit, epi kòmanse
export function StartLiveForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState("");
  const [camError, setCamError] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Apèsi kamera a (navigatè a mande pèmisyon an isit la, anvan live la kòmanse)
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCamError("Navigatè a pa ka louvri kamera a oswa mikwo a. Bay sit la pèmisyon (ikòn 🔒 bò kote adrès la)."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    setBusy(true);
    setError(undefined);
    const { data, error: err } = await createClient().rpc("start_live", { p_title: title.trim() || null });
    if (err || !data) {
      setBusy(false);
      return setError(err?.message ?? "Live la pa kòmanse.");
    }
    router.push(`/live/${data as string}`);
  }

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[16rem] overflow-hidden rounded-3xl bg-zinc-900">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        {camError && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-300">{camError}</p>}
        <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-white">APÈSI</span>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="Tit live la (egz: Repetisyon nouvo single la 🎶)"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
      />
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy || !!camError}
        className="w-full rounded-full bg-red-600 px-6 py-4 text-lg font-black text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 disabled:opacity-50"
      >
        {busy ? "Ap kòmanse…" : "🔴 Kòmanse live la"}
      </button>
      <p className="text-center text-xs text-zinc-500">Tout fanatik UpMizik yo ap resevwa yon notifikasyon. Kado yo: 60% pou ou, 40% pou UpMizik.</p>
    </div>
  );
}
