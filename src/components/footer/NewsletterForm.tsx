"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { subscribeNewsletter } from "@/app/newsletter/actions";

function SubscribeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "..." : "Enskri"}
    </button>
  );
}

export function NewsletterForm() {
  const [state, formAction] = useFormState(subscribeNewsletter, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Vide bwat la apre yon enskripsyon reyisi
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <label htmlFor="newsletter-email" className="sr-only">
        Imèl ou
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          placeholder="ou@egzanp.com"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
        />
        <SubscribeButton />
      </div>
      {state?.error && <p className="mt-2 text-xs text-red-300">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-xs text-emerald-300">Mèsi! W ap resevwa nouvèl UpMizik yo. 🎶</p>}
    </form>
  );
}
