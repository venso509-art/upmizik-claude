"use client";

import { useSettings } from "@/components/SettingsProvider";

// Non ki sou kont MonCash/NatCash la: moun nan verifye l anvan l konfime transfè a
export function AccountName({ compact = false }: { compact?: boolean }) {
  const { accountName } = useSettings();
  if (compact) {
    return <span className="mt-0.5 block truncate text-xs text-zinc-400">👤 {accountName}</span>;
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg" aria-hidden>
        👤
      </span>
      <div className="min-w-0">
        <p className="text-xs text-emerald-200/80">Non ki sou kont lan</p>
        <p className="truncate text-lg font-bold text-white">{accountName}</p>
      </div>
      <span className="ml-auto shrink-0 text-xl text-emerald-300" aria-hidden>
        ✓
      </span>
    </div>
  );
}

export function AccountNameHint() {
  const { accountName } = useSettings();
  return (
    <p className="text-xs text-zinc-500">
      ⚠️ Anvan w konfime transfè a sou telefòn ou, verifye non ki parèt la se <strong className="text-zinc-300">{accountName}</strong>.
    </p>
  );
}
