"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OFFLINE_EVENT, listOffline, offlineObjectUrl } from "@/lib/offline";

export type Track = {
  id: string;
  title: string;
  genre: string | null;
  artistId: string;
  artistName: string;
  coverUrl: string | null;
  audioUrl: string;
  durationSeconds: number | null;
};

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
};

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer dwe itilize andedan <PlayerProvider>");
  return ctx;
}

// Yon ekout "reyèl" = omwen 5 segonn koute vre
const REAL_PLAY_SECONDS = 5;

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

  const index = current ? queue.findIndex((t) => t.id === current.id) : -1;
  const hasNext = index >= 0 && index < queue.length - 1;
  const hasPrev = index > 0;

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
      setQueue(newQueue ?? [track]);
      load(track);
    },
    [current, load],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback(() => {
    if (hasNext) load(queue[index + 1]);
  }, [hasNext, index, queue, load]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    // Apre 3 segonn, ⏮ rekòmanse chante a olye ale nan sa ki anvan an
    if (audio && audio.currentTime > 3) audio.currentTime = 0;
    else if (hasPrev) load(queue[index - 1]);
    else if (audio) audio.currentTime = 0;
  }, [hasPrev, index, queue, load]);

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
      play.playId.then((id) => {
        if (id) createClient().rpc("confirm_play", { p_play_id: id }).then(() => {});
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
        onEnded={() => (hasNext ? next() : setIsPlaying(false))}
        onError={() => {
          setIsLoading(false);
          setIsPlaying(false);
          if (current) setError("Pa ka jwe chante sa a. Tcheke koneksyon ou.");
        }}
      />
    </PlayerContext.Provider>
  );
}
