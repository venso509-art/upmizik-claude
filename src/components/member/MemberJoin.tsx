"use client";

import { useState } from "react";
import { MemberForm } from "@/components/member/MemberForm";
import { BASE_RATE_USD, BONUS_RATE_USD, formatUsd } from "@/lib/members";

// "Mwen vle vin manm": kontra a (ak kòb la) dewoule SÈLMAN la a; moun nan dakò, epi fòm nan parèt.
export function MemberJoin({ defaultNickname, defaultEmail }: { defaultNickname: string; defaultEmail: string }) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const TERMS = [
    { icon: "📅", title: "Dire kontra a", text: "6 mwa, ou ka renouvle l apre sa." },
    { icon: "🎯", title: "Objektif chak mwa", text: "50 atis ki enskri ak pseudo ou epi ekip la apwouve." },
    { icon: "💵", title: `${formatUsd(BASE_RATE_USD)} pa atis`, text: "Pou chak atis apwouve, jiska objektif la (50 atis nan mwa a)." },
    { icon: "🚀", title: `${formatUsd(BONUS_RATE_USD)} pa atis apre 50`, text: "Depi w depase objektif la nan mwa a, chak nouvo atis vo plis." },
    { icon: "📲", title: "Peman", text: "Chak 5 nan mwa a, pa MonCash oswa NatCash, pou atis mwa anvan an." },
    { icon: "✅", title: "Sèlman atis tout bon", text: "Yon atis konte sèlman lè ekip UpMizik la apwouve kont li. Fo kont = kont manm nan bloke." },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FFD700] px-6 py-4 text-lg font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105 active:scale-[0.99]"
      >
        🤝 Mwen vle vin manm
        <span className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {/* Kontra a dewoule dousman */}
      <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
          <div className="pt-6">
            <div className="rounded-2xl bg-[#0B132B]/70 p-5 ring-1 ring-[#FFD700]/30">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FFD700]">📜 Kontra manm afilye</p>
              <ul className="mt-4 space-y-3">
                {TERMS.map((t) => (
                  <li key={t.title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFD700]/15 text-lg" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="text-sm">
                      <span className="block font-bold text-white">{t.title}</span>
                      <span className="text-zinc-400">{t.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-200 ring-1 ring-white/10">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#FFD700]" />
                Mwen li kondisyon yo epi mwen dakò ak kontra manm afilye UpMizik la.
              </label>
            </div>

            {/* Fòm nan parèt apre moun nan dakò */}
            {agreed && (
              <div className="mt-6 motion-safe:animate-fade-up">
                <h2 className="text-xl font-black text-white">Enfòmasyon ou</h2>
                <p className="mb-5 mt-1 text-sm text-zinc-400">Ekip la ap apwouve demann ou epi ba w pseudo pa w.</p>
                <MemberForm defaultNickname={defaultNickname} defaultEmail={defaultEmail} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
