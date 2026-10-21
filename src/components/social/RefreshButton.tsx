"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Rechaje feed la san rechaje tout paj la
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="flex h-[58px] shrink-0 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-5 text-sm font-semibold text-zinc-200 shadow-lg shadow-black/30 transition hover:border-fuchsia-500 hover:text-white disabled:opacity-70"
      aria-label="Rafrechi feed la"
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${pending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span className="hidden sm:inline">{pending ? "Ap rafrechi…" : "Rafrechi"}</span>
    </button>
  );
}
