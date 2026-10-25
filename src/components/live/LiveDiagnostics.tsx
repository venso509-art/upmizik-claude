"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Track, type Room } from "livekit-client";

// 🔧 Tcheke: tout sa ki nesesè pou pale nan live la, youn pa youn (otorizasyon, koneksyon, dwa sou sèn nan,
// mikwo k ap voye son). Bouton pou ranje chak pwoblèm, ak yon ti mèt pou wè mikwo a ap kapte vwa w.

type Perm = "granted" | "denied" | "prompt" | "unknown";

async function queryPerm(name: "camera" | "microphone"): Promise<Perm> {
  try {
    const r = await navigator.permissions.query({ name: name as PermissionName });
    return r.state as Perm;
  } catch {
    return "unknown"; // Safari/iPhone pa toujou di
  }
}

function Row({ ok, label, value, warn }: { ok: boolean | null; label: string; value: string; warn?: string }) {
  return (
    <li className="rounded-xl bg-white/5 px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-base">{ok === null ? "⏳" : ok ? "✅" : "❌"}</span>
        <span className="flex-1 font-semibold">{label}</span>
        <span className={`text-xs ${ok ? "text-emerald-300" : ok === null ? "text-white/60" : "text-red-300"}`}>{value}</span>
      </div>
      {!ok && ok !== null && warn && <p className="mt-1 pl-7 text-xs text-white/65">{warn}</p>}
    </li>
  );
}

export function LiveDiagnostics({
  room,
  version,
  connState,
  canPublish,
  isHost,
  guestStatus,
  onClose,
  onReconnect,
  onStartMedia,
}: {
  room: Room | null;
  version: number;
  connState: string;
  canPublish: boolean;
  isHost: boolean;
  guestStatus?: string;
  onClose: () => void;
  onReconnect: () => void;
  onStartMedia: () => Promise<void>;
}) {
  const [cam, setCam] = useState<Perm>("unknown");
  const [mic, setMic] = useState<Perm>("unknown");
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  const refresh = useCallback(async () => {
    setCam(await queryPerm("camera"));
    setMic(await queryPerm("microphone"));
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const lp = room?.localParticipant;
  const micPub = lp?.getTrackPublication(Track.Source.Microphone);
  const micLive = !!micPub?.track && !micPub.isMuted;
  const camPub = lp?.getTrackPublication(Track.Source.Camera);
  const camLive = !!camPub?.track && !camPub.isMuted;
  const onStage = isHost || guestStatus === "accepted";

  // Mèt mikwo a: ba a monte lè w pale
  const raf = useRef(0);
  useEffect(() => {
    const track = micPub?.track?.mediaStreamTrack;
    if (!track || !micLive) {
      setLevel(0);
      return;
    }
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const data = new Uint8Array(an.fftSize);
    const tick = () => {
      an.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      setLevel(Math.min(1, peak / 64));
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf.current);
      void ctx.close();
    };
  }, [micPub?.track, micLive]);

  async function fix() {
    setBusy(true);
    setErr(undefined);
    try {
      if (onStage && !canPublish) onReconnect(); // aksepte, men tikè a pa gen dwa pale: rekonekte
      else await onStartMedia();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const permText = (p: Perm) => (p === "granted" ? "Pèmèt" : p === "denied" ? "Bloke" : p === "prompt" ? "Poko mande" : "?");

  return (
    <div className="absolute inset-0 z-[60] flex items-end bg-black/60" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-zinc-900/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] ring-1 ring-white/10 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <p className="text-lg font-bold">🔧 Tcheke mikwo ak kamera</p>
        <p className="mb-3 text-xs text-white/60">Tout liy yo dwe ✅ pou moun yo wè w epi tande w.</p>

        <ul className="space-y-2">
          <Row ok={connState === "connected"} label="Koneksyon live la" value={connState === "connected" ? "Konekte" : connState === "error" ? "Erè" : "Ap konekte…"} warn="Peze « Rekonekte » anba a. Verifye entènèt ou." />
          {!isHost && (
            <Row
              ok={guestStatus === "accepted"}
              label="Sou sèn nan"
              value={guestStatus === "accepted" ? "Aksepte" : guestStatus === "requested" ? "Ap tann" : guestStatus === "invited" ? "Envite" : "Non"}
              warn="Fòk atis la aksepte w (oswa w aksepte envitasyon l) anvan w ka pale."
            />
          )}
          {onStage && (
            <Row ok={canPublish} label="Dwa pou pale / parèt" value={canPublish ? "Wi" : "Poko"} warn="Ou aksepte, men koneksyon an poko ajou. Peze « Ranje sa » pou rekonekte." />
          )}
          <Row
            ok={mic === "denied" ? false : mic === "granted" ? true : micLive ? true : null}
            label="Otorizasyon mikwo"
            value={permText(mic)}
            warn="Telefòn nan bloke mikwo a pou UpMizik. Ale nan Paramèt → Aplikasyon → UpMizik (oswa Chrome) → Otorizasyon → Mikwo → Pèmèt."
          />
          <Row
            ok={cam === "denied" ? false : cam === "granted" ? true : camLive ? true : null}
            label="Otorizasyon kamera"
            value={permText(cam)}
            warn="Ale nan Paramèt → Aplikasyon → UpMizik (oswa Chrome) → Otorizasyon → Kamera → Pèmèt."
          />
          {onStage && (
            <>
              <Row ok={micLive} label="Mikwo ap voye son" value={micLive ? "Wi" : "Non"} warn="Peze « Ranje sa » pou louvri mikwo a." />
              <Row ok={camLive} label="Kamera ap voye imaj" value={camLive ? "Wi" : "Non"} warn="Peze « Ranje sa » pou louvri kamera a." />
            </>
          )}
          <Row ok={room ? room.canPlaybackAudio : null} label="Son live la ap jwe" value={room?.canPlaybackAudio ? "Wi" : "Bloke"} warn="Touche ekran an oswa peze « 🔊 Tape pou tande »." />
        </ul>

        {micLive && (
          <div className="mt-3 rounded-xl bg-white/5 p-3">
            <p className="text-xs text-white/70">🎤 Pale pou teste: ba a dwe monte</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-citron-400 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          </div>
        )}

        {err && <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-xs text-red-200">{err}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onReconnect} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold">
            🔄 Rekonekte
          </button>
          <button type="button" disabled={busy || !onStage} onClick={() => void fix()} className="rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40">
            {busy ? "…" : "🛠 Ranje sa"}
          </button>
        </div>
      </div>
    </div>
  );
}
