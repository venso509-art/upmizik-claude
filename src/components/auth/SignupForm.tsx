"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { signup } from "@/app/auth/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "./ui";
import { formatUSD } from "@/lib/donations";
import { REGISTRATION_FEE_USD } from "@/lib/registration";

const roles = [
  { value: "listener", icon: "🎧", label: "Koutè", hint: "Mwen vle koute mizik" },
  { value: "artist", icon: "🎤", label: "Atis", hint: "Mwen vle pataje mizik mwen" },
] as const;

const pinClass = `${inputClass} tracking-[0.5em]`;

export function SignupForm() {
  const [state, formAction] = useFormState(signup, undefined);
  const [role, setRole] = useState<"listener" | "artist">("listener");
  const isArtist = role === "artist";

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
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="sr-only"
              />
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

      <Field label={isArtist ? "Non atis ou" : "Non"}>
        <input name="display_name" required maxLength={80} placeholder="Egz: Ti Jo" className={inputClass} />
      </Field>
      {isArtist && (
        <Field label="📱 Telefòn / WhatsApp">
          <input name="phone" type="tel" required autoComplete="tel" placeholder="Egz: +509 3412 3456" className={inputClass} />
        </Field>
      )}
      <Field label="Imèl">
        <input name="email" type="email" required autoComplete="email" placeholder="ou@egzanp.com" className={inputClass} />
      </Field>
      <Field label="Modpas (pou konekte)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Omwen 8 karaktè" className={inputClass} />
      </Field>

      {isArtist && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm font-semibold text-white">🔐 PIN retrè</p>
          <p className="mt-0.5 text-xs text-zinc-500">4 a 6 chif. W ap bezwen l pou konfime chak fwa w retire lajan. Pa pataje l ak pèsonn.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              pattern="\d{4,6}"
              maxLength={6}
              placeholder="PIN"
              aria-label="PIN"
              className={pinClass}
            />
            <input
              name="pin_confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              pattern="\d{4,6}"
              maxLength={6}
              placeholder="Konfime"
              aria-label="Konfime PIN nan"
              className={pinClass}
            />
          </div>
        </div>
      )}

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
