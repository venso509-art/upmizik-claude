"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { requestCreditPurchase } from "@/app/kredi/actions";
import { AccountName, AccountNameHint } from "@/components/payment/AccountName";
import { ProofCropButton } from "@/components/media/ProofCropButton";
import { useSettings } from "@/components/SettingsProvider";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import { methodNumber } from "@/lib/settings";
import { CREDIT_PACKS, MAX_CREDITS, MIN_CREDITS, creditsToHtg, formatCredits } from "@/lib/credits";

// Achte kredi: chwazi yon pake (oswa yon kantite), peye sou MonCash/NatCash, voye prèv la → admin valide
export function CreditShop({ creditHtg }: { creditHtg: number }) {
  const router = useRouter();
  const settings = useSettings();
  const [credits, setCredits] = useState(CREDIT_PACKS[1]);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const amount = creditsToHtg(credits, creditHtg);
  const number = methodNumber(settings, method);

  useEffect(() => {
    if (!proof) return setPreview(null);
    const u = URL.createObjectURL(proof);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [proof]);

  function pickProof(file: File | undefined) {
    setError(undefined);
    if (!file) return;
    if (!IMAGE_TYPES[fileExtension(file)]) return setError("Prèv la dwe yon foto JPG, PNG oswa WebP.");
    if (file.size > MAX_IMAGE_BYTES) return setError("Foto a twò gwo. Maksimòm: 5 MB.");
    setProof(file);
  }

  function submit() {
    if (credits < MIN_CREDITS || credits > MAX_CREDITS) return setError(`Chwazi ant ${MIN_CREDITS} ak ${MAX_CREDITS.toLocaleString("fr-HT")} kredi.`);
    if (!proof) return setError("Ajoute foto prèv peman an.");
    setError(undefined);
    const fd = new FormData();
    fd.set("credits", String(credits));
    fd.set("method", method);
    fd.set("transaction_ref", ref);
    fd.set("proof", proof);
    startTransition(async () => {
      const res = await requestCreditPurchase(fd);
      if (res.error) return setError(res.error);
      setDone(true);
      setProof(null);
      setRef("");
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
        <p className="text-lg font-bold text-white">✅ Demann ou an voye!</p>
        <p className="mt-1">Ekip UpMizik la ap verifye peman an. Kredi yo ap antre nan bous ou depi l valide, e w ap resevwa yon notifikasyon.</p>
        <button type="button" onClick={() => setDone(false)} className="mt-4 rounded-xl border border-emerald-400/40 px-4 py-2 font-semibold text-white">
          Achte plis kredi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Pake yo */}
      <section>
        <p className="mb-3 text-sm font-semibold text-white">1. Chwazi kantite kredi</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CREDIT_PACKS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setCredits(p);
                setCustom("");
              }}
              className={`rounded-2xl border p-3 text-center transition ${credits === p && !custom ? "border-citron-400 bg-citron-400/10" : "border-zinc-700 hover:border-zinc-500"}`}
            >
              <span className="block text-xl">🪙</span>
              <span className="block font-extrabold text-white">{p.toLocaleString("fr-HT")}</span>
              <span className="block text-[11px] text-zinc-400">{formatHTG(creditsToHtg(p, creditHtg))}</span>
            </button>
          ))}
        </div>
        <input
          inputMode="numeric"
          value={custom}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCustom(v);
            if (v) setCredits(Number(v));
          }}
          placeholder={`Oswa ekri yon lòt kantite (${MIN_CREDITS} a ${MAX_CREDITS.toLocaleString("fr-HT")})`}
          className={`${inputClass} mt-3`}
        />
        <p className="mt-2 text-sm text-zinc-300">
          <span className="font-bold text-white">{formatCredits(credits)}</span> = <span className="font-bold text-citron-300">{formatHTG(amount)}</span>
        </p>
      </section>

      {/* 2. Peman */}
      <section>
        <p className="mb-3 text-sm font-semibold text-white">2. Voye peman an</p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethod(key)}
              className={`rounded-2xl border p-4 text-left transition ${method === key ? "border-citron-400 bg-citron-400/10" : "border-zinc-700 hover:border-zinc-500"}`}
            >
              <span className={`inline-block rounded-lg bg-gradient-to-r px-2.5 py-1 text-sm font-bold text-white ${DONATION_METHODS[key].color}`}>{DONATION_METHODS[key].label}</span>
              <span className="mt-2 block text-sm tabular-nums text-zinc-300">{methodNumber(settings, key)}</span>
              <AccountName compact />
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
          Voye <span className="font-semibold text-white">{formatHTG(amount)}</span> sou <span className="font-semibold text-white">{DONATION_METHODS[method].label}</span>:
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3">
            <span className="text-2xl font-bold tracking-wider text-white tabular-nums">{number}</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(number.replace(/\s/g, ""));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              {copied ? "✓ Kopye" : "Kopye"}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <AccountName />
            <AccountNameHint />
          </div>
        </div>
      </section>

      {/* 3. Prèv */}
      <section>
        <p className="mb-3 text-sm font-semibold text-white">3. Voye foto prèv la</p>
        <label
          className={`relative flex min-h-[8rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-citron-400 ${
            pending ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Prèv peman" className="max-h-52 w-full object-contain" />
          ) : (
            <>
              <span className="text-3xl">📸</span>
              <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi foto prèv la</span>
              <span className="text-xs text-zinc-500">JPG, PNG, WebP · Maks 5 MB</span>
            </>
          )}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => {
              pickProof(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {proof && (
          <div className="mt-2">
            <ProofCropButton file={proof} onChange={setProof} disabled={pending} />
          </div>
        )}
        <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} placeholder="Nimewo tranzaksyon an (opsyonèl)" className={`${inputClass} mt-3`} />
      </section>

      <FormMessage error={error} />
      <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-60">
        {pending ? "Ap voye…" : `🪙 Mwen peye ${formatHTG(amount)}, voye demann nan`}
      </button>
    </div>
  );
}
