import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar, LinkCard, PostImage } from "@/components/social/PostCard";
import { daysLeftLabel, timeAgo, type FeedPost } from "@/lib/posts";

// Dènye pòs Sosyal yo sou paj akèy la: kat ki woule de goch a dwat
export function SocialStrip({ posts, now }: { posts: FeedPost[]; now: number }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20" aria-labelledby="sosyal-titre">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-fuchsia-300">UpMizik Sosyal</p>
          <h2 id="sosyal-titre" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            💬 Sa k ap fèt Atis
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Nouvèl, evènman ak nouvo pwojè, dirèkteman nan men atis yo.</p>
        </div>
        <Link
          href="/sosyal"
          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
        >
          Wè tout →
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 font-semibold text-white">Poko gen pòs</p>
          <p className="mt-1 text-sm text-zinc-400">Lè atis yo pibliye nouvèl yo, y ap parèt isit la.</p>
        </div>
      ) : (
        <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {posts.map((p) => (
            <li key={p.id} className="w-[78vw] max-w-[19rem] shrink-0 snap-start sm:w-72">
              <article className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-fuchsia-500/40">
                <header className="flex items-center gap-2.5">
                  <Link href={`/atis/${p.artist_id}`} className="shrink-0">
                    <Avatar name={p.artist_name} url={p.artist_avatar} size="h-9 w-9" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/atis/${p.artist_id}`} className="flex items-center text-sm font-semibold text-white hover:underline">
                      <span className="truncate">{p.artist_name}</span>
                      {p.artist_verified && <VerifiedBadge />}
                    </Link>
                    <p className="text-[11px] text-zinc-500">
                      {timeAgo(p.created_at, now)} · ⏳ {daysLeftLabel(p.expires_at, now)}
                    </p>
                  </div>
                </header>

                <div className="mt-3">
                  {p.image_url ? <PostImage src={p.image_url} alt={`Pòs ${p.artist_name}`} /> : p.link_url ? <LinkCard url={p.link_url} compact /> : null}
                </div>

                <p className="mt-3 line-clamp-3 flex-1 whitespace-pre-line break-words text-sm text-zinc-300">{p.content}</p>
                <Link href={`/sosyal#${p.id}`} className="mt-3 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200">
                  Li tout pòs la →
                </Link>
              </article>
            </li>
          ))}
          {/* Dènye kat la: mennen sou paj Sosyal la */}
          <li className="w-44 shrink-0 snap-start">
            <Link
              href="/sosyal"
              className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 p-4 text-center text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/10"
            >
              <span className="text-3xl">💬</span>
              Wè tout pòs yo →
            </Link>
          </li>
        </ul>
      )}
    </section>
  );
}
