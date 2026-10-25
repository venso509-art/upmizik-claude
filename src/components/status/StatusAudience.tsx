"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { timeAgo } from "@/lib/posts";

export type StatusStat = { views: number; likes: number };
type Person = { user_id: string; name: string; avatar_url: string | null; verified: boolean; viewed_at: string | null; liked_at: string | null };

function Avatar({ p }: { p: Person }) {
  return (
    <span className="relative h-11 w-11 shrink-0">
      <span className="block h-full w-full overflow-hidden rounded-full bg-zinc-800">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center bg-gradient-to-br from-fuchsia-600 to-zinc-800 font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
        )}
      </span>
      {p.liked_at && <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[11px] ring-2 ring-zinc-900">❤️</span>}
    </span>
  );
}

// Panèl ki glise monte (atis la sèlman): kiyès ki wè stati a, ak kiyès ki like li
export function StatusAudience({
  supabase,
  statusId,
  stat,
  onClose,
}: {
  supabase: SupabaseClient;
  statusId: string;
  stat?: StatusStat;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"views" | "likes">("views");
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    let alive = true;
    setPeople(null);
    const load = async () => {
      const { data } = await supabase.rpc("status_audience", { p_status: statusId });
      if (alive) setPeople((data ?? []) as Person[]);
    };
    void load();
    const t = setInterval(load, 15000); // nouvo moun ki gade pandan panèl la louvri
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [statusId, supabase]);

  const viewers = (people ?? []).filter((p) => p.viewed_at || p.liked_at);
  const likers = (people ?? []).filter((p) => p.liked_at);
  const views = Math.max(stat?.views ?? 0, viewers.length);
  const likes = Math.max(stat?.likes ?? 0, likers.length);
  const anon = Math.max(0, views - (people ?? []).filter((p) => p.viewed_at).length);
  const list = tab === "views" ? viewers : likers;

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex max-h-[72%] w-full flex-col rounded-t-3xl bg-zinc-900/95 pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-white/10 backdrop-blur-xl motion-safe:animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Moun ki wè stati a"
      >
        <button type="button" onClick={onClose} className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-white/25" aria-label="Fèmen" />

        {/* Onglè yo */}
        <div className="mt-3 grid grid-cols-2 gap-1 px-4">
          {(
            [
              ["views", "👁", "Wè", views],
              ["likes", "❤️", "Like", likes],
            ] as const
          ).map(([id, icon, label, n]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition ${tab === id ? "bg-white text-zinc-950" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              <span>{icon}</span> {label}
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === id ? "bg-zinc-950/10" : "bg-white/10"}`}>{n.toLocaleString("fr-HT")}</span>
            </button>
          ))}
        </div>

        {/* Lis la */}
        <div className="mt-3 min-h-[9rem] flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:thin]">
          {people === null ? (
            <ul className="space-y-1 px-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
                  <span className="h-3 w-32 animate-pulse rounded-full bg-white/10" />
                </li>
              ))}
            </ul>
          ) : list.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-white/55">
              {tab === "views" ? (anon > 0 ? "Sèlman vizitè san kont ki wè l pou kounye a." : "Pèsonn poko wè stati sa a.") : "Pèsonn poko like stati sa a."}
            </p>
          ) : (
            <ul>
              {list.map((p) => (
                <li key={p.user_id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-white/5">
                  <Avatar p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center text-sm font-semibold text-white">
                      <span className="truncate">{p.name}</span>
                      {p.verified && <VerifiedBadge />}
                    </span>
                    <span className="block text-xs text-white/50">
                      {tab === "likes" && p.liked_at ? `Like ${timeAgo(p.liked_at)}` : p.viewed_at ? `Wè l ${timeAgo(p.viewed_at)}` : p.liked_at ? `Like ${timeAgo(p.liked_at)}` : ""}
                    </span>
                  </span>
                  {tab === "views" && p.liked_at && <span className="text-lg" aria-label="Li like stati a">❤️</span>}
                </li>
              ))}
            </ul>
          )}
          {tab === "views" && people !== null && anon > 0 && (
            <p className="mx-2 mt-2 flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5 text-sm text-white/70">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">👤</span>+ {anon.toLocaleString("fr-HT")} vizitè san kont
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
