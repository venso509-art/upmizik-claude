"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { login } from "@/app/auth/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "./ui";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage message={notice} />

      <Field label="Imèl">
        <input name="email" type="email" required autoComplete="email" placeholder="ou@egzanp.com" className={inputClass} />
      </Field>
      <Field label="Modpas">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>

      <FormMessage error={state?.error} />
      <SubmitButton>Konekte</SubmitButton>

      <p className="text-center text-sm text-zinc-400">
        Ou poko gen kont?{" "}
        <Link href="/enskri" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Enskri
        </Link>
      </p>
    </form>
  );
}
