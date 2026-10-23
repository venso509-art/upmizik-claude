"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { quickLogin, quickSignup } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/PlayerProvider";
import { Portal } from "@/components/Portal";
import { PasswordField } from "@/components/auth/PasswordField";
import { inputClass } from "@/components/auth/ui";

const LISTEN_SECONDS = 15; // pop-up la parèt apre 15 segonn koute
const SHOWN_KEY = "upmizik-auth-prompt"; // yon sèl fwa pa sesyon

type Mode = "signup" | "login";

// Pop-up "Enskri kòm Koutè": moun ki pa konekte k ap koute mizik la kreye yon kont an 3 chan
// (non, imèl, modpas) oswa li konekte, san li pa kite paj la (mizik la kontinye jwe).
// Pa gen imèl pou tann: kont lan aktive touswit.
export function ListenerAuthPrompt() {
  const router = useRouter();
  const { isPlaying, current } = usePlayer();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signup");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const listened = useRef(0);

  // Èske moun nan deja konekte? (sesyon Supabase la kenbe l konekte lè l tounen)
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Konte segonn koute yo; apre 15 s, louvri pop-up la (yon sèl fwa pa sesyon)
  useEffect(() => {
    if (loggedIn !== false || !isPlaying || !current) return;
    let alreadyShown = false;
    try {
      alreadyShown = !!sessionStorage.getItem(SHOWN_KEY);
    } catch {}
    if (alreadyShown) return;
    const t = setInterval(() => {
      listened.current += 1;
      if (listened.current >= LISTEN_SECONDS) {
        clearInterval(t);
        try {
          sessionStorage.setItem(SHOWN_KEY, "1");
        } catch {}
        setOpen(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [loggedIn, isPlaying, current]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(undefined);
    setMessage(undefined);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const res = mode === "signup" ? await quickSignup(fd) : await quickLogin(fd);
      if (res.error) return setError(res.error);
      if (res.message) return setMessage(res.message);
      // Konekte! Sesyon an nan cookies yo: mete header a, like yo, kòmantè yo... ajou
      await createClient().auth.getSession();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) return null;
  const signup = mode === "signup";

  return (
    <Portal>
      {/* Mizik la kontinye jwe dèyè pop-up la */}
      <div
        className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={() => !pending && setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-prompt-title"
          className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-fuchsia-700 via-violet-800 to-zinc-900 px-6 pb-6 pt-7">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/80 transition hover:bg-black/50 hover:text-white"
              aria-label="Fèmen"
            >
              ✕
            </button>
            <p className="text-4xl" aria-hidden>
              🎧
            </p>
            <h2 id="auth-prompt-title" className="mt-2 text-2xl font-extrabold text-white">
              {signup ? "Ou renmen sa w ap tande a?" : "Byenvini ankò!"}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {signup
                ? "Enskri kòm Koutè gratis pou w ka like, pataje epi kòmante. Sa pran 30 segonn."
                : "Konekte pou w ka like, pataje epi kòmante."}
            </p>
          </div>

          {/* Onglet: Enskri / Konekte */}
          <div className="grid grid-cols-2 gap-1 border-b border-zinc-800 p-1.5">
            {(
              [
                ["signup", "✨ Kreye kont"],
                ["login", "🔑 Mwen gen kont deja"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                disabled={pending}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === key ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form key={mode} onSubmit={submit} className="space-y-3 p-6">
            {signup && (
              <input
                name="display_name"
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                placeholder="Non ou"
                aria-label="Non ou"
                className={inputClass}
              />
            )}
            <input name="email" type="email" required autoComplete="email" placeholder="imel@egzanp.com" aria-label="Imèl ou" className={inputClass} />
            <PasswordField
              autoComplete={signup ? "new-password" : "current-password"}
              placeholder={signup ? "Modpas (8 karaktè, lèt + chif)" : "Modpas ou"}
              showStrength={signup}
            />

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}

            <button type="submit" disabled={pending} className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-60">
              {pending ? (signup ? "Ap kreye kont ou…" : "Ap konekte…") : signup ? "🎧 Enskri kòm Koutè" : "🔑 Konekte"}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="w-full pt-1 text-center text-sm text-zinc-500 hover:text-zinc-300"
            >
              Pita, kontinye koute
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}
