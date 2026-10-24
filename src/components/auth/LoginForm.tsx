"use client";

import { PasswordField } from "@/components/auth/PasswordField";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { checkPasswordReset, login } from "@/app/auth/actions";
import { PasswordReset, type ResetStep } from "./PasswordReset";
import { Field, FormMessage, SubmitButton, inputClass } from "./ui";

const FAILS_BEFORE_RESET = 2; // apre 2 move modpas, nou pwopoze moun nan chanje l

export function LoginForm({ notice, startReset = false }: { notice?: string; startReset?: boolean }) {
  const [state, formAction] = useFormState(login, undefined);
  const [email, setEmail] = useState("");
  const [fails, setFails] = useState(0);
  const [hasCode, setHasCode] = useState(false); // imèl la gen yon demann kòd aktif
  const [reset, setReset] = useState<ResetStep | null>(startReset ? "request" : null);

  useEffect(() => {
    if (state?.badPassword) setFails((f) => f + 1);
    if (state?.resetPending) setHasCode(true);
  }, [state]);

  // Moun ki te mande yon kòd epi ki tounen: espas kòd la parèt depi l mete imèl li
  function onEmailBlur() {
    if (email.includes("@")) void checkPasswordReset(email).then(setHasCode);
  }

  if (reset) {
    return <PasswordReset initialEmail={email} initialStep={reset} onBack={() => setReset(null)} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage message={notice} />

      {hasCode && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          🔑 Ou te mande yon kòd pou chanje modpas ou. Ou resevwa l?
          <button
            type="button"
            onClick={() => setReset("code")}
            className="mt-3 block w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Mete kòd la
          </button>
        </div>
      )}

      <Field label="Imèl">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ou@egzanp.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={onEmailBlur}
          className={inputClass}
        />
      </Field>
      <Field label="Modpas">
        <PasswordField autoComplete="current-password" />
      </Field>

      <FormMessage error={state?.error} />

      {!hasCode && fails >= FAILS_BEFORE_RESET && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Ou mete yon move modpas {fails} fwa. Ou bliye modpas ou?
          <button
            type="button"
            onClick={() => setReset("request")}
            className="mt-3 block w-full rounded-lg bg-amber-400 px-4 py-2.5 font-semibold text-zinc-950 transition hover:bg-amber-300"
          >
            🔑 Chanje modpas mwen
          </button>
        </div>
      )}

      <SubmitButton>Konekte</SubmitButton>

      <button type="button" onClick={() => setReset("request")} className="w-full text-center text-sm text-zinc-400 transition hover:text-white">
        Mwen bliye modpas mwen
      </button>

      <p className="text-center text-sm text-zinc-400">
        Ou poko gen kont?{" "}
        <Link href="/enskri" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Enskri
        </Link>
      </p>
    </form>
  );
}
