"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { setWithdrawalPin } from "@/app/dashboard/finans/actions";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth/ui";

const pinInput = `${inputClass} tracking-[0.5em]`;

function PinInput({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <input
      name={name}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      required
      pattern="\d{4,6}"
      maxLength={6}
      placeholder={placeholder}
      className={pinInput}
    />
  );
}

// Kreye oswa chanje PIN retrè a (4 a 6 chif)
export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [state, formAction] = useFormState(setWithdrawalPin, undefined);
  const [open, setOpen] = useState(!hasPin);

  if (hasPin && !open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-emerald-300">🔐 PIN retrè ou aktif.</p>
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300">
          Chanje PIN nan
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {!hasPin && (
        <p className="text-sm text-zinc-400">
          Kreye yon PIN 4 a 6 chif. W ap bezwen l pou konfime chak retrè lajan. Pa pataje l ak pèsonn.
        </p>
      )}
      {hasPin && (
        <Field label="Ansyen PIN nan">
          <PinInput name="current" placeholder="••••" />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={hasPin ? "Nouvo PIN" : "PIN"}>
          <PinInput name="pin" placeholder="••••" />
        </Field>
        <Field label="Konfime PIN nan">
          <PinInput name="confirm" placeholder="••••" />
        </Field>
      </div>
      <FormMessage error={state?.error} message={state?.message} />
      <SubmitButton>{hasPin ? "Chanje PIN nan" : "Kreye PIN nan"}</SubmitButton>
    </form>
  );
}
