"use client";

import { useState } from "react";
import { TUTORIALS, tutorialOfTheDay, tutorialText, type Tutorial } from "@/lib/tutorials";

// Tuto pou atis yo: manm nan li yo, epi l voye youn chak jou bay atis li fè enskri yo (WhatsApp...)
export function MemberTutorials({ origin, code }: { origin: string; code: string }) {
  const today = tutorialOfTheDay();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function share(t: Tutorial) {
    const text = tutorialText(t, origin, code);
    if (navigator.share) {
      try {
        await navigator.share({ title: t.question, text });
        return;
      } catch {
        return; // moun nan anile
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(t.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  const whatsapp = (t: Tutorial) => `https://wa.me/?text=${encodeURIComponent(tutorialText(t, origin, code))}`;

  return (
    <section className="rounded-3xl bg-zinc-900/70 p-5 ring-1 ring-white/10">
      <h2 className="font-black text-white">📘 Tuto pou atis ou yo</h2>
      <p className="mt-1 text-sm text-zinc-400">Voye youn chak jou bay atis ki enskri ak pseudo ou: yo ap aprann sèvi ak UpMizik, epi yo ap rete aktif.</p>

      {/* Tuto jodi a */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-transparent p-4 ring-1 ring-[#FFD700]/40">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#FFD700]">📌 Tuto jodi a</p>
        <p className="mt-1.5 font-bold text-white">
          {today.icon} {today.question}
        </p>
        <div className="mt-3 flex gap-2">
          <a
            href={whatsapp(today)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-black text-[#FFFFFF]"
          >
            Voye sou WhatsApp
          </a>
          <button type="button" onClick={() => setOpen(open === today.id ? null : today.id)} className="rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/10">
            Li l
          </button>
        </div>
      </div>

      {/* Tout tuto yo */}
      <ul className="mt-4 space-y-2">
        {TUTORIALS.map((t, i) => {
          const isOpen = open === t.id;
          return (
            <li key={t.id} className={`overflow-hidden rounded-2xl ring-1 transition ${isOpen ? "bg-white/[0.05] ring-[#FFD700]/40" : "bg-white/[0.02] ring-white/10"}`}>
              <button type="button" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD700]/15 text-lg" aria-hidden>
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-zinc-500">Tuto {i + 1}</span>
                  <span className="block text-sm font-bold leading-snug text-white">{t.question}</span>
                </span>
                <span className={`text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <p className="text-sm text-zinc-300">{t.intro}</p>
                  <ol className="mt-3 space-y-2">
                    {t.steps.map((s, n) => (
                      <li key={n} className="flex gap-2.5 text-sm text-zinc-200">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-xs font-black text-[#0B132B]">{n + 1}</span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={whatsapp(t)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-3 py-2 text-sm font-black text-[#FFFFFF]"
                    >
                      Voye sou WhatsApp
                    </a>
                    <button type="button" onClick={() => void share(t)} className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10">
                      {copied === t.id ? "✓ Kopye" : "Pataje / Kopye"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
