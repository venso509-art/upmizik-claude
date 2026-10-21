import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PostModeration, type AdminPost } from "@/components/admin/PostModeration";
import { SearchInput } from "@/components/search/SearchInput";
import { postImageUrl, type PostStatus } from "@/lib/posts";

export const metadata: Metadata = { title: "Admin: Jesyon Pòs | UpMizik" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "aktif", label: "🟢 Aktif" },
  { key: "ekspire", label: "⏳ Ekspire" },
  { key: "bloke", label: "🚫 Bloke" },
  { key: "retire", label: "🗑️ Retire pa atis" },
] as const;

type Row = {
  id: string;
  content: string;
  created_at: string;
  expires_at: string;
  status: PostStatus;
  image_path: string | null;
  link_url: string | null;
  artist_id: string;
  profiles: { display_name: string; avatar_url: string | null } | { display_name: string; avatar_url: string | null }[] | null;
};

export default async function AdminPostsPage({ searchParams }: { searchParams: { f?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/konekte");
  if (!(await isAdmin(supabase, user.id))) redirect("/");

  const filter = FILTERS.find((f) => f.key === searchParams.f)?.key ?? "tout";
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("posts")
    .select("id, content, created_at, expires_at, status, image_path, link_url, artist_id, profiles!posts_artist_id_fkey(display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "aktif") query = query.eq("status", "active").gt("expires_at", nowIso);
  if (filter === "ekspire") query = query.eq("status", "active").lte("expires_at", nowIso);
  if (filter === "bloke") query = query.eq("status", "blocked");
  if (filter === "retire") query = query.eq("status", "deleted");
  if (q) query = query.ilike("content", `%${q}%`);

  const [{ data, error }, { count: blockedCount }] = await Promise.all([
    query.returns<Row[]>(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "blocked"),
  ]);

  const posts: AdminPost[] = (data ?? []).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      status: r.status,
      imageUrl: postImageUrl(supabase, r.image_path),
      linkUrl: r.link_url,
      artistId: r.artist_id,
      artistName: p?.display_name ?? "Atis enkoni",
      artistAvatar: p?.avatar_url ?? null,
    };
  });

  const href = (f: string) => `/admin/pos?${new URLSearchParams({ ...(f !== "tout" ? { f } : {}), ...(q ? { q } : {}) }).toString()}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <AdminTabs />

      <h1 className="text-3xl font-extrabold tracking-tight text-white">🗞️ Jesyon Pòs</h1>
      <p className="mt-1 text-zinc-400">
        Tout pòs UpMizik Sosyal yo, menm sa ki ekspire. <strong className="text-zinc-200">Bloke</strong> kache pòs la san efase l;{" "}
        <strong className="text-zinc-200">Efase</strong> retire l nèt.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              filter === f.key ? "border-fuchsia-500 bg-fuchsia-500/15 text-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
            }`}
          >
            {f.label}
            {f.key === "bloke" && blockedCount ? ` (${blockedCount})` : ""}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchInput initial={q} placeholder="Chache nan kontni pòs yo…" />
      </div>

      <div className="mt-6">
        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Pòs yo pa chaje: {error.message}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-500">{posts.length === 100 ? "100 dènye pòs yo" : `${posts.length} pòs`}</p>
            <PostModeration posts={posts} now={Date.now()} />
          </>
        )}
      </div>
    </div>
  );
}
