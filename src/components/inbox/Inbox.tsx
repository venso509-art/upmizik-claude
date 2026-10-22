"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { deleteNotification, markAllRead } from "@/app/mesaj/actions";

export type InboxItem = {
  id: string;
  type: "account" | "registration" | "donation" | "payout" | "admin_message" | "new_song" | "new_post" | "comment";
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
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "kounye a";
  if (s < 3600) return `sa gen ${Math.floor(s / 60)} min`;
  if (s < 86400) return `sa gen ${Math.floor(s / 3600)} è`;
  if (s < 86400 * 7) return `sa gen ${Math.floor(s / 86400)} jou`;
  return new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" });
}

export function Inbox({ items }: { items: InboxItem[] }) {
  // Nou kenbe lis mesaj ki pa t li yo lè paj la louvri, pou yo rete an limyè pandan vizit sa a
  const [unreadIds] = useState(() => new Set(items.filter((i) => !i.readAt).map((i) => i.id)));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Depi atis la louvri bwat la, nou make tout mesaj yo kòm li (badj 🔔 la disparèt)
  useEffect(() => {
    if (unreadIds.size > 0) startTransition(() => markAllRead());
  }, [unreadIds]);

  function remove(id: string) {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await deleteNotification(id);
    });
  }

  const visible = items.filter((i) => !hidden.has(i.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
        <p className="text-5xl">📭</p>
        <p className="mt-4 font-semibold text-white">Bwat ou vid</p>
        <p className="mt-1 text-sm text-zinc-400">Mesaj ekip UpMizik la ak notifikasyon ou yo ap parèt isit la.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((n) => {
        const isNew = unreadIds.has(n.id);
        return (
          <li
            key={n.id}
            className={`group relative rounded-2xl border p-5 transition ${
              isNew ? "border-fuchsia-500/40 bg-fuchsia-500/[0.07]" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <div className="flex items-start gap-3">
              {isNew && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-fuchsia-500" aria-label="Nouvo" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="font-bold text-white">{n.title}</h2>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">{TYPE_LABEL[n.type]}</span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-zinc-300">{n.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-zinc-500">{timeAgo(n.createdAt)}</span>
                  {n.link && (
                    <Link href={n.link} className="font-semibold text-fuchsia-400 hover:text-fuchsia-300">
                      Wè detay →
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="rounded-lg p-1.5 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                aria-label="Efase mesaj la"
              >
                🗑️
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
