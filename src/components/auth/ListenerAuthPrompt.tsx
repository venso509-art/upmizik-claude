"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePlayer } from "@/components/player/PlayerProvider";
import { Portal } from "@/components/Portal";

const LISTEN_SECONDS = 15; // pop-up la parèt apre 15 segonn koute
const SHOWN_KEY = "upmizik-auth-prompt"; // yon sèl fwa pa sesyon
const RESEND_SECONDS = 60;

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "Twòp demann pou kounye a. Tann kèk minit epi eseye ankò.";
  if (m.includes("expired") || m.includes("invalid")) return "Kòd la pa bon oswa li ekspire. Verifye l, oswa mande yon nouvo kòd.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Koneksyon ak Google poko aktive. Itilize imèl ou pou kounye a.";
  if (m.includes("signups not allowed")) return "Enskripsyon fèmen pou kounye a.";
  return message;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.2s2.69-6.2 6-6.2c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.84 3.2 14.64 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.66 0 9.4-3.98 9.4-9.58 0-.64-.07-1.13-.16-1.62H12Z" />
    </svg>
  );
}

// Pop-up "Frictionless": moun ki pa konekte k ap koute mizik la ka konekte ak imèl li (kòd 6 chif) oswa Google,
// san li pa bezwen kreye yon kont konplike. Li vin yon "koutè" otomatikman.
export function ListenerAuthPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const { isPlaying, current } = usePlayer();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldown, setCooldown] = useState(0);
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Mete yon imèl valid.");
    setBusy(true);
    setError(undefined);
    const { error: err } = await createClient().auth.signInWithOtp({
      email: value,
      options: {
        shouldCreateUser: true,
        data: { role: "listener" }, // nouvo kont = koutè
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`,
      },
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError("Kòd la gen 6 chif.");
    setBusy(true);
    setError(undefined);
    const { error: err } = await createClient().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "email" });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOpen(false);
    router.refresh(); // header, like, kòmantè... mete yo ajou
  }

  async function google() {
    setError(undefined);
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}` },
    });
    if (err) setError(friendlyError(err.message));
  }

  if (!open) return null;

  return (
    <Portal>
      {/* Mizik la kontinye jwe dèyè pop-up la */}
      <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-prompt-title"
          className="w-full max-w-md overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-fuchsia-700 via-violet-800 to-zinc-900 px-6 pb-6 pt-7">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/80 transition hover:bg-black/50 hover:text-white"
              aria-label="Fèmen"
            >
              ✕
            </button>
            <p className="text-4xl" aria-hidden>
              🎧
            </p>
            <h2 id="auth-prompt-title" className="mt-2 text-2xl font-extrabold text-white">
              {step === "email" ? "Ou renmen sa w ap tande a?" : "Tcheke imèl ou"}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              {step === "email"
                ? "Konekte pou w ka like, pataje epi kòmante san w pa bezwen kreye yon kont konplike."
                : `Nou voye yon kòd 6 chif bay ${email.trim()}. Tape l anba a.`}
            </p>
          </div>

          <div className="space-y-4 p-6">
            {step === "email" ? (
              <>
                <form onSubmit={sendCode} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    placeholder="imel@egzanp.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-citron-400 focus:ring-2 focus:ring-citron-400/20"
                    aria-label="Imèl ou"
                  />
                  <button type="submit" disabled={busy} className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-60">
                    {busy ? "Ap voye kòd la…" : "✉️ Kontinye ak Imèl"}
                  </button>
                </form>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="h-px flex-1 bg-zinc-800" /> oswa <span className="h-px flex-1 bg-zinc-800" />
                </div>
                <button
                  type="button"
                  onClick={google}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-100"
                >
                  <GoogleIcon /> Kontinye ak Google
                </button>
              </>
            ) : (
              <form onSubmit={verify} className="space-y-3">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="••••••"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-2xl font-bold tracking-[0.6em] text-white placeholder:text-zinc-600 outline-none focus:border-citron-400 focus:ring-2 focus:ring-citron-400/20"
                  aria-label="Kòd 6 chif la"
                />
                <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full rounded-xl px-4 py-3 disabled:opacity-60">
                  {busy ? "Ap verifye…" : "✅ Konekte"}
                </button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError(undefined);
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    ← Chanje imèl
                  </button>
                  <button type="button" onClick={() => sendCode()} disabled={cooldown > 0 || busy} className="text-citron-300 hover:text-citron-200 disabled:text-zinc-600">
                    {cooldown > 0 ? `Voye l ankò (${cooldown}s)` : "Voye kòd la ankò"}
                  </button>
                </div>
              </form>
            )}
            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <button type="button" onClick={() => setOpen(false)} className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300">
              Pita, kontinye koute
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
