"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Portal } from "@/components/Portal";
import { resetRevenueReport } from "@/app/admin/rapo/actions";

// Bouton « Reset »: anrejistre rapò a nan achiv, epi tout kontè revni yo rekòmanse a zewo.
// Pou konfime: ekri RESET + mo sekrè a.
export function ResetReportButton({ since }: { since: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [word, setWord] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const ready = confirm.trim().toUpperCase() === "RESET" && word.trim().length > 0;

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setWord("");
    setError(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(undefined);
    startTransition(async () => {
      const res = await resetRevenueReport(confirm, word, title);
      if (res.error) {
        setError(res.error);
        setWord("");
        return;
      }
      setOpen(false);
      router.push(`/admin/achiv/rapo#r-${res.id}`);
    });
  }

  const input =
    "mt-1.5 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white placeholder:text-zinc-600 focus:border-citron-400 focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/20"
      >
        ♻️ Reset
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:rounded-3xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-title"
            >
              <h2 id="reset-title" className="text-xl font-black text-white">
                ♻️ Reset rapò revni an
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                <li>📄 Rapò depi {since} ap anrejistre nan <strong className="text-white">Achiv</strong>, jan li ye kounya a.</li>
                <li>🔒 Rapò achive a pa ka modifye ni efase.</li>
                <li>0️⃣ Kontè rapò a rekòmanse a zewo apre sa.</li>
                <li>💸 Reset la pa touche okenn lajan, balans atis, ni peman.</li>
              </ul>

              <label className="mt-5 block text-sm font-semibold text-zinc-300">
                Non rapò a <span className="font-normal text-zinc-500">(si w vle)</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Egz: Rapò oktòb 2026" className={input} />
              </label>
              <label className="mt-4 block text-sm font-semibold text-zinc-300">
                Ekri <span className="font-mono text-red-300">RESET</span> pou konfime
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="RESET" className={input} />
              </label>
              <label className="mt-4 block text-sm font-semibold text-zinc-300">
                Mo sekrè a
                <input type="password" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" placeholder="••••••••" className={input} />
              </label>

              {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={close} className="flex-1 rounded-xl px-4 py-3 font-medium text-zinc-400 transition hover:text-white">
                  Anile
                </button>
                <button
                  type="submit"
                  disabled={!ready || pending}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "Ap anrejistre…" : "Reset"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </>
  );
}
