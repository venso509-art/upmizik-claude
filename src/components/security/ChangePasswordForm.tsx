"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { changePassword } from "@/app/sekirite/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

function PasswordInput({ name, autoComplete, placeholder }: { name: string; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-white"
        aria-label={show ? "Kache" : "Montre"}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePassword, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) formRef.current?.reset();
    // Apre 3 echèk, sesyon an fèmen: voye moun nan sou paj koneksyon an
    if (state?.loggedOut) {
      const t = setTimeout(() => router.replace("/konekte"), 4000);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5" autoComplete="off">
      <Field label="🔑 Ansyen modpas">
        <PasswordInput name="old_password" autoComplete="current-password" />
      </Field>
      <Field label="🛡️ Kòd sekrè">
        <PasswordInput name="secret_code" autoComplete="off" placeholder="Kòd ou sèl konnen an" />
      </Field>

      <div className="border-t border-zinc-800 pt-5" />

      <Field label="✨ Nouvo modpas">
        <PasswordInput name="new_password" autoComplete="new-password" placeholder="Omwen 8 karaktè, lèt ak chif" />
      </Field>
      <Field label="✅ Konfime nouvo modpas">
        <PasswordInput name="confirm_password" autoComplete="new-password" />
      </Field>

      <FormMessage error={state?.error} message={state?.message} />
      {state?.loggedOut ? (
        <p className="text-center text-sm text-zinc-400">Ap mennen w sou paj koneksyon an…</p>
      ) : (
        <SubmitButton>🔐 Chanje modpas la</SubmitButton>
      )}
    </form>
  );
}
