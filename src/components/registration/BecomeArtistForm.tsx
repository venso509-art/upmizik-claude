"use client";

import { useState } from "react";
import { LocationSelect } from "@/components/LocationSelect";
import { ArtistSignupModal } from "@/components/registration/ArtistSignupModal";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";
import { formatUSD } from "@/lib/donations";
import { useSettings } from "@/components/SettingsProvider";
import { ReferralField } from "@/components/auth/ReferralField";

const pinClass = `${inputClass} tracking-[0.5em]`;

// Koutè → atis: rès kondisyon yo (non atis, telefòn, zòn, PIN), epi pop-up règ + peman an (menm jan ak enskripsyon atis la)
export function BecomeArtistForm({ name, location, referral = "" }: { name: string; location: string | null; referral?: string }) {
  const settings = useSettings();
  const [info, setInfo] = useState<FormData | null>(null);
  const [error, setError] = useState<string>();

  function next(fd: FormData) {
    const pin = String(fd.get("pin") ?? "");
    if (String(fd.get("display_name") ?? "").trim().length < 2) return setError("Mete non atis ou.");
    if (String(fd.get("phone") ?? "").replace(/\D/g, "").length < 8) return setError("Mete yon nimewo telefòn/WhatsApp valid.");
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN nan dwe gen 4 a 6 chif.");
    if (pin !== fd.get("pin_confirm")) return setError("2 PIN yo pa menm.");
    setError(undefined);
    setInfo(fd);
  }

  return (
    <>
      <form action={next} className="space-y-5">
        <Field label="🎤 Non atis ou (jan fanatik yo ap wè l)">
          <input name="display_name" required maxLength={80} defaultValue={name} className={inputClass} />
        </Field>
        <Field label="📱 Telefòn / WhatsApp">
          <input name="phone" type="tel" required autoComplete="tel" placeholder="Egz: +509 3412 3456" className={inputClass} />
        </Field>
        <Field label="📍 Zòn ou (l ap parèt sou paj atis ou)">
          <LocationSelect required defaultValue={location} />
        </Field>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm font-semibold text-white">🔐 PIN retrè</p>
          <p className="mt-0.5 text-xs text-zinc-500">4 a 6 chif. W ap bezwen l pou konfime chak fwa w retire lajan. Pa pataje l ak pèsonn.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input name="pin" type="password" inputMode="numeric" autoComplete="off" required pattern="\d{4,6}" maxLength={6} placeholder="PIN" aria-label="PIN" className={pinClass} />
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
        {/* Pseudo manm afilye ki envite l la (lyen ?ref= la ranpli l otomatikman) */}
        <ReferralField initial={referral} />
        <p className="text-xs text-zinc-500">
          Etap apre a: règ atis yo, epi frè enskripsyon an ({formatUSD(settings.registrationFeeUsd)}) sou MonCash oswa NatCash.
        </p>
        <FormMessage error={error} />
        <SubmitButton>Kontinye →</SubmitButton>
      </form>
      {info && <ArtistSignupModal info={info} upgrade onClose={() => setInfo(null)} />}
    </>
  );
}
