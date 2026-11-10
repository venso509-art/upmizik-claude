"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GiftType } from "@/lib/live";
import { FormMessage } from "@/components/auth/ui";

type SongGift = GiftType & { tier: number };

// Nivo kado yo (migration 20270101000013_song_gift_catalog.sql)
const TIERS: { tier: number; name: string; icon: string }[] = [
  { tier: 0, name: "Ti kado", icon: "🌹" },
  { tier: 1, name: "Ti Bourad", icon: "🎤" },
  { tier: 2, name: "Bèl Jès", icon: "🎸" },
  { tier: 3, name: "Gwo Lanmou", icon: "🪘" },
  { tier: 4, name: "Prestij", icon: "🎙️" },
  { tier: 5, name: "Lejann", icon: "🏆" },
];

// 🎁 Voye yon kado sou yon chante ak kredi (menm kado ak live yo). Sèlman pou moun ki konekte.
// Pataj la menm jan ak yon don: 85 % pou atis yo, 15 % pou UpMizik (migration 20270101000012_song_gifts.sql).
export function SongGiftPanel({ songId, artistName, onSent }: { songId: string; artistName: string; onSent: () => void }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [gifts, setGifts] = useState<SongGift[]>([]);
  const [tier, setTier] = useState(0);
  const [balance, setBalance] = useState(0);
  const [pick, setPick] = useState<SongGift | null>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setLoggedIn(!!user);
      if (user) {
        const [g, w] = await Promise.all([
          supabase.from("live_gift_types").select("id, name, emoji, credits, sort, tier").eq("active", true).in("scope", ["all", "song"]).order("sort").returns<SongGift[]>(),
          supabase.from("credit_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
        ]);
        setGifts(g.data ?? []);
        setBalance(w.data?.balance ?? 0);
      }
      setLoading(false);
    })();
  }, []);

  const cost = pick ? pick.credits * qty : 0;
  const enough = cost > 0 && cost <= balance;

  async function send() {
    if (!pick) return;
    setBusy(true);
    setError(undefined);
    const { data, error: err } = await createClient().rpc("send_song_gift", {
      p_song: songId,
      p_gift: pick.id,
      p_quantity: qty,
      p_message: message.trim() || null,
    });
    setBusy(false);
    if (err) return setError(err.message.includes("ase kredi") ? "Ou pa gen ase kredi 🪙. Achte kredi sou paj Kredi a." : err.message);
    if (typeof data === "number") setBalance(data);
    onSent();
  }

  if (loading) return <p className="py-10 text-center text-sm text-zinc-500">Chajman…</p>;

  // Pa konekte: opsyon kado a pa disponib (don MonCash / NatCash la toujou la)
  if (!loggedIn) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-5xl">🎁</p>
        <p className="font-semibold text-white">Kado yo se pou koutè ki enskri</p>
        <p className="text-sm text-zinc-400">
          Kreye yon kont koutè gratis, achte kredi, epi voye 🌹 🦁 👑 💎 bay {artistName} pandan w ap koute mizik li.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/konekte" className="rounded-xl btn-primary px-5 py-2.5 font-semibold">
            Konekte
          </Link>
          <Link href="/enskri" className="rounded-xl border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 hover:border-zinc-500">
            Kreye yon kont
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3">
        <span className="text-sm text-zinc-400">Kredi ou</span>
        <span className="flex items-center gap-3">
          <span className="text-lg font-extrabold tabular-nums text-white">🪙 {balance.toLocaleString("fr-HT")}</span>
          <Link href="/kredi" className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300 hover:bg-sky-500/25">
            + Achte
          </Link>
        </span>
      </div>

      {/* Nivo yo: Ti kado → Lejann */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TIERS.filter((t) => gifts.some((g) => g.tier === t.tier)).map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => setTier(t.tier)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              tier === t.tier ? "bg-fuchsia-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {t.icon} {t.tier > 0 ? `Nivo ${t.tier} · ` : ""}
            {t.name}
          </button>
        ))}
      </div>

      <div className={`grid gap-2 ${tier === 0 ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-2"}`}>
        {gifts.filter((g) => g.tier === tier).map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setPick(g)}
            className={`flex flex-col items-center rounded-xl border px-1 py-2 transition ${
              pick?.id === g.id ? "border-fuchsia-500 bg-fuchsia-500/15 shadow-lg shadow-fuchsia-500/20" : g.credits > balance ? "border-zinc-800 opacity-50" : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <span className={tier === 0 ? "text-2xl" : "text-4xl"}>{g.emoji}</span>
            <span className={`mt-0.5 w-full truncate ${tier === 0 ? "text-[11px]" : "text-sm font-semibold"} text-zinc-300`}>{g.name}</span>
            <span className={`${tier === 0 ? "text-[10px]" : "text-xs"} font-bold text-sky-300`}>🪙 {g.credits.toLocaleString("fr-HT")}</span>
          </button>
        ))}
      </div>

      {pick && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Kantite</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-full bg-zinc-800 text-white hover:bg-zinc-700" aria-label="Mwens">
                −
              </button>
              <span className="w-8 text-center font-bold tabular-nums text-white">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} className="h-8 w-8 rounded-full bg-zinc-800 text-white hover:bg-zinc-700" aria-label="Plis">
                +
              </button>
            </span>
          </div>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            placeholder={`Yon ti mo pou ${artistName} (opsyonèl)`}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-500"
          />
        </>
      )}

      <FormMessage error={error} />

      {pick && !enough ? (
        <Link href="/kredi" className="block w-full rounded-xl btn-primary px-4 py-3 text-center font-semibold">
          🪙 Ou bezwen {(cost - balance).toLocaleString("fr-HT")} kredi anplis: achte kredi
        </Link>
      ) : (
        <button
          type="button"
          disabled={!pick || busy}
          onClick={send}
          className="w-full rounded-xl btn-primary px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Ap voye…" : pick ? `Voye ${pick.emoji} ${pick.name} x${qty} · 🪙 ${cost.toLocaleString("fr-HT")}` : "Chwazi yon kado"}
        </button>
      )}
    </div>
  );
}
