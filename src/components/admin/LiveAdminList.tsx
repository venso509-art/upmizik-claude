"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { banLive, stopLive, unbanLive } from "@/app/admin/live/actions";
import { formatHTG } from "@/lib/donations";
import { formatCount, liveDuration } from "@/lib/live";

export type AdminLive = {
  live_id: string;
  artist_id: string;
  artist_name: string;
  title: string | null;
  status: string;
  is_on: boolean;
  started_at: string;
  ended_at: string | null;
  peak_viewers: number;
  viewers: number;
  likes: number;
  gifts_count: number;
  gift_htg: number;
  artist_htg: number;
  platform_htg: number;
  live_banned_until: string | null;
  stop_reason: string | null;
};

const when = (iso: string) => new Date(iso).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Port-au-Prince" });

function Row({ l }: { l: AdminLive }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("3");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const banned = !!l.live_banned_until && new Date(l.live_banned_until).getTime() > Date.now();

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(undefined);
      const res = await fn();
      if (res.error) setError(res.error);
      else setOpen(false);
    });

  return (
    <li className={`rounded-2xl border p-4 ${l.is_on ? "border-red-500/50 bg-red-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-md px-2 py-0.5 text-xs font-black ${l.is_on ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
          {l.is_on ? "● LIVE" : l.status === "stopped" ? "KANPE" : l.status === "live" ? "PÈDI SIYAL" : "FINI"}
        </span>
        <span className="min-w-0 flex-1">
          <Link href={`/atis/${l.artist_id}`} className="font-semibold text-white hover:underline">
            {l.artist_name}
          </Link>
          {banned && <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-300">⛔ bloke jiska {when(l.live_banned_until!)}</span>}
          <span className="block truncate text-xs text-zinc-500">
            {l.title ?? "San tit"} · {when(l.started_at)} · {liveDuration(l.started_at, l.ended_at)}
          </span>
        </span>
        <span className="text-xs text-zinc-400">
          👥 {formatCount(l.viewers)} · ❤️ {formatCount(l.likes)} · 🎁 {formatCount(l.gifts_count)}
        </span>
        <span className="text-right text-xs">
          <span className="block font-semibold text-white">{formatHTG(l.gift_htg)}</span>
          <span className="text-zinc-500">
            atis {formatHTG(l.artist_htg)} · UpMizik {formatHTG(l.platform_htg)}
          </span>
        </span>
      </div>
      {l.stop_reason && <p className="mt-2 text-xs text-red-300">Kanpe: {l.stop_reason}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {l.is_on && (
          <>
            <Link href={`/live/${l.live_id}`} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700">
              👁 Gade live la
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`Kanpe live ${l.artist_name}?`) && run(() => stopLive(l.live_id))}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            >
              ⏹ Kanpe live la
            </button>
          </>
        )}
        {banned ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Debloke ${l.artist_name}?`) && run(() => unbanLive(l.artist_id))}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            ✅ Debloke
          </button>
        ) : (
          <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500">
            ⛔ Bloke
          </button>
        )}
      </div>

      {open && !banned && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-zinc-950 p-3 text-sm">
          <label className="flex items-center gap-2 text-zinc-300">
            Pandan
            <input
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-16 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white"
            />
            jou
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            placeholder="Rezon (atis la ap wè l)"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-white"
          />
          <button
            type="button"
            disabled={pending || !reason.trim() || !Number(days)}
            onClick={() => run(() => banLive(l.artist_id, Number(days), reason))}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "…" : "Konfime"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </li>
  );
}

export function LiveAdminList({ lives }: { lives: AdminLive[] }) {
  if (lives.length === 0) return <p className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-400">Poko gen live.</p>;
  return (
    <ul className="space-y-3">
      {lives.map((l) => (
        <Row key={l.live_id} l={l} />
      ))}
    </ul>
  );
}
