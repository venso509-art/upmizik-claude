"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OFFLINE_EVENT, listOffline, offlineObjectUrl } from "@/lib/offline";

export type Track = {
  id: string;
  title: string;
  genre: string | null;
  artistId: string;
  artistName: string;
  artistVerified?: boolean;
  coverUrl: string | null;
  audioUrl: string;
  durationSeconds: number | null;
  playCount?: number; // kantite ekout (pou kat yo)
  boosted?: boolean; // 🔥 atis la peye pou chante a parèt an premye
};

// Fason lis la jwe: "off" = youn apre lòt epi kanpe; "all" = tout lis la an bouk; "one" = menm chante a an bouk
export type RepeatMode = "off" | "all" | "one";
const MODE_KEY = "upmizik-player-mode";

type PlayerState = {
  current: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  hasNext: boolean;
  hasPrev: boolean;
  playTrack: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  repeatMode: RepeatMode;
  cycleRepeat: () => void; // off → all → one → off
  shuffle: boolean;
  toggleShuffle: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer dwe itilize andedan <PlayerProvider>");
  return ctx;
}

// Yon ekout "reyèl" = omwen 5 segonn koute vre
const REAL_PLAY_SECONDS = 5;

// ID sesyon navigatè a (pou streams yo): menm onglè = menm sesyon, kidonk yon chante konte yon fwa
function streamSessionId(): string | null {
  try {
    let id = sessionStorage.getItem("upmizik-stream-session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("upmizik-stream-session", id);
    }
    return id;
  } catch {
    return null;
  }
}

type PlaySession = {
  trackId: string | null;
  playId: Promise<string | null> | null; // ID start_play la retounen
  listened: number; // segonn koute vre
  lastTime: number;
  confirmed: boolean;
};

