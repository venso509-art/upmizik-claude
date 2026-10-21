"use client";

import { useState, useTransition } from "react";
import { closeMonth } from "@/app/admin/relve/actions";

export function CloseMonthButton({ month, label }: { month: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          if (!confirm(`Fèmen ${label}?\n\nChif yo ap JELE nan achiv la pou toutan, e yo p ap ka chanje ankò.`)) return;
          setError(undefined);
          startTransition(async () => {
            const res = await closeMonth(month);
            if (res.error) setError(res.error);
          });
        }}
        className="btn-primary rounded-full px-4 py-1.5 text-sm disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Ap fèmen…" : "🔒 Fèmen mwa a"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
