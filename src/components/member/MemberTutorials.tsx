"use client";

import { useState, useTransition } from "react";
import { sendTutorial } from "@/app/manm/actions";
import { TUTORIALS, tutorialOfTheDay, tutorialText, type Tutorial } from "@/lib/tutorials";

type Artist = { id: string; name: string; avatarUrl: string | null };

// Tuto pou atis yo: manm nan li yo, epi l voye youn chak jou bay atis li fè enskri yo
// (dirèk nan bwat mesaj atis la sou sit la, oswa sou WhatsApp)
export function MemberTutorials({ origin, code, artists }: { origin: string; code: string; artists: Artist[] }) {
  const today = tutorialOfTheDay();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(artists.length === 1 ? artists[0].id : null);
  const [sent, setSent] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [sending, startSending] = useTransition();
  const target = artists.find((a) => a.id === to);

  function sendInSite(t: Tutorial) {
    if (!to) return;
    startSending(async () => {
      const res = await sendTutorial(to, t.id);
      setSent((prev) => ({ ...prev, [t.id]: res.error ? { ok: false, text: res.error } : { ok: true, text: `✓ Voye bay ${res.artist ?? target?.name}` } }));
    });
  }

  // Bouton "Voye nan mesaj li" + rezilta a
  const siteButton = (t: Tutorial) => (
    <>
      <button
        type="button"
        onClick={() => sendInSite(t)}
        disabled={!to || sending}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FFD700] px-3 py-2.5 text-sm font-black text-[#0B132B] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        📬 {target ? `Voye bay ${target.name} sou UpMizik` : "Chwazi yon atis anlè a"}
      </button>
      {sent[t.id] && <p className={`mt-1.5 text-xs font-semibold ${sent[t.id].ok ? "text-emerald-300" : "text-red-300"}`}>{sent[t.id].text}</p>}
    </>
  );

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
      <p className="mt-1 text-sm text-zinc-400">Chwazi yon atis ou fè enskri, epi voye ba li yon tuto chak jou dirèk nan mesaj li sou UpMizik (oswa sou WhatsApp): li ap aprann sèvi ak sit la, epi l ap rete aktif.</p>

      {/* Chwazi atis la: tuto a ap rive nan bwat mesaj li sou sit la */}
      <div className="mt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">📬 Voye bay ki atis?</p>
        {artists.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Poko gen atis ki enskri ak pseudo ou. Lè yo enskri, w ap ka voye tuto yo ba yo dirèk sou UpMizik.</p>
        ) : (
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {artists.map((a) => {
              const active = a.id === to;
              return (
                <li key={a.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setTo(active ? null : a.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition ${
                      active ? "bg-[#FFD700] text-[#0B132B] shadow-lg shadow-[#FFD700]/20" : "bg-white/[0.05] text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-xs font-black text-white">
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        a.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="max-w-[9rem] truncate">{a.name}</span>
                    {active && <span aria-hidden>✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Tuto jodi a */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-transparent p-4 ring-1 ring-[#FFD700]/40">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#FFD700]">📌 Tuto jodi a</p>
        <p className="mt-1.5 font-bold text-white">
          {today.icon} {today.question}
        </p>
        {artists.length > 0 && <div className="mt-3">{siteButton(today)}</div>}
        <div className="mt-2 flex gap-2">
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
                  {artists.length > 0 && <div className="mt-3">{siteButton(t)}</div>}
                  <div className="mt-2 flex gap-2">
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
