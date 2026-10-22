"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SongExtras } from "@/lib/songs";
import { DonateButton } from "@/components/donate/DonateButton";
import { recordShare, shareLink } from "@/lib/share";
import { DownloadButton } from "@/components/offline/DownloadButton";
import type { Track } from "@/components/player/PlayerProvider";

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"
      />
    </svg>
  );
}

const btn =
  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white";

export function SongActions({
  songId,
  title,
  artistId,
  artistName,
  extras,
  currentUserId,
  size = "sm",
  track,
  variant = "full",
  plays,
  compact = false,
}: {
  songId: string;
  title: string;
  artistId: string;
  artistName: string;
  extras: SongExtras;
  currentUserId: string | null;
  size?: "sm" | "lg";
  track?: Track; // si li la: bouton 📥 pou sove mizik la offline
  variant?: "full" | "podium"; // podium = Top 3 (ekout, like, kòmante, don)
  plays?: number;
  compact?: boolean; // kat Top 3 etwat sou telefòn (#2, #3)
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(extras.liked);
  const [likeCount, setLikeCount] = useState(extras.likeCount);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(extras.shareCount ?? 0);
  const cls = size === "lg" ? `${btn} px-3 py-2 text-sm` : btn;

  async function toggleLike() {
    if (!currentUserId) return router.push("/konekte");
    if (busy) return;
    setBusy(true);
    // Chanje chif la touswit, epi anile si Supabase refize
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("song_likes").insert({ song_id: songId, user_id: currentUserId })
      : await supabase.from("song_likes").delete().eq("song_id", songId).eq("user_id", currentUserId);
    if (error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  // Pataje chante a, epi ogmante kontè pataj la (yon fwa pa moun, pa sesyon)
  async function share() {
    const res = await shareLink(`/chante/${songId}`, title, `Koute « ${title} » pa ${artistName} sou UpMizik 🎶`);
    if (!res) return;
    if (res === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    const total = await recordShare("song", songId);
    if (total !== null) setShareCount(total);
  }

  // TOP 3: sèlman ekout, like, kòmante, ak bouton don an k ap bat tankou yon kè
  if (variant === "podium") {
    const size = compact ? "gap-1 px-2 py-1 text-xs md:gap-1.5 md:px-3 md:py-1.5 md:text-sm" : "gap-1.5 px-3 py-1.5 text-sm";
    const pill = `inline-flex items-center rounded-full bg-zinc-800/80 font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-white ${size}`;
    return (
      <div className={`flex flex-wrap items-center justify-center md:justify-start ${compact ? "gap-1 md:gap-2" : "gap-2"}`}>
        {typeof plays === "number" && (
          <span className={`inline-flex items-center gap-1 px-1 font-semibold tabular-nums text-zinc-300 ${compact ? "text-xs md:text-sm" : "text-sm"}`} title={`${plays.toLocaleString("fr-HT")} ekout`}>
            🎧 {plays.toLocaleString("fr-HT")}
          </span>
        )}
        <button
          type="button"
          onClick={toggleLike}
          className={`${pill} ${liked ? "bg-red-500/15 text-red-300 ring-1 ring-red-400/40" : ""}`}
          aria-pressed={liked}
          aria-label={liked ? "Retire like" : "Like"}
        >
          {liked ? "❤️" : "🤍"} <span className="tabular-nums">{likeCount}</span>
        </button>
        <Link href={`/chante/${songId}#komante`} className={pill} aria-label="Kòmante">
          💬 <span className="tabular-nums">{extras.commentCount}</span>
        </Link>
        <span className="relative inline-flex">
          {/* Sèk limyè ki gaye pou atire je moun nan */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-citron-400 motion-safe:animate-donate-glow" aria-hidden />
          <DonateButton
            artistId={artistId}
            artistName={artistName}
            songId={songId}
            songTitle={title}
            label="Sipòte"
            className={`btn-primary relative inline-flex items-center rounded-full motion-safe:animate-heartbeat ${compact ? "gap-1 px-2.5 py-1 text-xs md:gap-1.5 md:px-3.5 md:py-1.5 md:text-sm" : "gap-1.5 px-3.5 py-1.5 text-sm"}`}
          />
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <button type="button" onClick={toggleLike} className={`${cls} ${liked ? "text-fuchsia-400" : ""}`} aria-pressed={liked} aria-label={liked ? "Retire like" : "Like"}>
        {liked ? "❤️" : "🤍"} <span className="tabular-nums">{likeCount}</span>
      </button>
      <Link href={`/chante/${songId}#komante`} className={cls} aria-label="Kòmante">
        💬 <span className="tabular-nums">{extras.commentCount}</span>
      </Link>
      <button type="button" onClick={share} className={cls} aria-label={`Pataje (${shareCount} pataj)`}>
        🔗 {copied ? "Kopye!" : shareCount > 0 ? <span className="tabular-nums">{shareCount}</span> : size === "lg" ? "Pataje" : ""}
      </button>
      {track && <DownloadButton track={track} currentUserId={currentUserId} className={cls} showLabel={size === "lg"} />}
      <DonateButton
        artistId={artistId}
        artistName={artistName}
        songId={songId}
        songTitle={title}
        className={`${cls} hover:text-fuchsia-300`}
        label={size === "lg" ? "Don" : undefined}
      />
      {extras.youtubeUrl && (
        <a
          href={extras.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${cls} hover:text-red-500`}
          aria-label="Gade sou YouTube"
        >
          <YouTubeIcon /> {size === "lg" && "YouTube"}
        </a>
      )}
    </div>
  );
}
