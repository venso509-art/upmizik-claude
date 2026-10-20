"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useFormStatus } from "react-dom";

export const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30";

// ✕ pou kite paj Konekte/Enskri: retounen kote moun nan te ye, oswa sou paj akèy la
function CloseButton() {
  const router = useRouter();
  const close = useCallback(() => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
    else router.push("/");
  }, [router]);

  useEffect(() => {
    // Pa kite paj la si yon pop-up louvri (egz: enskripsyon atis la), pou moun nan pa pèdi sa l ranpli
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[role="dialog"]') && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <button
      type="button"
      onClick={close}
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
      aria-label="Fèmen"
      title="Fèmen (Esc)"
    >
      ✕
    </button>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  closable = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  closable?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl shadow-fuchsia-950/20 backdrop-blur">
        {closable && <CloseButton />}
        <h1 className="pr-8 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Tann yon ti moman..." : children}
    </button>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return <p className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>;
  }
  if (message) {
    return <p className="rounded-lg border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">{message}</p>;
  }
  return null;
}
