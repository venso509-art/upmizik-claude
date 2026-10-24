import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { PostCard } from "@/components/social/PostCard";
import { Comments } from "@/components/Comments";
import { countComments, loadComments } from "@/lib/comments";
import { loadPostLikes, loadPostShares, postImageUrl, type FeedPost } from "@/lib/posts";

type Props = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  content: string;
  image_path: string | null;
  link_url: string | null;
  created_at: string;
  expires_at: string;
  status: string;
  artist_id: string;
  profiles: { display_name: string; avatar_url: string | null; is_verified: boolean } | { display_name: string; avatar_url: string | null; is_verified: boolean }[] | null;
};

// RLS la montre sèlman pòs aktif yo (atis la ak admin wè pa yo tou)
async function getPost(id: string): Promise<FeedPost | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, content, image_path, link_url, created_at, expires_at, status, artist_id, profiles!posts_artist_id_fkey(display_name, avatar_url, is_verified)")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!data) return null;
  const p = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  return {
    id: data.id,
    content: data.content,
    image_path: data.image_path,
    link_url: data.link_url,
    image_url: postImageUrl(supabase, data.image_path),
    created_at: data.created_at,
    expires_at: data.expires_at,
    artist_id: data.artist_id,
    artist_name: p?.display_name ?? "Atis",
    artist_avatar: p?.avatar_url ?? null,
    artist_verified: p?.is_verified ?? false,
  };
}

// Aperçu WhatsApp/Facebook lè yon moun pataje pòs la
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) return { title: "Pòs pa jwenn | UpMizik" };
  const title = `${post.artist_name} sou UpMizik Sosyal`;
  const text = post.content.replace(/\s+/g, " ").trim();
  const description = text.length > 150 ? `${text.slice(0, 147)}…` : text;
  const image = post.image_url || post.artist_avatar;
  return {
    title: `${post.artist_name}: ${description.slice(0, 60)} | UpMizik`,
    description,
    openGraph: { title, description, type: "article", siteName: "UpMizik", images: [{ url: image ?? "/og.jpg" }] },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [comments, admin, likes, shares] = await Promise.all([
    loadComments(supabase, { type: "post", id: post.id }, user?.id ?? null),
    isAdmin(supabase, user?.id),
    loadPostLikes(supabase, [post.id], user?.id ?? null),
    loadPostShares(supabase, [post.id]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/sosyal" className="text-sm text-zinc-400 hover:text-white">
        ← Tout pòs yo
      </Link>
      <div className="mt-4">
        {/* Ranje aksyon an: ❤️ like, 💬 kòmante, 🔗 pataje */}
        <PostCard post={post} now={Date.now()} commentCount={countComments(comments)} likes={likes.get(post.id)} shareCount={shares.get(post.id) ?? 0} currentUserId={user?.id ?? null} />
      </div>
      <div id="komante" className="mt-8 scroll-mt-24 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <Comments
          target={{ type: "post", id: post.id }}
          comments={comments}
          currentUserId={user?.id ?? null}
          canModerate={user?.id === post.artist_id || admin}
          placeholder={`Di ${post.artist_name} sa w panse…`}
        />
      </div>
    </div>
  );
}
