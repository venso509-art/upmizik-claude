"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { updatePaymentSettings } from "@/app/admin/peman/actions";
import { formatHTG, formatUSD } from "@/lib/donations";
import { monthlyFeeHtg, registrationFeeHtg, usdToHtg, type AppSettings } from "@/lib/settings";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800/70 py-2.5 text-sm last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className="font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

export function PaymentSettingsForm({ initial }: { initial: AppSettings }) {
  const [state, formAction] = useFormState(updatePaymentSettings, undefined);
  const [s, setS] = useState<AppSettings>(initial);
  const set = (key: keyof AppSettings, numeric: boolean) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS((prev) => ({ ...prev, [key]: numeric ? Number(e.target.value.replace(",", ".")) || 0 : e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form action={formAction} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-lg font-bold text-white">💱 To echanj</h2>
          <div className="mt-4 max-w-xs">
            <Field label="Konbyen goud pou 1 $">
              <input name="htg_per_usd" inputMode="decimal" required defaultValue={initial.htgPerUsd} onChange={set("htgPerUsd", true)} className={inputClass} />
            </Field>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">📱 Nimewo ofisyèl platfòm nan</h2>
          <p className="text-sm text-zinc-500">Kote fanatik yo voye don yo ak kote atis yo peye frè enskripsyon an.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="MonCash">
              <input name="moncash_number" required maxLength={20} defaultValue={initial.moncashNumber} onChange={set("moncashNumber", false)} className={inputClass} />
            </Field>
            <Field label="NatCash">
              <input name="natcash_number" required maxLength={20} defaultValue={initial.natcashNumber} onChange={set("natcashNumber", false)} className={inputClass} />
            </Field>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">💵 Pri yo (an dola)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Frè enskripsyon atis">
              <input name="registration_fee_usd" inputMode="decimal" required defaultValue={initial.registrationFeeUsd} onChange={set("registrationFeeUsd", true)} className={inputClass} />
            </Field>
            <Field label="Don minimòm">
              <input name="min_donation_usd" inputMode="decimal" required defaultValue={initial.minDonationUsd} onChange={set("minDonationUsd", true)} className={inputClass} />
            </Field>
            <Field label="Frè mansyèl atis">
              <input name="monthly_fee_usd" inputMode="decimal" required defaultValue={initial.monthlyFeeUsd} onChange={set("monthlyFeeUsd", true)} className={inputClass} />
            </Field>
          </div>
        </div>

        <FormMessage error={state?.error} message={state?.message} />
        <SubmitButton>💾 Sove paramèt yo</SubmitButton>
      </form>

      {/* Apèsi an dirèk */}
      <aside className="h-fit rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-white">👀 Apèsi</h2>
        <p className="text-sm text-zinc-500">Sa moun yo ap wè sou sit la.</p>
        <div className="mt-4">
          <Preview label="To" value={`1 $ = ${s.htgPerUsd} goud`} />
          <Preview label="Frè enskripsyon" value={`${formatUSD(s.registrationFeeUsd)} = ${formatHTG(registrationFeeHtg(s))}`} />
          <Preview label="Don minimòm" value={`${formatUSD(s.minDonationUsd)} = ${formatHTG(usdToHtg(s.minDonationUsd, s))}`} />
          <Preview label="Don $10" value={formatHTG(usdToHtg(10, s))} />
          <Preview label="Frè mansyèl" value={`${formatUSD(s.monthlyFeeUsd)} = ${formatHTG(monthlyFeeHtg(s))}`} />
          <Preview label="MonCash" value={s.moncashNumber || "—"} />
          <Preview label="NatCash" value={s.natcashNumber || "—"} />
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          ℹ️ Don ak retrè ki deja fèt yo kenbe to yo te genyen jou yo te fèt la. Chak chanjman anrejistre nan 🔐 Jounal aktivite a.
        </p>
      </aside>
    </div>
  );
}
