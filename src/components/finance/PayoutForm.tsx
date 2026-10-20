"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { requestPayout } from "@/app/dashboard/finans/actions";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { MIN_PAYOUT_HTG } from "@/lib/finance";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

export function PayoutForm({ availableHtg, disabledReason }: { availableHtg: number; disabledReason?: string }) {
  const [state, formAction] = useFormState(requestPayout, undefined);
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [amount, setAmount] = useState("");

  const value = Number(amount.replace(",", "."));
  const tooLow = amount !== "" && value < MIN_PAYOUT_HTG;
  const tooHigh = value > availableHtg;
  const canWithdraw = availableHtg >= MIN_PAYOUT_HTG && !disabledReason;

  if (!canWithdraw) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
        {disabledReason ??
          `Ou bezwen omwen ${formatHTG(MIN_PAYOUT_HTG)} disponib pou w mande yon retrè. Balans disponib ou: ${formatHTG(availableHtg)}.`}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="method" value={method} />
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMethod(key)}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              method === key ? "border-fuchsia-500 bg-fuchsia-500/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {DONATION_METHODS[key].label}
          </button>
        ))}
      </div>

      <Field label={`Nimewo ${DONATION_METHODS[method].label} ou`}>
        <input name="phone" type="tel" required placeholder="Egz: 3412 3456" className={inputClass} />
      </Field>

      <Field label="Montan (goud)">
        <div className="flex gap-2">
          <input
            name="amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder={`${MIN_PAYOUT_HTG} – ${Math.floor(availableHtg)}`}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setAmount(String(Math.floor(availableHtg * 100) / 100))}
            className="whitespace-nowrap rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Retire tout
          </button>
        </div>
      </Field>

      {tooLow && <FormMessage error={`Montan minimòm lan se ${formatHTG(MIN_PAYOUT_HTG)}.`} />}
      {tooHigh && <FormMessage error={`Montan an depase balans disponib ou (${formatHTG(availableHtg)}).`} />}
      <FormMessage error={state?.error} message={state?.message} />

      {tooLow || tooHigh ? (
        <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-zinc-800 px-4 py-3 font-semibold text-zinc-500">
          Mande retrè a
        </button>
      ) : (
        <SubmitButton>Mande retrè a</SubmitButton>
      )}
    </form>
  );
}
