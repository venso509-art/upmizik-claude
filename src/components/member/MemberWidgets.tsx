"use client";

import { useState } from "react";
import type { Referral } from "@/lib/members";

const card = "rounded-3xl bg-zinc-900/70 p-5 ring-1 ring-white/10";

// Kat "Pseudo ou": kopye pseudo a, epi pataje lyen enskripsyon an (WhatsApp, Facebook...)
export function MemberShareCard({ code, origin }: { code: string; origin: string }) {
  const link = `${origin}/enskri?wol=atis&ref=${code}`;
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(text: string, what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  async function share() {
    const text = `🎤 Ou se atis? Enskri sou UpMizik ak pseudo mwen ${code} epi w ap jwenn 2 jou promo gratis! 🇭🇹`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "UpMizik", text, url: link });
        return;
      } catch {
        return; // moun nan anile pataj la
      }
    }
    await copy(`${text}\n${link}`, "link");
  }

  return (
    <section className={card}>
      <h2 className="font-black text-white">Pseudo ou</h2>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#0B132B] px-4 py-3.5 ring-1 ring-white/5">
        <span className="truncate text-2xl font-black tracking-wider text-[#FFD700]">{code}</span>
        <button
          type="button"
          onClick={() => void copy(code, "code")}
          className="shrink-0 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/10"
        >
          {copied === "code" ? "✓ Kopye" : "Kopye"}
        </button>
      </div>
      <button type="button" onClick={() => void copy(link, "link")} className="mt-2.5 block w-full truncate text-left text-xs text-zinc-400 hover:text-white">
        {copied === "link" ? "✓ Lyen an kopye" : link.replace(/^https?:\/\//, "")}
      </button>
      <button
        type="button"
        onClick={() => void share()}
        className="mt-3 w-full rounded-2xl bg-[#FFD700] px-4 py-3.5 font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/15 transition hover:brightness-105 active:scale-[0.99]"
      >
        Pataje lyen enskripsyon an
      </button>
      <p className="mt-3 text-sm text-zinc-400">Atis ki enskri ak pseudo ou jwenn 2 jou promo sou UpMizik, TikTok ak Instagram.</p>
    </section>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

// Kat "Atis ou enskri": 6 premye yo, epi "Wè tout lis la"
export function ReferralList({ referrals }: { referrals: Referral[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? referrals : referrals.slice(0, 6);
  const now = Date.now();
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-black text-white">Atis ou enskri</h2>
        <span className="text-sm text-zinc-400">{referrals.length} total</span>
      </div>
      {referrals.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-400">Poko gen atis. Pataje pseudo ou pou premye a enskri! 🎤</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {shown.map((r) => {
            const promo = r.promo_until && new Date(r.promo_until).getTime() > now;
            return (
              <li key={r.artist_id} className="flex items-center gap-3 py-3">
                {r.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D3854] text-sm font-black text-white">{initials(r.name)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{r.name}</span>
                  <span className="text-xs text-zinc-400">
                    Enskri {new Date(r.signed_up_at).toLocaleDateString("fr-HT", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </span>
                {promo ? (
                  <span className="text-xs font-bold text-[#FFD700]">Promo aktif</span>
                ) : r.counted_at ? (
                  <span className="text-xs font-semibold text-emerald-300">✓ Konte</span>
                ) : r.status === "pending" ? (
                  <span className="text-xs text-zinc-500">Ap tann apwobasyon</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {referrals.length > 6 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 text-sm font-bold text-[#FFD700] hover:underline">
          {all ? "Montre mwens" : "Wè tout lis la"}
        </button>
      )}
    </section>
  );
}