function newSession(trackId: string | null): PlaySession {
  return { trackId, playId: null, listened: 0, lastTime: 0, confirmed: false };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRef = useRef<PlaySession>(newSession(null));
  // URL odyo → URL lokal (blob:) pou mizik ki sove offline. Prepare davans pou play() rele touswit
  // lè moun nan klike (Safari refize jwe si nou tann yon operasyon async anvan).
  const offlineUrls = useRef(new Map<string, string>());

  useEffect(() => {
    async function refresh() {
      const songs = await listOffline();
      const next = new Map<string, string>();
      for (const s of songs) {
        const url = offlineUrls.current.get(s.audioUrl) ?? (await offlineObjectUrl(s.audioUrl));
        if (url) next.set(s.audioUrl, url);
      }
      // Libere URL mizik ki pa sove ankò yo
      offlineUrls.current.forEach((url, key) => !next.has(key) && URL.revokeObjectURL(url));
      offlineUrls.current = next;
    }
    refresh();
    window.addEventListener(OFFLINE_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_EVENT, refresh);
  }, []);
  const [queue, setQueue] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [shuffledIds, setShuffledIds] = useState<string[]>([]);

  // Sonje chwa moun nan (bouk / melanje) sou aparèy la
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODE_KEY) ?? "{}") as { repeat?: RepeatMode; shuffle?: boolean };
      if (saved.repeat === "all" || saved.repeat === "one") setRepeatMode(saved.repeat);
      if (saved.shuffle) setShuffle(true);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, JSON.stringify({ repeat: repeatMode, shuffle }));
    } catch {}
  }, [repeatMode, shuffle]);

  // Melanje lis la: chante k ap jwe a rete premye, rès yo nan yon lòd o aza
  const reshuffle = useCallback((list: Track[], firstId: string | null) => {
    const rest = list.map((t) => t.id).filter((id) => id !== firstId);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    setShuffledIds(firstId ? [firstId, ...rest] : rest);
  }, []);

  // Lòd jwe a (lis la jan l ye a, oswa melanje)
  const order = useMemo(() => (shuffle && shuffledIds.length === queue.length ? shuffledIds : queue.map((t) => t.id)), [shuffle, shuffledIds, queue]);
  const byId = useMemo(() => new Map(queue.map((t) => [t.id, t])), [queue]);
  const pos = current ? order.indexOf(current.id) : -1;
  const nextTrack = pos < 0 ? null : (byId.get(order[pos + 1]) ?? (repeatMode === "all" && order.length > 0 ? byId.get(order[0]) : undefined)) ?? null;
  const prevTrack = pos < 0 ? null : (byId.get(order[pos - 1]) ?? (repeatMode === "all" && order.length > 0 ? byId.get(order[order.length - 1]) : undefined)) ?? null;
  const hasNext = !!nextTrack;
  const hasPrev = !!prevTrack;

  const load = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(track);
    playRef.current = newSession(track.id);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    // Si mizik la sove offline, jwe kopi lokal la (mache san entènèt, ekonomize done)
    audio.src = offlineUrls.current.get(track.audioUrl) ?? track.audioUrl;
    audio.play().catch(() => {
      // Navigatè a ka bloke "autoplay"; itilizatè a ap jis peze ▶
    });
  }, []);

  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      // Klike sou chante k ap jwe a = poz/jwe
      if (current?.id === track.id) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      const list = newQueue ?? [track];
      setQueue(list);
      if (shuffle) reshuffle(list, track.id);
      load(track);
    },
    [current, load, shuffle, reshuffle],
  );

  const cycleRepeat = useCallback(() => setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off")), []);
  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      if (!on) reshuffle(queue, current?.id ?? null);
      return !on;
    });
  }, [queue, current, reshuffle]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback(() => {
    if (nextTrack) load(nextTrack);
  }, [nextTrack, load]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // Apre 3 segonn, ⏮ rekòmanse chante a olye ale nan sa ki anvan an
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else if (prevTrack) load(prevTrack);
    else if (audio) audio.currentTime = 0;
  }, [prevTrack, load]);

  // Fen yon chante: menm chante a ankò ("one"), pwochen an (oswa retounen nan kòmansman an ak "all"), oswa kanpe
  function handleEnded() {
    const audio = audioRef.current;
    if (repeatMode === "one" && audio && current) {
      playRef.current = newSession(current.id); // chak tou konte kòm yon nouvo ekout
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    if (nextTrack) load(nextTrack);
    else setIsPlaying(false);
  }

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v;
    setVolumeState(v);
  }, []);

  // ===== Anrejistre ekout yo =====
  // 1) Premye fwa yon chante kòmanse jwe → start_play
  // 2) Lè moun nan koute 5 segonn vre (sote nan chante a pa konte) → confirm_play
  function handlePlay() {
    setIsPlaying(true);
    // Nou itilize playRef (pa "current"): onPlay ka rive anvan React fin mete current ajou
    const play = playRef.current;
    if (!play.trackId || play.playId) return;
    play.playId = Promise.resolve(createClient().rpc("start_play", { p_song_id: play.trackId })).then(
      ({ data }) => (data as string | null) ?? null,
      () => null,
    );
  }

  function handleTimeUpdate(audio: HTMLAudioElement) {
    setCurrentTime(audio.currentTime);
    const play = playRef.current;
    const delta = audio.currentTime - play.lastTime;
    play.lastTime = audio.currentTime;
    if (audio.paused || delta <= 0 || delta > 1.5) return; // yon "seek" pa konte kòm tan koute
    play.listened += delta;
    if (play.listened >= REAL_PLAY_SECONDS && !play.confirmed && play.playId) {
      play.confirmed = true;
      play.playId.then(async (id) => {
        if (!id) return;
        const supabase = createClient();
        await supabase.rpc("confirm_play", { p_play_id: id });
        // Stream: +1 pou NENPÒT moun (menm san kont), yon sèl fwa pa sesyon pou chak chante
        const session = streamSessionId();
        if (session) await supabase.rpc("record_stream", { p_play_id: id, p_session: session });
      });
    }
  }

  // Kontwòl sou ekran verouye telefòn nan ak bouton ekoutè yo
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: "UpMizik",
      artwork: current.coverUrl ? [{ src: current.coverUrl, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", hasNext ? next : null);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, toggle, next, prev, hasNext]);

  return (
    <PlayerContext.Provider
      value={{
        current,
        isPlaying,
        isLoading,
        error,
        currentTime,
        duration,
        volume,
        hasNext,
        hasPrev,
        playTrack,
        toggle,
        next,
        prev,
        seek,
        setVolume,
        repeatMode,
        cycleRepeat,
        shuffle,
        toggleShuffle,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={handlePlay}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={handleEnded}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          if (current) setError("Pa ka jwe chante sa a. Tcheke koneksyon ou.");
        }}
      />
    </PlayerContext.Provider>
  );
}
