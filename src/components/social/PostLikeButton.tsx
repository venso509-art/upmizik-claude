"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ❤️ sou yon pòs: chif la chanje touswit, epi n anile l si Supabase refize
export function PostLikeButton({
  postId,
  initialCount,
  initialLiked,
  currentUserId,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!currentUserId) return router.push("/konekte");
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: postId, user_id: currentUserId })
      : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
    if (error) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Retire like" : "Like pòs la"}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-800 ${
        liked ? "text-red-400" : "text-zinc-300 hover:text-white"
      }`}
    >
      {liked ? "❤️" : "🤍"} {count > 0 ? <span className="tabular-nums">{count}</span> : "J'aime"}
    </button>
  );
}
