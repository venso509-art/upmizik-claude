"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Track = {
  id: string;
  title: string;
  genre: string | null;
  artistName: string;
  coverUrl: string | null;
  audioUrl: string;
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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const countedRef = useRef<string | null>(null);
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
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    audio.src = track.audioUrl;
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

  // Konte yon koute (yon sèl fwa chak fwa yon chante kòmanse)
  useEffect(() => {
    if (!isPlaying || !current || countedRef.current === current.id) return;
    countedRef.current = current.id;
    createClient()
      .rpc("increment_play_count", { song_id: current.id })
      .then(() => {});
  }, [isPlaying, current]);

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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
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
