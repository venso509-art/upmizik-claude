"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Portal } from "@/components/Portal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { usePlayer } from "@/components/player/PlayerProvider";
import { StatusOverlayLayer } from "@/components/status/StatusOverlayLayer";
import { timeAgo } from "@/lib/posts";
import { QUICK_REACTIONS, STATUS_SECONDS, loadArtistStatuses, markSeen, statusMediaUrl, type ArtistStatus } from "@/lib/statuses";

export type StatusArtist = { id: string; name: string; avatarUrl: string | null; verified?: boolean };

// Ekran stati a (plen ekran, tankou WhatsApp): ba pwogrè anlè, tape adwat/agoch pou chanje, kenbe pou pran poz.
// Anba a: like ❤️, repons rapid (emoji) ak yon ti mesaj ki ale bay atis la sèlman.
export function StatusViewer({ artist, onClose }: { artist: StatusArtist; onClose: () => void }) {
  const { isPlaying, toggle } = usePlayer();
  const [statuses, setStatuses] = useState<ArtistStatus[] | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 → 1 pou stati aktyèl la
  const [held, setHeld] = useState(false); // dwèt la ap kenbe ekran an
  const [typing, setTyping] = useState(false); // moun nan ap ekri yon repons
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<string>();
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const pausedMusic = useRef(false);
  const pressedAt = useRef(0); // pou fè diferans ant yon ti tape ak "kenbe pou poz"
  const supabase = useRef(createClient()).current;
  const paused = held || typing;

  // Chaje stati yo + moun ki konekte a + like li yo
  useEffect(() => {
    void (async () => {
      const [list, { data }] = await Promise.all([loadArtistStatuses(supabase, artist.id), supabase.auth.getSession()]);
      setStatuses(list);
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid && list.length) {
        const { data: mine } = await supabase.from("status_likes").select("status_id").eq("user_id", uid).in("status_id", list.map((s) => s.id));
        setLiked(new Set(((mine ?? []) as { status_id: string }[]).map((l) => l.status_id)));
      }
    })();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [artist.id, supabase]);

  // Mete mizik k ap jwe a an poz pandan moun nan ap gade (tankou WhatsApp)
  useEffect(() => {
    if (isPlaying && !pausedMusic.current) {
      pausedMusic.current = true;
      toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    onClose();
    if (pausedMusic.current) toggle(); // relanse mizik la
  }, [onClose, toggle]);

  const current = statuses?.[index] ?? null;
  const next = useCallback(() => {
    if (!statuses) return;
    if (index + 1 < statuses.length) {
      setIndex(index + 1);
      setProgress(0);
    } else close();
  }, [index, statuses, close]);
  const prev = () => {
    setIndex((i) => Math.max(0, i - 1));
    setProgress(0);
  };

  // Make stati a "wè"
  useEffect(() => {
    if (current) markSeen([current.id]);
  }, [current]);

  // Tèks / foto: revèy 10 segonn. Videyo / odyo: swiv tan fichye a.
  useEffect(() => {
    if (!current || paused) return;
    if (current.kind === "video" || current.kind === "audio") return;
    const start = Date.now() - progress * STATUS_SECONDS * 1000;
    const t = setInterval(() => {
      const p = (Date.now() - start) / (STATUS_SECONDS * 1000);
      if (p >= 1) {
        clearInterval(t);
        next();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, next]);

  useEffect(() => {
    const m = mediaRef.current;
    if (!m) return;
    if (paused) m.pause();
    else void m.play().catch(() => {});
  }, [paused, current]);

  // Klavye (òdinatè): flèch yo ak Escape (pa pandan moun nan ap ekri)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, next, typing]);

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(undefined), 1800);
  }

  async function toggleLike() {
    if (!current || !userId) return;
    const isLiked = liked.has(current.id);
    const nextSet = new Set(liked);
    if (isLiked) nextSet.delete(current.id);
    else nextSet.add(current.id);
    setLiked(nextSet);
    const { error } = isLiked
      ? await supabase.from("status_likes").delete().eq("status_id", current.id).eq("user_id", userId)
      : await supabase.from("status_likes").insert({ status_id: current.id, user_id: userId });
    if (error) {
      setLiked(liked);
      flash("Like la pa pase. Eseye ankò.");
    }
  }

  async function sendReply(body: string) {
    const text = body.trim();
    if (!current || !userId || !text) return;
    const { error } = await supabase.from("status_replies").insert({ status_id: current.id, user_id: userId, body: text.slice(0, 300) });
    if (error) return flash(error.message.includes("Twòp") ? "Twòp repons. Tann yon ti moman." : "Repons lan pa pase. Eseye ankò.");
    setReply("");
    setTyping(false);
    flash(`✓ Voye bay ${artist.name}`);
  }

  const url = current ? statusMediaUrl(supabase, current.media_path) : null;
  const isOwner = userId === artist.id;
  const items = current?.overlay?.items ?? [];
  const trimStart = current?.trim_start ?? 0;
  const trimEnd = current?.trim_end ?? null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black sm:bg-black/90" role="dialog" aria-modal="true" aria-label={`Stati ${artist.name}`}>
        <div
          className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-zinc-950 sm:h-[92vh] sm:rounded-3xl"
          style={current?.kind === "text" ? { background: current.bg ?? "#0A5C36" } : undefined}
        >
          {/* Ba pwogrè yo */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            {(statuses ?? [null]).map((s, i) => (
              <span key={s?.id ?? i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full bg-white" style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>

          {/* Tèt: atis la */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <Link href={`/atis/${artist.id}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/70">
                {artist.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-bold text-white">{artist.name.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center text-sm font-semibold text-white">
                  <span className="truncate">{artist.name}</span>
                  {artist.verified && <VerifiedBadge />}
                </span>
                {current && <span className="block text-xs text-white/70">{timeAgo(current.created_at)}</span>}
              </span>
            </Link>
            {(current?.kind === "video" || current?.kind === "audio") && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white"
                aria-label={muted ? "Mete son an" : "Koupe son an"}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            )}
            <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-lg text-white" aria-label="Fèmen">
              ✕
            </button>
          </div>

          {/* Kontni an */}
          <div className="relative flex flex-1 items-center justify-center">
            {!statuses ? (
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Ap chaje" />
            ) : !current ? (
              <p className="px-8 text-center text-white/80">Pa gen stati ankò. Stati yo disparèt apre 24 è.</p>
            ) : current.kind === "text" ? (
              <p className="whitespace-pre-line break-words px-8 text-center text-2xl font-bold leading-snug text-white sm:text-3xl">{current.body}</p>
            ) : current.kind === "image" || current.kind === "video" ? (
              // Kad 9:16 la (menm jan ak editè a), ak stickers/lejand yo anlè l
              <div className="relative max-h-full w-full overflow-hidden" style={{ aspectRatio: "9 / 16", containerType: "inline-size" }}>
                {current.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={current.id} src={url ?? ""} alt={current.body ?? `Stati ${artist.name}`} className="h-full w-full object-cover" />
                ) : (
                  <video
                    key={current.id}
                    ref={mediaRef}
                    src={url ?? ""}
                    autoPlay
                    playsInline
                    muted={muted}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${current.focus_x ?? 50}% ${current.focus_y ?? 50}%` }}
                    onLoadedMetadata={(e) => {
                      if (trimStart > 0) e.currentTarget.currentTime = trimStart;
                    }}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      const end = trimEnd ?? v.duration ?? 0;
                      // Videyo koupe: fini lè l rive nan fen moso a
                      if (trimEnd && v.currentTime >= trimEnd) return next();
                      setProgress(Math.max(0, (v.currentTime - trimStart) / ((end || 1) - trimStart || 1)));
                    }}
                    onEnded={next}
                  />
                )}
                <StatusOverlayLayer items={items} />
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-6 px-8">
                <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-5xl ring-4 ring-white/20 motion-safe:animate-pulse">🎙️</span>
                <audio
                  key={current.id}
                  ref={mediaRef}
                  src={url ?? ""}
                  autoPlay
                  muted={muted}
                  onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
                  onEnded={next}
                />
                <p className="text-sm text-white/70">{paused ? "⏸ An poz" : "🔊 Mesaj odyo"}</p>
              </div>
            )}

            {/* Zòn pou tape: agoch = anvan, adwat = apre; kenbe = poz */}
            {statuses && current && (
              <div className="absolute inset-0 z-10 flex">
                {(["prev", "next"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    className={`h-full ${side === "prev" ? "w-1/3" : "w-2/3"}`}
                    aria-label={side === "prev" ? "Stati anvan" : "Pwochen stati"}
                    onClick={() => Date.now() - pressedAt.current < 300 && (side === "prev" ? prev() : next())}
                    onPointerDown={() => {
                      pressedAt.current = Date.now();
                      setHeld(true);
                    }}
                    onPointerUp={() => setHeld(false)}
                    onPointerLeave={() => setHeld(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Anba: deskripsyon + like + repons */}
          {current && (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-10">
              {current.kind !== "text" && current.body && <p className="mb-3 text-center text-sm text-white">{current.body}</p>}
              {toast && <p className="mb-2 text-center text-xs font-semibold text-emerald-300">{toast}</p>}

              {isOwner ? (
                <p className="text-center text-xs text-white/60">Se stati ou. Wè like ak repons yo nan dashboard ou (📸 Stati 24 è).</p>
              ) : userId === null ? (
                <Link href="/konekte" onClick={close} className="block text-center text-sm font-semibold text-citron-300">
                  Konekte pou w like epi reponn ✨
                </Link>
              ) : userId ? (
                <>
                  {/* Repons rapid: yon sèl klike */}
                  <div className="mb-2 flex justify-center gap-2">
                    {QUICK_REACTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => void sendReply(r)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl transition hover:scale-110 hover:bg-white/20 active:scale-90"
                        aria-label={`Reponn ak ${r}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendReply(reply);
                    }}
                  >
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value.slice(0, 300))}
                      onFocus={() => setTyping(true)}
                      onBlur={() => !reply && setTyping(false)}
                      placeholder={`Reponn ${artist.name}…`}
                      className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-white/60 outline-none focus:border-citron-400"
                    />
                    {reply.trim() ? (
                      <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-citron-400 text-zinc-950" aria-label="Voye">
                        ➤
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void toggleLike()}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl transition active:scale-90 ${liked.has(current.id) ? "bg-rose-500/20" : "bg-white/10"}`}
                        aria-label={liked.has(current.id) ? "Retire like la" : "Like stati a"}
                        aria-pressed={liked.has(current.id)}
                      >
                        {liked.has(current.id) ? "❤️" : "🤍"}
                      </button>
                    )}
                  </form>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
