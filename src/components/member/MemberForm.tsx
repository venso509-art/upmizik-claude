"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestMembership } from "@/app/manm/actions";
import { Field, FormMessage, inputClass } from "@/components/auth/ui";
import { IdentityUpload, type IdentityFiles } from "@/components/member/IdentityUpload";

// Fòm "Vin manm afilye": demann nan ale bay admin nan pou l apwouve l
export function MemberForm({ defaultNickname, defaultEmail }: { defaultNickname: string; defaultEmail: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [identity, setIdentity] = useState<IdentityFiles>({ selfie: null, idDoc: null, idType: null });
  const identityReady = !!identity.selfie && !!identity.idDoc && !!identity.idType;

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
        if (!identityReady) return setError("Ajoute foto figi ou ak foto pyès idantite ou anvan w voye demann nan.");
        fd.set("selfie", identity.selfie!);
        fd.set("id_doc", identity.idDoc!);
        fd.set("id_type", identity.idType!);
        startTransition(async () => {
          const res = await requestMembership(fd);
          if (res.error) return setError(res.error);
          setDone(true);
          router.refresh();
        });
      }}
    >
      <Field label="Vrè non ak siyati ou (pou kontra a ak peman yo)">
        <input name="full_name" required maxLength={80} placeholder="Egz: Jean Marc Pierre" className={inputClass} />
      </Field>
      <Field label="Non jwèt ou oswa non atis ou">
        <input name="nickname" required maxLength={40} defaultValue={defaultNickname} placeholder="Egz: Ti Jo, Venso Music" className={inputClass} />
      </Field>
      {/* Sèks */}
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-zinc-300">Sèks</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["fi", "👩", "Fi"],
              ["gason", "👨", "Gason"],
            ] as const
          ).map(([value, icon, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-semibold text-zinc-200 transition has-[:checked]:border-[#FFD700] has-[:checked]:bg-[#FFD700]/10 has-[:checked]:text-white"
            >
              <input type="radio" name="sex" value={value} required className="sr-only" />
              <span aria-hidden>{icon}</span> {label}
            </label>
          ))}
        </div>
      </fieldset>
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
      {/* Verifikasyon idantite: selfie + paspò oswa kat idantite nasyonal */}
      <IdentityUpload value={identity} onChange={setIdentity} />
      <FormMessage error={error} />
      <button
        type="submit"
        disabled={pending || !identityReady}
        className="w-full rounded-full bg-[#FFD700] px-6 py-3.5 text-base font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/20 transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Ap voye foto yo ak demann nan…" : identityReady ? "🤝 Voye demann mwen" : "📷 Ajoute 2 foto yo pou w kontinye"}
      </button>
    </form>
  );
}
