"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signup } from "@/app/auth/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "./ui";
import { formatUSD } from "@/lib/donations";
import { REGISTRATION_FEE_USD } from "@/lib/registration";

const roles = [
  { value: "listener", icon: "🎧", label: "Koutè", hint: "Mwen vle koute mizik" },
  { value: "artist", icon: "🎤", label: "Atis", hint: "Mwen vle pataje mizik mwen" },
];

export function SignupForm() {
  const [state, formAction] = useFormState(signup, undefined);

  // Apre enskripsyon reyisi, montre sèlman mesaj "tcheke imèl ou"
  if (state?.message) return <FormMessage message={state.message} />;

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-300">Kisa w ye?</legend>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <label
              key={r.value}
              className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center transition hover:border-zinc-600 has-[:checked]:border-fuchsia-500 has-[:checked]:bg-fuchsia-500/10"
            >
              <input type="radio" name="role" value={r.value} defaultChecked={r.value === "listener"} className="sr-only" />
              <span className="block text-3xl">{r.icon}</span>
              <span className="mt-1 block font-semibold text-white">{r.label}</span>
              <span className="block text-xs text-zinc-400">{r.hint}</span>
              {r.value === "artist" && (
                <span className="mt-1.5 block text-[11px] font-medium text-fuchsia-300">
                  Frè enskripsyon: {formatUSD(REGISTRATION_FEE_USD)}
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Non (oswa non atis ou)">
        <input name="display_name" required maxLength={80} placeholder="Egz: Ti Jo" className={inputClass} />
      </Field>
      <Field label="Imèl">
        <input name="email" type="email" required autoComplete="email" placeholder="ou@egzanp.com" className={inputClass} />
      </Field>
      <Field label="Modpas">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Omwen 8 karaktè" className={inputClass} />
      </Field>

      <FormMessage error={state?.error} />
      <SubmitButton>Kreye kont mwen</SubmitButton>

      <p className="text-center text-sm text-zinc-400">
        Ou gen yon kont deja?{" "}
        <Link href="/konekte" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Konekte
        </Link>
      </p>
    </form>
  );
}
