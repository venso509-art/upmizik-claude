"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Portal } from "@/components/Portal";
import { deleteAccount } from "@/app/admin/actions";

// Bouton « Siprime »: efase yon kont nèt. Pou konfime: ekri SIPRIME + mo sekrè a.
export function DeleteAccountButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [word, setWord] = useState("");
  const [fakeProofs, setFakeProofs] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const ready = confirm.trim().toUpperCase() === "SIPRIME" && word.trim().length > 0;

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setWord("");
    setFakeProofs(false);
    setError(undefined);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(undefined);
    startTransition(async () => {
      const res = await deleteAccount(userId, confirm, word, fakeProofs);
      if (res.error) {
        setError(res.error);
        setWord("");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const input =
    "mt-1.5 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white placeholder:text-zinc-600 focus:border-red-400 focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-900/70 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-600 hover:text-white"
      >
        🗑️ Siprime
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl border border-red-500/30 bg-zinc-900 p-6 text-left shadow-2xl sm:rounded-3xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-title"
            >
              <p className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-3xl" aria-hidden>
                🗑️
              </p>
              <h2 id="delete-title" className="mt-4 text-xl font-black text-white">
                Siprime kont <span className="text-red-300">{name}</span>?
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                <li>❌ Kont lan efase nèt: pwofil, chante, pòs, stati, kòmantè…</li>
                <li>⚠️ Sa pa ka anile. Moun nan ap oblije kreye yon nouvo kont.</li>
                <li>💰 Si kont lan gen don, revni oswa retrè, sit la ap refize: bloke l pito.</li>
              </ul>

              <label className="mt-5 block text-sm font-semibold text-zinc-300">
                Ekri <span className="font-mono text-red-300">SIPRIME</span> pou konfime
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="SIPRIME" className={input} />
              </label>
              <label className="mt-4 block text-sm font-semibold text-zinc-300">
                Mo sekrè a
                <input type="password" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" placeholder="••••••••" className={input} />
              </label>

              {/* Enskripsyon/Pro/boost/kredi ki te apwouve ak yon fo prèv: lajan an pa t janm rive */}
              <label
                className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                  fakeProofs ? "border-amber-400/60 bg-amber-400/10 text-amber-100" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <input type="checkbox" checked={fakeProofs} onChange={(e) => setFakeProofs(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-400" />
                <span>
                  <span className="font-semibold text-white">Prèv peman yo te fo</span>
                  <span className="block text-xs text-zinc-400">
                    Enskripsyon, Pro, boost oswa kredi te apwouve men lajan an pa t janm rive. Peman sa yo ap efase ak kont lan (yo rete nan jounal sekirite a).
                  </span>
                </span>
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
                  {pending ? "Ap siprime…" : "Siprime nèt"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </>
  );
}
