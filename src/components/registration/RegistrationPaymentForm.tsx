"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { REGISTRATION_FEE_HTG, REGISTRATION_FEE_USD } from "@/lib/registration";
import { FormMessage, inputClass } from "@/components/auth/ui";

export function RegistrationPaymentForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const m = DONATION_METHODS[method];

  useEffect(() => {
    if (!proof) return setPreview(null);
    const url = URL.createObjectURL(proof);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  function pickProof(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Prèv la dwe yon foto JPG, PNG oswa WebP.");
    if (file.size > MAX_IMAGE_BYTES) return setError("Foto a twò gwo. Maksimòm: 5 MB.");
    setProof(file);
  }

  async function copyNumber() {
    await navigator.clipboard.writeText(m.number.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submit() {
    if (!proof) return setError("Ajoute foto prèv peman an.");
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    try {
      const ext = fileExtension(proof);
      const path = `registration/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("donation-proofs")
        .upload(path, proof, { contentType: IMAGE_TYPES[ext], upsert: false });
      if (uploadError) throw new Error(`Foto a pa monte: ${uploadError.message}`);

      const { error: insertError } = await supabase.from("artist_registrations").insert({
        artist_id: userId,
        method,
        amount_usd: REGISTRATION_FEE_USD,
        amount_htg: REGISTRATION_FEE_HTG,
        transaction_ref: transactionRef.trim() || null,
        proof_path: path,
      });
      if (insertError) {
        throw new Error(
          insertError.code === "23505" ? "Ou deja gen yon prèv k ap tann verifikasyon." : `Prèv la pa anrejistre: ${insertError.message}`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Montan an */}
      <div className="rounded-2xl bg-zinc-950 p-5 text-center">
        <p className="text-sm text-zinc-400">Frè enskripsyon atis (yon sèl fwa)</p>
        <p className="mt-1 text-4xl font-extrabold text-white">{formatUSD(REGISTRATION_FEE_USD)}</p>
        <p className="mt-1 text-lg font-semibold text-fuchsia-300">= {formatHTG(REGISTRATION_FEE_HTG)}</p>
      </div>

      {/* Metòd la */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMethod(key)}
            className={`rounded-2xl border p-4 text-left transition ${method === key ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-zinc-700 hover:border-zinc-500"}`}
          >
            <span className={`inline-block rounded-lg bg-gradient-to-r px-2.5 py-1 text-sm font-bold text-white ${DONATION_METHODS[key].color}`}>
              {DONATION_METHODS[key].label}
            </span>
            <span className="mt-2 block text-sm tabular-nums text-zinc-300">{DONATION_METHODS[key].number}</span>
          </button>
        ))}
      </div>

      {/* Enstriksyon */}
      <ol className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
        <li>
          <span className="font-bold text-fuchsia-300">1.</span> Voye <span className="font-semibold text-white">{formatHTG(REGISTRATION_FEE_HTG)}</span> sou{" "}
          <span className="font-semibold text-white">{m.label}</span> nan nimewo sa a:
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3">
            <span className="text-2xl font-bold tracking-wider text-white tabular-nums">{m.number}</span>
            <button type="button" onClick={copyNumber} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">
              {copied ? "✓ Kopye" : "Kopye"}
            </button>
          </div>
        </li>
        <li>
          <span className="font-bold text-fuchsia-300">2.</span> Pran yon foto ekran (screenshot) mesaj konfimasyon an.
        </li>
        <li>
          <span className="font-bold text-fuchsia-300">3.</span> Voye foto a anba a.
        </li>
      </ol>

      {/* Prèv la */}
      <label
        className={`relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-fuchsia-500 ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prèv peman" className="max-h-56 w-full object-contain" />
        ) : (
          <>
            <span className="text-3xl">📸</span>
            <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi foto prèv la</span>
            <span className="text-xs text-zinc-500">JPG, PNG, WebP · Maks 5 MB</span>
          </>
        )}
        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickProof(e.target.files?.[0])} />
      </label>

      <input
        value={transactionRef}
        onChange={(e) => setTransactionRef(e.target.value)}
        maxLength={100}
        placeholder="Nimewo tranzaksyon an (opsyonèl, men li ede admin nan)"
        disabled={busy}
        className={inputClass}
      />

      <FormMessage error={error} />

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Ap voye..." : "Voye prèv peman an"}
      </button>
    </div>
  );
}
