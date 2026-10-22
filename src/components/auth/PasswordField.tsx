"use client";

import { useState } from "react";
import { inputClass } from "@/components/auth/ui";
import { passwordChecks, passwordScore } from "@/lib/password";

const LEVELS = [
  { label: "Fèb", bar: "bg-red-500", text: "text-red-400", width: "w-1/4" },
  { label: "Mwayen", bar: "bg-amber-500", text: "text-amber-300", width: "w-2/4" },
  { label: "Bon", bar: "bg-emerald-500", text: "text-emerald-300", width: "w-3/4" },
  { label: "Fò 💪", bar: "bg-emerald-400", text: "text-emerald-300", width: "w-full" },
];

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

// Chan modpas ak yon ti je pou wè sa w ap tape, epi (si showStrength) yon ba fòs an dirèk
export function PasswordField({
  name = "password",
  autoComplete = "new-password",
  placeholder,
  showStrength = false,
}: {
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const score = passwordScore(value);
  const level = LEVELS[score];

  return (
    <div>
      <div className="relative">
        <input
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} pr-12`}
          aria-describedby={showStrength ? `${name}-strength` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          aria-label={visible ? "Kache modpas la" : "Montre modpas la"}
          title={visible ? "Kache modpas la" : "Montre modpas la"}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {showStrength && value && (
        <div id={`${name}-strength`} className="mt-2 space-y-2" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full transition-all ${level.bar} ${level.width}`} />
            </div>
            <span className={`text-xs font-semibold ${level.text}`}>{level.label}</span>
          </div>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {passwordChecks(value).map((c) => (
              <li key={c.label} className={c.ok ? "text-emerald-300" : "text-zinc-500"}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
