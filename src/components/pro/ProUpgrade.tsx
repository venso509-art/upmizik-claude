"use client";

import { ProofCropButton } from "@/components/media/ProofCropButton";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { requestPro } from "@/app/pro/actions";
import { AccountName, AccountNameHint } from "@/components/payment/AccountName";
import { useSettings } from "@/components/SettingsProvider";
import { Portal } from "@/components/Portal";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { ProBadge } from "@/components/pro/ProBadge";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import { methodNumber, usdToHtg } from "@/lib/settings";
import { PRO_BENEFITS, isPro } from "@/lib/pro";

type Step = "intro" | "payment" | "done";

// Pri a toujou ak 2 chif apre vigil ($5.50, pa $5.5)
const priceUsd = (n: number) => `$${n.toFixed(2)}`;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "long", year: "numeric" });

// Ti notifikasyon bò pwofil atis la: "Vin Pro" (oswa estati Pro li), ak pop-up peman an.
// pending = atis la voye yon prèv ki ap tann validasyon admin (badj la poko parèt).
export function ProUpgrade({ proUntil, pending = false }: { proUntil: string | null; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  const pro = isPro(proUntil);

  return (
    <>
      {pending && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
          <span className="text-2xl" aria-hidden>
            ⏳
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-white">{pro ? "Pwolonjman Pro ou ap tann validasyon" : "Demann Pro ou an ap tann validasyon"}</p>
            <p className="text-zinc-300">Ekip UpMizik la ap verifye peman an. W ap resevwa yon notifikasyon depi yo valide l.</p>
          </div>
        </div>
      )}
      {pending && !pro ? null : pro ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-citron-400/40 bg-gradient-to-r from-citron-400/15 to-amber-500/10 p-4">
          <span className="text-2xl" aria-hidden>
            ⭐
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="flex items-center gap-2 font-bold text-white">
              Ou se atis <ProBadge size="md" />
            </p>
            <p className="text-zinc-300">Aktif jiska {formatDate(proUntil!)}.</p>
          </div>
          {!pending && (
            <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-citron-300 hover:text-citron-200">
              Pwolonje →
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-citron-400/50 bg-gradient-to-r from-citron-400/20 via-amber-500/10 to-transparent p-4 text-left transition hover:border-citron-300"
        >
          <span className="absolute right-3 top-3 flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-citron-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-citron-400" />
          </span>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-citron-400 text-2xl text-zinc-950 shadow-lg shadow-citron-400/30 transition group-hover:scale-105"
            aria-hidden
          >
            ⭐
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-white">Aplike pou yon pwofil Pro</span>
            <span className="block text-sm text-zinc-300">Badj PRO, ou parèt an premye, chante an vedèt ak plis ankò.</span>
          </span>
          <span className="shrink-0 rounded-full bg-citron-400 px-3 py-1.5 text-sm font-bold text-zinc-950">Wè l</span>
        </button>
      )}
      {open && <ProModal renewing={pro} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProModal({ renewing, onClose }: { renewing: boolean; onClose: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const priceHtg = usdToHtg(settings.proPriceUsd, settings);
  const [step, setStep] = useState<Step>("intro");
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const number = methodNumber(settings, method);

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
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function submit() {
    if (!proof) return setError("Ajoute foto prèv peman an.");
    setError(undefined);
    const fd = new FormData();
    fd.set("method", method);
    fd.set("transaction_ref", transactionRef);
    fd.set("proof", proof);
    startTransition(async () => {
      const res = await requestPro(fd);
      if (res.error) return setError(res.error);
      setStep("done");
    });
  }

  function close() {
    if (pending) return;
    onClose();
    if (step === "done") router.refresh();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-title"
          className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== TÈT ===== */}
          <div className="relative bg-gradient-to-br from-citron-400 via-amber-500 to-fuchsia-700 px-6 pb-6 pt-7">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
              aria-label="Fèmen"
            >
              ✕
            </button>
            <p className="text-4xl" aria-hidden>
              {step === "done" ? "⏳" : "⭐"}
            </p>
            <h2 id="pro-title" className="mt-2 pr-10 text-2xl font-extrabold text-zinc-950">
              {step === "done" ? "Demann ou an voye!" : renewing ? "Pwolonje pwofil Pro ou" : "Vin atis Pro"}
            </h2>
            {step !== "done" && (
              <p className="mt-1 text-sm font-semibold text-zinc-900/80">
                {priceUsd(settings.proPriceUsd)} = {formatHTG(priceHtg)} · valab {settings.proMonths} mwa
              </p>
            )}
          </div>

          <div className="space-y-5 p-6">
            {/* ===== ETAP 1: AVANTAJ YO ===== */}
            {step === "intro" && (
              <>
                <p className="text-sm text-zinc-300">Men sa pwofil Pro a ba ou:</p>
                <ul className="space-y-3">
                  {PRO_BENEFITS.map((b) => (
                    <li key={b.title} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-citron-400/15 text-lg" aria-hidden>
                        {b.icon}
                      </span>
                      <span className="text-sm">
                        <span className="block font-semibold text-white">{b.title}</span>
                        <span className="text-zinc-400">{b.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl bg-zinc-950 p-4 text-sm text-zinc-300">
                  <p className="font-semibold text-white">Kijan sa mache (3 etap senp):</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>
                      Voye <strong className="text-white">{formatHTG(priceHtg)}</strong> ({priceUsd(settings.proPriceUsd)}) sou MonCash oswa NatCash.
                    </li>
                    <li>Pran yon foto ekran mesaj konfimasyon an.</li>
                    <li>Voye foto a isit la. Depi ekip la valide peman an, pwofil Pro ou aktive.</li>
                  </ol>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row-reverse">
                  <button type="button" onClick={() => setStep("payment")} className="btn-primary flex-1 rounded-xl px-4 py-3 font-semibold">
                    ⭐ Wi, mwen vle vin Pro
                  </button>
                  <button type="button" onClick={close} className="rounded-xl px-4 py-3 text-zinc-400 hover:text-white">
                    Pa kounye a
                  </button>
                </div>
              </>
            )}

            {/* ===== ETAP 2: PEMAN + PRÈV ===== */}
            {step === "payment" && (
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Chwazi mwayen peman ou</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMethod(key)}
                        className={`rounded-2xl border p-4 text-left transition ${method === key ? "border-citron-400 bg-citron-400/10" : "border-zinc-700 hover:border-zinc-500"}`}
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
                  Voye <span className="font-semibold text-white">{formatHTG(priceHtg)}</span> sou{" "}
                  <span className="font-semibold text-white">{DONATION_METHODS[method].label}</span> nan nimewo sa a:
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3">
                    <span className="text-2xl font-bold tracking-wider text-white tabular-nums">{number}</span>
                    <button type="button" onClick={copyNumber} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700">
                      {copied ? "✓ Kopye" : "Kopye"}
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <AccountName />
                    <AccountNameHint />
                  </div>
                </div>

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
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => { pickProof(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {proof && <ProofCropButton file={proof} onChange={setProof} disabled={pending} />}

                <input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  maxLength={60}
                  disabled={pending}
                  placeholder="Nimewo tranzaksyon an (opsyonèl)"
                  className={inputClass}
                />

                <FormMessage error={error} />

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep("intro")} disabled={pending} className="rounded-xl px-4 py-3 text-zinc-400 hover:text-white">
                    ← Retounen
                  </button>
                  <button type="button" onClick={submit} disabled={pending} className="btn-primary flex-1 rounded-xl px-4 py-3 font-semibold disabled:opacity-60">
                    {pending ? "Ap voye…" : "✅ Voye demann mwen"}
                  </button>
                </div>
              </>
            )}

            {/* ===== ETAP 3: DEMANN NAN VOYE ===== */}
            {step === "done" && (
              <>
                <p className="text-zinc-300">
                  Mèsi! Ekip UpMizik la ap verifye peman an. Depi yo valide l, badj <ProBadge /> la ap parèt sou pwofil ou epi tout avantaj Pro
                  yo ap aktive.
                </p>
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                  W ap resevwa yon notifikasyon sou UpMizik lè demann ou an valide.
                </p>
                <button type="button" onClick={close} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold">
                  Dakò
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
