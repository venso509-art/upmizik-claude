"use client";

// Enprime paj la (oswa sove l an PDF nan fenèt enprimant lan)
export function PrintButton({ label = "🖨️ Enprime / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-citron-400 hover:text-white"
    >
      {label}
    </button>
  );
}
