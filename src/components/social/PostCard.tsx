import { PostLikeButton } from "@/components/social/PostLikeButton";
import { ShareCountButton } from "@/components/ShareCountButton";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerifiedCorner } from "@/components/VerifiedCorner";
import { daysLeft, daysLeftLabel, linkInfo, timeAgo, type FeedPost } from "@/lib/posts";

// Transfòme lyen yo (https://...) an lyen ki ka klike
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-fuchsia-300 underline-offset-2 hover:underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function Avatar({ name, url, size = "h-12 w-12", verified }: { name: string; url: string | null; size?: string; verified?: boolean | null }) {
  return (
    <span className={`${size} relative block shrink-0`}>
      <span className="block h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 ring-2 ring-zinc-900">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <VerifiedCorner show={verified} />
    </span>
  );
}

// Kat pou yon lyen: imaj YouTube la si se yon videyo, sinon domèn sit la
export function LinkCard({ url, compact = false }: { url: string; compact?: boolean }) {
  const info = linkInfo(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group/link block overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950/60 transition hover:border-fuchsia-500/60"
    >
      {info.thumbnail && (
        <span className="relative block aspect-video bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={info.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition group-hover/link:scale-110">▶</span>
          </span>
        </span>
      )}
      <span className={`flex items-center gap-3 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-lg">{info.youtubeId ? "▶" : "🔗"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{info.youtubeId ? "Gade videyo a sou YouTube" : info.host}</span>
          <span className="block truncate text-xs text-zinc-500">{url}</span>
        </span>
        <span className="text-zinc-500 transition group-hover/link:translate-x-0.5 group-hover/link:text-fuchsia-300" aria-hidden>
          ↗
        </span>
      </span>
    </a>
  );
}

// Imaj kare pòs la
export function PostImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="block aspect-square overflow-hidden rounded-xl bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}

export function PostCard({
  post,
  now,
  commentCount,
  likes,
  shareCount,
  currentUserId = null,
}: {
  post: FeedPost;
  now: number;
  commentCount?: number; // si li la: ranje aksyon yo (like, kòmante, pataje) parèt
  likes?: { count: number; liked: boolean };
  shareCount?: number;
  currentUserId?: string | null;
}) {
  const left = daysLeft(post.expires_at, now);
  // Koulè kontè a: vèt → jòn lè l prèske fini
  const tone = left <= 3 ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <article id={post.id} className="scroll-mt-40 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700">
      <header className="flex items-start gap-3">
        <Link href={`/atis/${post.artist_id}`} className="shrink-0">
          <Avatar name={post.artist_name} url={post.artist_avatar} verified={post.artist_verified} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/atis/${post.artist_id}`} className="flex items-center font-semibold text-white hover:underline">
            <span className="truncate">{post.artist_name}</span>
            {post.artist_verified && <VerifiedBadge />}
          </Link>
          <p className="text-xs text-zinc-500">
            🎤 Atis · <time dateTime={post.created_at}>{timeAgo(post.created_at, now)}</time>
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${tone}`} title="Pòs yo disparèt otomatikman lè tan yo fini">
          ⏳ {daysLeftLabel(post.expires_at, now)}
        </span>
      </header>
      <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-zinc-200">
        <Linkified text={post.content} />
      </p>
      {post.image_url && (
        <div className="mt-4">
          <PostImage src={post.image_url} alt={`Pòs ${post.artist_name}`} />
        </div>
      )}
      {post.link_url && (
        <div className="mt-4">
          <LinkCard url={post.link_url} />
        </div>
      )}
      {/* Aksyon yo: like, kòmante ak pataje */}
      {typeof commentCount === "number" && (
        <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-zinc-800 pt-3">
          <PostLikeButton
            postId={post.id}
            initialCount={likes?.count ?? 0}
            initialLiked={likes?.liked ?? false}
            currentUserId={currentUserId}
          />
          <Link
            href={`/sosyal/${post.id}#komante`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            💬 {commentCount > 0 ? `${commentCount} kòmantè` : "Kòmante"}
          </Link>
          <ShareCountButton
            kind="post"
            id={post.id}
            path={`/sosyal/${post.id}`}
            title={`${post.artist_name} sou UpMizik`}
            initialCount={shareCount ?? 0}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          />
        </footer>
      )}
    </article>
  );
}
