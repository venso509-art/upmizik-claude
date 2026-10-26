"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestMembership } from "@/app/manm/actions";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";

// Fòm "Vin manm afilye": demann nan ale bay admin nan pou l apwouve l
export function MemberForm({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-4xl">⏳</p>
        <p className="mt-2 text-lg font-bold text-white">Demann ou an voye!</p>
        <p className="mt-1 text-sm text-zinc-300">Ekip UpMizik la ap verifye l. Depi yo apwouve l, w ap resevwa pseudo ou ak yon notifikasyon.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(undefined);
        startTransition(async () => {
          const res = await requestMembership(fd);
          if (res.error) return setError(res.error);
          setDone(true);
          router.refresh();
        });
      }}
    >
      <Field label="Non konplè ou">
        <input name="full_name" required maxLength={80} defaultValue={defaultName} placeholder="Egz: Jean Marc Pierre" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imèl">
          <input name="email" type="email" required defaultValue={defaultEmail} placeholder="ou@egzanp.com" className={inputClass} />
        </Field>
        <Field label="📱 Telefòn / WhatsApp (pou peman MonCash/NatCash)">
          <input name="phone" type="tel" required placeholder="+509 3412 3456" className={inputClass} />
        </Field>
      </div>
      <Field label="📍 Vil ou (opsyonèl)">
        <input name="city" maxLength={60} placeholder="Egz: Pòtoprens" className={inputClass} />
      </Field>
      <Field label="Kijan w ap ede atis yo enskri? (opsyonèl)">
        <textarea
          name="motivation"
          rows={3}
          maxLength={500}
          placeholder="Egz: Mwen konnen anpil atis nan katye m, mwen gen yon gwoup WhatsApp mizik…"
          className={`${inputClass} resize-y`}
        />
      </Field>
      <FormMessage error={error} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#FFD700] px-6 py-3.5 text-base font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Ap voye…" : "🤝 Voye demann mwen"}
      </button>
    </form>
  );
}
