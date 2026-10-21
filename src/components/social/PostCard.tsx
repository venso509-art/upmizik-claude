import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { daysLeft, daysLeftLabel, timeAgo, type FeedPost } from "@/lib/posts";

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

export function Avatar({ name, url, size = "h-12 w-12" }: { name: string; url: string | null; size?: string }) {
  return (
    <span className={`${size} block shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 ring-2 ring-zinc-900`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center font-bold text-white">{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

export function PostCard({ post, now }: { post: FeedPost; now: number }) {
  const left = daysLeft(post.expires_at, now);
  // Koulè kontè a: vèt → jòn lè l prèske fini
  const tone = left <= 3 ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700">
      <header className="flex items-start gap-3">
        <Link href={`/atis/${post.artist_id}`} className="shrink-0">
          <Avatar name={post.artist_name} url={post.artist_avatar} />
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
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${tone}`} title="Pòs yo disparèt otomatikman apre 30 jou">
          ⏳ {daysLeftLabel(post.expires_at, now)}
        </span>
      </header>
      <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-zinc-200">
        <Linkified text={post.content} />
      </p>
    </article>
  );
}
