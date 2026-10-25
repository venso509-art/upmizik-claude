"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CameraHelp } from "./CameraHelp";

// Atis Pro a prepare live li: tcheke kamera a, mete yon tit, epi kòmanse
export function StartLiveForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState("");
  const [camError, setCamError] = useState<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [granted, setGranted] = useState({ cam: false, mic: false });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Apèsi kamera a: telefòn nan mande otorizasyon kamera + mikwo isit la, anvan live la kòmanse
  const openCamera = useCallback(async () => {
    setCamError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no media"), { name: "NotFoundError" });
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true });
      streamRef.current = s;
      setGranted({ cam: s.getVideoTracks().length > 0, mic: s.getAudioTracks().length > 0 });
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      setCamError(e);
    }
  }, []);
  useEffect(() => {
    void openCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [openCamera]);

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
        {/* object-contain: ou wè tout sa kamera a wè, san zoom */}
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-contain" />
        <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-white">APÈSI</span>
      </div>
      {/* Otorizasyon app la: kamera + mikwo */}
      <div className="flex justify-center gap-2 text-xs">
        {[
          { ok: granted.cam, label: "📷 Kamera" },
          { ok: granted.mic, label: "🎤 Mikwo" },
        ].map((x) => (
          <span key={x.label} className={`rounded-full px-3 py-1 font-semibold ${x.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>
            {x.label} {x.ok ? "✓ aktive" : "· poko aktive"}
          </span>
        ))}
      </div>
      {!!camError && <CameraHelp error={camError} onClose={() => setCamError(null)} onRetry={() => void openCamera()} />}
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
