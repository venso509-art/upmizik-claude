import type { SupabaseClient } from "@supabase/supabase-js";

// ===== Kòmantè (chante OSWA pòs): fil ak repons (1 nivo) ak like =====
export type CommentTarget = { type: "song" | "post"; id: string };

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  authorIsArtist: boolean;
  authorVerified: boolean;
  likeCount: number;
  liked: boolean;
  replies: CommentItem[];
};

type Author = { display_name: string; role: string; avatar_url: string | null; is_verified?: boolean };

type Row = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  // "!comments_user_id_fkey": tablo comment_likes la kreye yon dezyèm chemen ant comments ak profiles
  profiles: Author | Author[] | null;
};

const AUTHOR = "profiles!comments_user_id_fkey(display_name, role, avatar_url, is_verified)";

export async function loadComments(supabase: SupabaseClient, target: CommentTarget, userId: string | null): Promise<CommentItem[]> {
  const column = target.type === "song" ? "song_id" : "post_id";
  const query = (cols: string) =>
    supabase.from("comments").select(cols).eq(column, target.id).order("created_at", { ascending: true }).limit(400).returns<Row[]>();

  const first = await query(`id, body, created_at, user_id, parent_id, ${AUTHOR}`);
  let data = first.data;
  if (first.error) {
    // Migration repons yo poko kouri: chaje kòmantè yo san repons
    ({ data } = await query("id, body, created_at, user_id, profiles(display_name, role, avatar_url)"));
  }
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Like yo (kantite + èske moun ki konekte a like li)
  const ids = rows.map((r) => r.id);
  const { data: likes } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", ids);
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const l of (likes ?? []) as { comment_id: string; user_id: string }[]) {
    counts.set(l.comment_id, (counts.get(l.comment_id) ?? 0) + 1);
    if (l.user_id === userId) mine.add(l.comment_id);
  }

  const items = new Map<string, CommentItem & { parentId: string | null }>();
  for (const r of rows) {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    items.set(r.id, {
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      userId: r.user_id,
      authorName: p?.display_name ?? "Itilizatè",
      authorAvatar: p?.avatar_url ?? null,
      authorIsArtist: p?.role === "artist",
      authorVerified: p?.is_verified === true,
      likeCount: counts.get(r.id) ?? 0,
      liked: mine.has(r.id),
      replies: [],
      parentId: r.parent_id ?? null,
    });
  }

  // Fil yo: kòmantè prensipal yo (pi resan an anlè), repons yo anba yo (nan lòd yo te ekri yo)
  const top: CommentItem[] = [];
  for (const c of Array.from(items.values())) {
    const parent = c.parentId ? items.get(c.parentId) : null;
    if (parent) parent.replies.push(c);
    else top.push(c);
  }
  return top.reverse();
}

export function countComments(list: CommentItem[]) {
  return list.reduce((n, c) => n + 1 + c.replies.length, 0);
}
