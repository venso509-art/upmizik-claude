"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteNotification, markAllRead, markRead } from "@/app/mesaj/actions";

export type InboxItem = {
  id: string;
  type: "account" | "registration" | "donation" | "payout" | "admin_message" | "new_song" | "new_post" | "comment" | "live" | "like" | "follow" | "tutorial";
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<InboxItem["type"], string> = {
  account: "Kont",
  registration: "Enskripsyon",
  donation: "Don",
  payout: "Retrè",
  admin_message: "📣 Ekip UpMizik",
  new_song: "🎵 Nouvo chante",
  new_post: "💬 Sosyal",
  comment: "💬 Kòmantè",
  live: "🔴 Live",
  like: "❤️ Like",
  follow: "👤 Abone",
  tutorial: "📘 Tuto",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "kounye a";
  if (s < 3600) return `sa gen ${Math.floor(s / 60)} min`;
  if (s < 86400) return `sa gen ${Math.floor(s / 3600)} è`;
  if (s < 86400 * 7) return `sa gen ${Math.floor(s / 86400)} jou`;
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" });
}

// Mesaj ki poko li yo: kat jòn klere ak badj "NOUVO", anlè lis la.
// Yo rete konsa jiskaske moun nan louvri yo (oswa peze « Make tout kòm li »).
export function Inbox({ items }: { items: InboxItem[] }) {
  const [read, setRead] = useState<Set<string>>(() => new Set(items.filter((i) => i.readAt).map((i) => i.id)));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Seksyon yo fikse lè paj la louvri: yon mesaj ou fèk li pa sote al nan lòt seksyon an (li jis chanje koulè)
  const [startedUnread] = useState(() => new Set(items.filter((i) => !i.readAt).map((i) => i.id)));
  const [, startTransition] = useTransition();

  const visible = items.filter((i) => !hidden.has(i.id));
  const unread = visible.filter((i) => startedUnread.has(i.id));
  const seen = visible.filter((i) => !startedUnread.has(i.id));
  const unreadLeft = unread.filter((i) => !read.has(i.id)).length;

  function open(id: string) {
    if (read.has(id)) return;
    setRead((prev) => new Set(prev).add(id));
    startTransition(() => markRead([id]));
  }

  function openAll() {
    setRead(new Set(items.map((i) => i.id)));
    startTransition(() => markAllRead());
  }

  function remove(id: string) {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await deleteNotification(id);
    });
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
        <p className="text-5xl">📭</p>
        <p className="mt-4 font-semibold text-white">Bwat ou vid</p>
        <p className="mt-1 text-sm text-zinc-400">Mesaj ekip UpMizik la ak notifikasyon ou yo ap parèt isit la.</p>
      </div>
    );
  }

  const card = (n: InboxItem, i: number) => {
    const isNew = !read.has(n.id);
    return (
      <li
        key={n.id}
        onClick={() => open(n.id)}
        className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-300 motion-safe:animate-fade-up ${
          isNew
            ? "cursor-pointer border-citron-400/60 bg-gradient-to-br from-citron-400/[0.16] via-zinc-900/80 to-zinc-900/60 shadow-lg shadow-citron-400/10 hover:border-citron-300"
            : "border-zinc-800/80 bg-zinc-900/30"
        }`}
        style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
      >
        {/* Ba jòn sou bò gòch mesaj ki poko li yo */}
        {isNew && <span className="absolute inset-y-0 left-0 w-1 bg-citron-400" aria-hidden />}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {isNew && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-citron-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-950 motion-safe:animate-pulse" aria-hidden />
                  Nouvo
                </span>
              )}
              <h2 className={isNew ? "font-extrabold text-white" : "font-semibold text-zinc-300"}>{n.title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${isNew ? "bg-citron-400/15 text-citron-200" : "bg-zinc-800/80 text-zinc-500"}`}>
                {TYPE_LABEL[n.type] ?? "Notifikasyon"}
              </span>
            </div>
            <p className={`mt-2 whitespace-pre-line break-words text-sm ${isNew ? "text-zinc-200" : "text-zinc-400"}`}>{n.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <span className={isNew ? "font-semibold text-citron-300" : "text-zinc-500"}>{timeAgo(n.createdAt)}</span>
              {n.link && (
                <Link href={n.link} onClick={() => open(n.id)} className={`font-semibold ${isNew ? "text-citron-300 hover:text-citron-200" : "text-fuchsia-400 hover:text-fuchsia-300"}`}>
                  Wè detay →
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(n.id);
            }}
            className="rounded-lg p-1.5 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
            aria-label="Efase mesaj la"
          >
            🗑️
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-8">
      {unread.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-citron-300">
              <span className="h-2 w-2 rounded-full bg-citron-400 motion-safe:animate-pulse" aria-hidden />
              Nouvo ({unreadLeft})
            </h2>
            <button type="button" onClick={openAll} disabled={unreadLeft === 0} className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-citron-400 hover:text-white disabled:opacity-40">
              ✓ Make tout kòm li
            </button>
          </div>
          <ul className="space-y-3">{unread.map(card)}</ul>
        </section>
      )}
      {seen.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-500">Deja li</h2>
          <ul className="space-y-3">{seen.map((n, i) => card(n, i + unread.length))}</ul>
        </section>
      )}
    </div>
  );
}
