"use client";

import Link from "next/link";
import { useEffect } from "react";

// Paj erè pou yon paj ki kraze (header a ak footer a rete). An pwodiksyon, Next.js kache
// mesaj erè sèvè yo: nou montre "digest" la, ki pèmèt jwenn mesaj konplè a nan Logs Coolify.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[UpMizik] Erè paj:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-6xl">😵</p>
      <h1 className="mt-4 text-2xl font-extrabold text-white">Oups, gen yon bagay ki pa mache</h1>
      <p className="mt-2 text-zinc-400">Paj sa a rankontre yon erè. Eseye ankò, oswa retounen sou paj akèy la.</p>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left text-xs text-zinc-400">
        <p className="break-words font-mono text-red-300">{error.message || "Erè enkoni"}</p>
        {error.digest && <p className="mt-2 font-mono">Kòd erè (digest): {error.digest}</p>}
        <p className="mt-2">
          Admin: louvri{" "}
          <a href="/sante" className="text-fuchsia-400 underline">
            /sante
          </a>{" "}
          pou dyagnostik, oswa chèche kòd la nan Logs Coolify.
        </p>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-6 py-3 font-semibold text-white">
          Eseye ankò
        </button>
        <Link href="/" className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 hover:border-zinc-500">
          Paj akèy
        </Link>
      </div>
    </div>
  );
}
