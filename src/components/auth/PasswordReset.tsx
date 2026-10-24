"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestPasswordReset, resetPasswordWithCode, verifyResetCode } from "@/app/auth/actions";
import { PasswordField } from "@/components/auth/PasswordField";
import { Field, FormMessage, inputClass } from "./ui";

export type ResetStep = "request" | "code";
type Step = ResetStep | "password" | "done";

const buttonClass =
  "w-full rounded-lg btn-primary px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

// "Mwen bliye modpas mwen" an 3 etap:
// 1. moun nan mande yon kòd (imèl kont lan + WhatsApp oswa imèl kote pou n voye l)
// 2. li mete kòd 6 chif ekip UpMizik la voye ba li a
// 3. li chwazi yon nouvo modpas epi li konekte touswit
export function PasswordReset({ initialEmail, initialStep, onBack }: { initialEmail: string; initialStep: ResetStep; onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [kind, setKind] = useState<"whatsapp" | "email">("whatsapp");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<void>) {
    setError(undefined);
    startTransition(task);
  }

  function submitRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const res = await requestPasswordReset(fd);
      if (res.error) return setError(res.error);
      setSentTo(kind === "whatsapp" ? `WhatsApp ${contact}` : `imèl ${contact}`);
      setStep("code");
    });
  }

  function submitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    run(async () => {
      const res = await verifyResetCode(email, code);
      if (res.error) return setError(res.error);
      setStep("password");
    });
  }

  function submitPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    fd.set("code", code);
    run(async () => {
      const res = await resetPasswordWithCode(fd);
      if (res.error) return setError(res.error);
      if (res.role) {
        router.push(res.role === "artist" ? "/dashboard" : "/");
        router.refresh();
        return;
      }
      setMessage(res.message ?? "Modpas ou chanje ✅ Ou ka konekte kounye a.");
      setStep("done");
    });
  }

  const back = (
    <button type="button" onClick={onBack} className="w-full text-center text-sm text-zinc-400 transition hover:text-white">
      ← Retounen nan Konekte
    </button>
  );

  if (step === "done") {
    return (
      <div className="space-y-5">
        <FormMessage message={message} />
        {back}
      </div>
    );
  }

  if (step === "request") {
    return (
      <form onSubmit={submitRequest} className="space-y-5">
        <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
          🔑 <b>Chanje modpas ou.</b> Ekip UpMizik la ap voye yon <b>kòd 6 chif</b> ba ou sou WhatsApp oswa pa imèl. Ak kòd la, w ap ka
          chwazi yon nouvo modpas.
        </div>

        <Field label="Imèl kont ou">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ou@egzanp.com"
            className={inputClass}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Ki kote pou n voye kòd la?</p>
          <div className="grid grid-cols-2 gap-2">
            {(["whatsapp", "email"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setContact(k === "email" ? email : "");
                }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  kind === k ? "border-fuchsia-500 bg-fuchsia-500/15 text-white" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {k === "whatsapp" ? "📱 WhatsApp" : "✉️ Imèl"}
              </button>
            ))}
          </div>
          <input type="hidden" name="contact_kind" value={kind} />
          <input
            name="contact"
            type={kind === "email" ? "email" : "tel"}
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={kind === "email" ? "ou@egzanp.com" : "+509 3412 3456"}
            className={`${inputClass} mt-2`}
          />
        </div>

        <FormMessage error={error} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Ap voye..." : "Voye demann lan"}
        </button>
        <button type="button" onClick={() => setStep("code")} className="w-full text-center text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Mwen gen yon kòd deja
        </button>
        {back}
      </form>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="space-y-5">
        {sentTo ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            ✅ <b>Demann ou an rive!</b> Ekip UpMizik la ap voye kòd la ba ou sou {sentTo}. Lè w resevwa l, kopye l epi mete l isit la.
            <br />
            <span className="text-emerald-200/80">Ou ka fèmen paj la: lè w tounen pou w konekte ak imèl sa a, espas kòd la ap parèt.</span>
          </div>
        ) : (
          <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100">
            🔑 Mete kòd 6 chif ekip UpMizik la voye ba ou a.
          </div>
        )}

        <Field label="Imèl kont ou">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ou@egzanp.com"
            className={inputClass}
          />
        </Field>
        <Field label="Kòd la (6 chif)">
          <input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </Field>

        <FormMessage error={error} />
        <button type="submit" disabled={pending || code.length !== 6} className={buttonClass}>
          {pending ? "Ap verifye..." : "Verifye kòd la"}
        </button>
        <button type="button" onClick={() => setStep("request")} className="w-full text-center text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Mande yon nouvo kòd
        </button>
        {back}
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="space-y-5">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        ✅ <b>Kòd la bon!</b> Chwazi yon nouvo modpas pou {email}.
      </div>
      <Field label="Nouvo modpas">
        <PasswordField name="password" autoComplete="new-password" showStrength />
      </Field>
      <Field label="Mete l ankò">
        <PasswordField name="password_confirm" autoComplete="new-password" />
      </Field>
      <FormMessage error={error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Ap chanje..." : "Chanje modpas mwen epi konekte"}
      </button>
      {back}
    </form>
  );
}
