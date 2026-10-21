"use client";

import { AccountName, AccountNameHint } from "@/components/payment/AccountName";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { signupArtist, type ArtistSignupResult } from "@/app/auth/actions";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import { useSettings } from "@/components/SettingsProvider";
import { methodNumber, registrationFeeHtg } from "@/lib/settings";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { ArtistRules } from "./ArtistRules";
import { Portal } from "@/components/Portal";

type Step = "rules" | "payment" | "done";

// Pop-up enskripsyon atis: 1) règ yo  2) peman + prèv  3) mesaj final
export function ArtistSignupModal({ info, onClose }: { info: FormData; onClose: () => void }) {
  const settings = useSettings();
  const feeHtg = registrationFeeHtg(settings);
  const [step, setStep] = useState<Step>("rules");
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ArtistSignupResult>();
  const [pending, startTransition] = useTransition();
  const m = { ...DONATION_METHODS[method], number: methodNumber(settings, method) };
  const name = String(info.get("display_name") ?? "");

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

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

  function submit() {
    if (!proof) return setError("Ajoute foto prèv peman an.");
    setError(undefined);
    const fd = new FormData();
    info.forEach((v, k) => fd.append(k, v));
    fd.set("method", method);
    fd.set("transaction_ref", transactionRef);
    fd.set("proof", proof);
    startTransition(async () => {
      const res = await signupArtist(fd);
      if (res.error) setError(res.error);
      else {
        setResult(res);
        setStep("done");
      }
    });
  }

  const steps: { key: Step; label: string }[] = [
    { key: "rules", label: "Règ yo" },
    { key: "payment", label: "Peman" },
    { key: "done", label: "Fini" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="artist-signup-title" className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-3xl">
        {/* ===== TÈT ===== */}
        <div className="relative bg-gradient-to-br from-fuchsia-600 to-violet-700 px-6 pb-5 pt-6">
          {step !== "done" && (
            <button
              onClick={onClose}
              disabled={pending}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40"
              aria-label="Fèmen"
            >
              ✕
            </button>
          )}
          <h2 id="artist-signup-title" className="pr-10 text-xl font-extrabold text-white">
            {step === "done" ? "🎉 Demann ou an voye!" : `🎤 Byenvini, ${name}!`}
          </h2>
          <div className="mt-4 flex gap-1.5">
            {steps.map((s, i) => (
              <div key={s.key} className="flex-1">
                <span className={`block h-1 rounded-full ${i <= stepIndex ? "bg-white" : "bg-white/25"}`} />
                <span className={`mt-1 block text-[11px] ${i <= stepIndex ? "text-white" : "text-white/50"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ===== ETAP 1: RÈG YO ===== */}
          {step === "rules" && (
            <div className="space-y-5">
              <p className="text-sm text-zinc-300">Anvan ou kòmanse, men tout sa ou dwe konnen sou fason UpMizik mache pou atis yo:</p>
              <ArtistRules />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 p-4 text-sm text-zinc-300">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-fuchsia-500" />
                Mwen li epi mwen dakò ak règ sa yo.
              </label>
              <button
                type="button"
                onClick={() => setStep("payment")}
                disabled={!accepted}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                Kontinye: peye frè enskripsyon an
              </button>
            </div>
          )}

          {/* ===== ETAP 2: PEMAN + PRÈV ===== */}
          {step === "payment" && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-zinc-950 p-5 text-center">
                <p className="text-sm text-zinc-400">Frè enskripsyon atis (yon sèl fwa)</p>
                <p className="mt-1 text-4xl font-extrabold text-white">{formatUSD(settings.registrationFeeUsd)}</p>
                <p className="mt-1 text-lg font-semibold text-fuchsia-300">= {formatHTG(feeHtg)}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white">Chwazi mwayen peman ou</p>
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
                      <span className="mt-2 block text-sm tabular-nums text-zinc-300">{methodNumber(settings, key)}</span>
                    <AccountName compact />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                Voye <span className="font-semibold text-white">{formatHTG(feeHtg)}</span> sou{" "}
                <span className="font-semibold text-white">{m.label}</span> nan nimewo sa a:
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3">
                  <span className="text-2xl font-bold tracking-wider text-white tabular-nums">{m.number}</span>
                  <button type="button" onClick={copyNumber} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">
                    {copied ? "✓ Kopye" : "Kopye"}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <AccountName />
                  <AccountNameHint />
                </div>
                <p className="mt-2 text-xs text-zinc-500">Apre sa, pran yon foto ekran (screenshot) mesaj konfimasyon an.</p>
              </div>

              <label
                className={`relative flex min-h-[8rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-fuchsia-500 ${
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
                <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickProof(e.target.files?.[0])} />
              </label>

              <input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                maxLength={100}
                disabled={pending}
                placeholder="Nimewo tranzaksyon an (opsyonèl)"
                className={inputClass}
              />

              <FormMessage error={error} />

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("rules")} disabled={pending} className="rounded-xl px-4 py-3 text-zinc-400 hover:text-white">
                  ← Retounen
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Ap kreye kont ou..." : "Voye demann mwen"}
                </button>
              </div>
            </div>
          )}

          {/* ===== ETAP 3: MESAJ FINAL ===== */}
          {step === "done" && (
            <div className="space-y-4">
              {result?.needsEmailConfirmation && (
                <div className="flex gap-3 rounded-2xl border border-sky-800/60 bg-sky-950/40 p-4">
                  <span className="text-2xl">📧</span>
                  <div className="text-sm text-sky-100">
                    <p className="font-semibold">Konfime imèl ou</p>
                    <p className="mt-1 text-sky-100/80">
                      Nou voye yon lyen konfimasyon bay <span className="font-semibold">{result.email}</span>. Klike sou li pou w aktive kont ou
                      (gade nan Spam tou).
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 rounded-2xl border border-amber-800/60 bg-amber-950/40 p-4">
                <span className="text-2xl">🛡️</span>
                <div className="text-sm text-amber-100">
                  <p className="font-semibold">Demann ou an ale bò kot ekip UpMizik la</p>
                  <p className="mt-1 text-amber-100/80">
                    Admin nan ap verifye prèv peman an. Kont ou an <span className="font-semibold">standby</span> jiskaske li valide l:
                    ekip la ap kontakte w sou imèl oswa WhatsApp. Depi l valide, w ap ka konekte, antre nan espas atis ou epi pibliye
                    mizik ou.
                  </p>
                </div>
              </div>
              <Link href="/" className="block w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 text-center font-semibold text-white">
                Retounen sou paj akèy la
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}
