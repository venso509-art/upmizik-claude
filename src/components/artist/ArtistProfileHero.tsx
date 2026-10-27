"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlayer, type Track } from "@/components/player/PlayerProvider";
import { compact, useFollow } from "@/components/FollowButton";
import { DonateModal } from "@/components/donate/DonateModal";
import { LineIcon } from "@/components/LineIcon";
import { shareLink } from "@/lib/share";

// ===== Tèt pwofil atis la: gwo foto wonn + yon liy jòn koube ak ti ikòn wonn sou li =====
// - Òdinatè: liy lan koube sou bò dwat foto a, ikòn yo youn anba lòt (non an parèt lè w pase sourit la).
// - Telefòn: liy lan fè yon ti wonn anba foto a, ikòn yo youn bò lòt ak non yo anba yo.
// Tout pozisyon yo kalkile sou yon kare 100×100 (sant foto a = 50,50), kidonk li rete jis sou tout gwosè ekran.

const ARC_R = 44; // reyon liy lan (foto a = 33)
const DESKTOP = { from: -72, to: 72, icons: [-50, 50] }; // bò dwat
const MOBILE = { from: 18, to: 162, icons: [142, 38] }; // anba (goch → dwat)

const pt = (deg: number, r = ARC_R) => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as const;
};
const arcPath = (from: number, to: number) => {
  const [x1, y1] = pt(from);
  const [x2, y2] = pt(to);
  return `M ${x1} ${y1} A ${ARC_R} ${ARC_R} 0 0 1 ${x2} ${y2}`;
};
// Ang chak ikòn: separe egal ant 2 bout yo
const spread = ([a, b]: number[], n: number, i: number) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1));

