"use client";

import { useState, useTransition } from "react";
import { setArchived, type ArchiveEntity } from "@/app/admin/achiv/actions";

export function ArchiveButton({ entity, id, archived, label }: { entity: ArchiveEntity; id: string; archived: boolean; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run() {
    const question = archived ? `Retabli « ${label} »? Li ap parèt ankò.` : `Achive « ${label} »? Li ap disparèt nan lis yo (san efase).`;
    if (!confirm(question)) return;
    startTransition(async () => setError((await setArchived(entity, id, !archived)).error));
  }

  return (
    <div className="text-right">
      <button
        onClick={run}
        disabled={pending}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          archived ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
        }`}
      >
        {pending ? "..." : archived ? "♻️ Retabli" : "🗄️ Achive"}
      </button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
