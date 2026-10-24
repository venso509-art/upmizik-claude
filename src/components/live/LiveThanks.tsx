"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export type Gifter = { user_id: string; name: string; gifts: number; credits: number; emojis: string; thanked: boolean };

const DEFAULT_MSG =
  "Mèsi anpil {non} pou bèl kado ou te voye nan live mwen an! 🙏💖 Sipò w ban m fòs pou m kontinye. Pa rate pwochen live la: {dat} 🔴";

function formatNext(iso: string) {
  if (!iso) return "m ap fè w konnen byento";
  return new Date(iso).toLocaleString("fr-HT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// Apre live la: kiyès ki voye kado, ak yon mesaj mèsi pou chak moun (+ dat pwochen live la)
export function LiveThanks({ liveId, gifters: initial, nextLiveAt, nextLiveTitle }: { liveId: string; gifters: Gifter[]; nextLiveAt: string | null; nextLiveTitle?: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [gifters, setGifters] = useState(initial);
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [next, setNext] = useState(nextLiveAt ? toLocalInput(nextLiveAt) : "");
  const [nextTitle, setNextTitle] = useState(nextLiveTitle ?? "");
  const [info, setInfo] = useState<string>();
  const [pending, startTransition] = useTransition();
  const left = gifters.filter((g) => !g.thanked);

  const personal = (name: string) =>
    message
      .replaceAll("{non}", name)
      .replaceAll("{dat}", next ? formatNext(new Date(next).toISOString()) : "m ap fè w konnen byento")
      .slice(0, 400);

  // Sove dat pwochen live la sou pwofil la (li parèt sou paj atis la)
  async function saveNext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ next_live_at: next ? new Date(next).toISOString() : null, next_live_title: nextTitle.trim() || null })
      .eq("id", user.id);
  }

  function send(targets: Gifter[]) {
    if (!targets.length) return;
    setInfo(undefined);
    startTransition(async () => {
      await saveNext();
      let ok = 0;
      for (const g of targets) {
        const { error } = await supabase.rpc("thank_live_gifters", { p_live: liveId, p_user: g.user_id, p_message: personal(g.name) });
        if (error) {
          setInfo(`❌ ${error.message}`);
          break;
        }
        ok++;
        setGifters((cur) => cur.map((x) => (x.user_id === g.user_id ? { ...x, thanked: true } : x)));
      }
      if (ok) setInfo(`💌 Mesaj la ale bay ${ok} moun!`);
    });
  }

  if (gifters.length === 0) return <p className="text-sm text-zinc-500">Pèsonn pa t voye kado nan live sa a.</p>;

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {gifters.map((g) => (
          <li key={g.user_id} className="flex items-center gap-3 rounded-xl bg-zinc-950/70 p-3">
            <span className="text-lg">{g.emojis.slice(0, 8) || "🎁"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{g.name}</span>
              <span className="text-xs text-zinc-500">
                {Number(g.gifts)} kado · 🪙 {Number(g.credits).toLocaleString("fr-HT")} kredi
              </span>
            </span>
            {g.thanked ? (
              <span className="text-xs font-semibold text-emerald-300">✓ Remèsye</span>
            ) : (
              <button type="button" disabled={pending} onClick={() => send([g])} className="rounded-full bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                💌 Remèsye
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Mesaj la + pwochen live la */}
      <div className="space-y-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4">
        <p className="text-sm font-semibold text-white">💌 Mesaj mèsi a</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 380))}
          rows={3}
          className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
        />
        <p className="text-[11px] text-zinc-500">
          <code className="text-fuchsia-300">{"{non}"}</code> = non moun nan · <code className="text-fuchsia-300">{"{dat}"}</code> = dat pwochen live la
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-400">
            📅 Dat ak lè pwochen live la
            <input
              type="datetime-local"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white [color-scheme:dark]"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Tit pwochen live la (opsyonèl)
            <input
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value.slice(0, 100))}
              placeholder="Egz: Nouvo single la an eksklizivite"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <p className="rounded-xl bg-zinc-950/70 p-3 text-xs text-zinc-300">
          <span className="text-zinc-500">Apèsi: </span>
          {personal(gifters[0]?.name ?? "Jak")}
        </p>
        <button
          type="button"
          disabled={pending || left.length === 0}
          onClick={() => send(left)}
          className="w-full rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Ap voye…" : left.length ? `💌 Voye bay tout moun (${left.length})` : "✓ Tout moun resevwa mesaj ou"}
        </button>
        {info && <p className="text-sm text-zinc-200">{info}</p>}
      </div>
    </div>
  );
}

// datetime-local bezwen "AAAA-MM-JJTHH:MM" lè lokal
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