type Action = {
  key: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean; // ikòn nan plen jòn (egz: deja abone, mizik la ap jwe)
  badge?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

function Arc({ from, to, className }: { from: number; to: number; className: string }) {
  const [sx, sy] = pt(from);
  const [ex, ey] = pt(to);
  return (
    <svg viewBox="0 0 100 100" className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`} aria-hidden>
      <path
        d={arcPath(from, to)}
        pathLength={1}
        strokeDasharray={1}
        fill="none"
        stroke="#FFD700"
        strokeWidth={0.8}
        strokeLinecap="round"
        className="motion-safe:animate-orbit-draw"
        style={{ filter: "drop-shadow(0 0 2px rgba(255,215,0,0.55))" }}
      />
      {/* Ti boul jòn nan 2 bout liy lan */}
      <circle cx={sx} cy={sy} r={1.6} fill="#FFD700" />
      <circle cx={ex} cy={ey} r={1.6} fill="#FFD700" />
    </svg>
  );
}

const ICONS = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-[18px] w-[18px]" aria-hidden>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1.2" />
      <rect x="14" y="4" width="4" height="16" rx="1.2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]" aria-hidden>
      <path d="M21.4 2.6a1 1 0 0 0-1.05-.23l-17 6.5a1 1 0 0 0 .02 1.88l7.06 2.5 2.5 7.06a1 1 0 0 0 1.88.02l6.5-17a1 1 0 0 0-.23-1.05zM11.2 12.8 6.6 11.2l10.1-3.86z" />
    </svg>
  ),
};

export function ArtistProfileHero({
  photo,
  artistId,
  artistName,
  tracks,
  pro,
  userId,
  initialFollowing,
  initialCount,
  liveId,
  share,
}: {
  photo: React.ReactNode;
  artistId: string;
  artistName: string;
  tracks: Track[]; // chante yo nan lòd pou "Koute" (popilè yo an premye)
  pro: boolean; // "Abone" se pou atis Pro sèlman
  userId: string | null;
  initialFollowing: boolean;
  initialCount: number;
  liveId?: string | null;
  share: { path: string; title: string; text: string };
}) {
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  const follow = useFollow(artistId, userId, initialFollowing, initialCount);
  const [donateOpen, setDonateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = userId === artistId;
  const playingThis = isPlaying && tracks.some((t) => t.id === current?.id);

  const actions: Action[] = [];
  if (tracks.length > 0) {
    actions.push({
      key: "play",
      label: playingThis ? "Poz" : "Koute",
      icon: playingThis ? ICONS.pause : ICONS.play,
      active: playingThis,
      onClick: () => (playingThis ? toggle() : playTrack(tracks[0], tracks)),
    });
  }
  if (pro) {
    const count = compact(follow.count);
    actions.push(
      isOwner
        ? { key: "follow", label: `${count} abone`, icon: <LineIcon name="user" />, badge: count, disabled: true }
        : !userId
          ? { key: "follow", label: "Abone", icon: <LineIcon name="user" />, badge: count, href: "/konekte" }
          : {
              key: "follow",
              label: follow.error ?? (follow.following ? "Abone ✓" : "Abone"),
              icon: follow.following ? ICONS.check : <LineIcon name="user" />,
              active: follow.following,
              badge: count,
              onClick: follow.pending ? undefined : follow.toggle,
            },
    );
  }
  actions.push({ key: "gift", label: "Voye kado", icon: <LineIcon name="gift" />, onClick: () => setDonateOpen(true) });
  actions.push({
    key: "share",
    label: copied ? "Lyen kopye ✓" : "Pataje",
    icon: ICONS.send,
    onClick: async () => {
      if ((await shareLink(share.path, share.title, share.text)) === "copied") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
  });
  if (liveId) actions.push({ key: "live", label: "Gade live la", icon: <LineIcon name="live" />, href: `/live/${liveId}`, active: true });

  const n = actions.length;

  return (
    <div className="relative mx-auto h-[18rem] w-[18rem] shrink-0 sm:mx-0 sm:h-[21rem] sm:w-[21rem] lg:h-[24rem] lg:w-[24rem]">
      {/* Gwo foto a nan mitan */}
      <div className="absolute inset-0 flex items-center justify-center">{photo}</div>

      <Arc from={DESKTOP.from} to={DESKTOP.to} className="hidden sm:block" />
      <Arc from={MOBILE.from} to={MOBILE.to} className="sm:hidden" />

      {actions.map((a, i) => {
        const [dx, dy] = pt(spread(DESKTOP.icons, n, i));
        const [mx, my] = pt(spread(MOBILE.icons, n, i));
        const cls = `group relative flex h-10 w-10 items-center justify-center rounded-full ring-2 transition duration-300 sm:h-11 sm:w-11 ${
          a.active
            ? "bg-[#FFD700] text-[#0B132B] ring-[#FFD700] shadow-[0_0_18px_rgba(255,215,0,0.55)]"
            : "bg-[#0B0F1A] text-[#FFD700] ring-[#FFD700]/30 shadow-lg shadow-black/50"
        } ${a.disabled ? "cursor-default" : "hover:-rotate-6 hover:scale-[1.15] hover:bg-[#FFD700] hover:text-[#0B132B] hover:ring-[#FFD700] hover:shadow-[0_0_22px_rgba(255,215,0,0.65)] focus-visible:outline-none focus-visible:ring-[#FFD700] active:scale-95"}`;
        const inner = (
          <>
            {a.icon}
            {a.badge && (
              <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full bg-[#FFD700] px-1 text-center text-[9px] font-black leading-[1.1rem] text-[#0B132B] ring-2 ring-[#0B0F1A]">
                {a.badge}
              </span>
            )}
            {/* Non aksyon an: anba ikòn nan sou telefòn; yon ti etikèt ki parèt adwat lè w pase sourit la sou òdinatè */}
            <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-zinc-200 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] sm:left-full sm:top-1/2 sm:ml-3 sm:mt-0 sm:-translate-x-2 sm:-translate-y-1/2 sm:rounded-full sm:bg-[#0B0F1A] sm:px-3 sm:py-1.5 sm:text-xs sm:text-[#FFD700] sm:opacity-0 sm:ring-1 sm:ring-[#FFD700]/30 sm:transition sm:duration-200 sm:[text-shadow:none] sm:group-hover:translate-x-0 sm:group-hover:opacity-100 sm:group-focus-visible:translate-x-0 sm:group-focus-visible:opacity-100">
              {a.label}
            </span>
          </>
        );
        return (
          <div
            key={a.key}
            className="absolute left-[var(--mx)] top-[var(--my)] z-10 -translate-x-1/2 -translate-y-1/2 sm:left-[var(--dx)] sm:top-[var(--dy)]"
            style={{ "--dx": `${dx}%`, "--dy": `${dy}%`, "--mx": `${mx}%`, "--my": `${my}%` } as React.CSSProperties}
          >
            <div className="motion-safe:animate-orbit-pop" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
              {a.href ? (
                <Link href={a.href} className={cls} aria-label={a.label}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={a.onClick} disabled={a.disabled} className={cls} aria-label={a.label} aria-pressed={a.key === "follow" && !a.disabled ? !!a.active : undefined}>
                  {inner}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Ti eklat lè moun nan fèk abone */}
      {follow.pop && (
        <span className="pointer-events-none absolute right-0 top-1/2 text-2xl motion-safe:animate-heart-float" aria-hidden>
          🎉
        </span>
      )}

      {/* Fenèt kado a (li louvri nan yon Portal, anlè tout paj la) */}
      {donateOpen && <DonateModal artistId={artistId} artistName={artistName} songId={null} songTitle={null} onClose={() => setDonateOpen(false)} />}
    </div>
  );
}
