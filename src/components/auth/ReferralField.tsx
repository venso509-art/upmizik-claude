"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "./ui";

// Bwat "Pseudo manm" nan enskripsyon atis la: si yon manm afilye te envite atis la, li mete pseudo a
// (oswa lyen ?ref= la ranpli l). Nou tcheke l pandan l ap tape.
export function ReferralField({ initial = "" }: { initial?: string }) {
  const [code, setCode] = useState(initial.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20));
  const [state, setState] = useState<{ ok: boolean; name?: string } | null>(null);

  useEffect(() => {
    if (code.length < 4) return setState(null);
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("check_referral", { p_code: code });
      setState(typeof data === "string" && data ? { ok: true, name: data } : { ok: false });
    }, 450);
    return () => clearTimeout(t);
  }, [code]);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">🤝 Pseudo manm (opsyonèl)</span>
      <input
        name="referral"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
        placeholder="Egz: VENSO2026"
        autoCapitalize="characters"
        className={`${inputClass} font-semibold tracking-wider`}
      />
      {state?.ok && (
        <p className="mt-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          ✓ Pseudo {state.name} valid! Lè ekip la apwouve kont ou, w ap jwenn <strong>2 jou promo</strong> sou UpMizik 🎉
        </p>
      )}
      {state && !state.ok && <p className="mt-1.5 text-xs text-amber-300">Nou pa jwenn pseudo sa a. Tcheke l, oswa kite bwat la vid.</p>}
      {!state && <p className="mt-1 text-xs text-zinc-500">Si yon manm UpMizik te envite w, mete pseudo li la.</p>}
    </div>
  );
}
