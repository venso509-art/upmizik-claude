"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import {
  DONATION_METHODS,
  DONATION_PRESETS_USD,
  HTG_PER_USD,
  MAX_DONATION_USD,
  MIN_DONATION_USD,
  formatHTG,
  formatUSD,
  toHTG,
  validateContact,
  type ContactType,
  type DonationMethod,
} from "@/lib/donations";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { DonateIcon } from "./DonateButton";

type Step = 1 | 2 | 3 | 4;

const primary =
  "w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-xl px-4 py-3 font-medium text-zinc-400 transition hover:text-white";

export function DonateModal({
  artistId,
  artistName,
  songId,
  songTitle,
  onClose,
}: {
  artistId: string;
  artistName: string;
  songId: string | null;
  songTitle: string | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [preset, setPreset] = useState<number | null>(10);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [contactType, setContactType] = useState<ContactType>("whatsapp");
  const [contact, setContact] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const amountUsd = preset ?? Number(custom.replace(",", "."));
  const amountValid = Number.isFinite(amountUsd) && amountUsd >= MIN_DONATION_USD && amountUsd <= MAX_DONATION_USD;
  const amountHtg = amountValid ? toHTG(amountUsd) : 0;
  const m = DONATION_METHODS[method];

  // Fèmen ak bouton Escape, epi bloke paj ki dèyè a pou l pa woule
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (!proof) return setProofPreview(null);
    const url = URL.createObjectURL(proof);
    setProofPreview(url);
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
    if (!proof) return setError("Ajoute foto prèv tranzaksyon an.");
    const contactError = validateContact(contactType, contact);
    if (contactError) return setError(contactError);

    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    try {
      const ext = fileExtension(proof);
      const proofPath = `pending/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("donation-proofs")
        .upload(proofPath, proof, { contentType: IMAGE_TYPES[ext], upsert: false });
      if (uploadError) throw new Error(`Foto prèv la pa monte: ${uploadError.message}`);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("donations").insert({
        artist_id: artistId,
        song_id: songId,
        amount_usd: amountUsd,
        exchange_rate: HTG_PER_USD,
        amount_htg: amountHtg,
        method,
        donor_name: donorName.trim() || null,
        contact_type: contactType,
        contact_value: contact.trim(),
        message: message.trim() || null,
        proof_path: proofPath,
        donor_id: user?.id ?? null,
      });
      if (insertError) throw new Error(`Don an pa anrejistre: ${insertError.message}`);

      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const forWhat = songTitle ? (
    <>
      pou chante <span className="font-semibold text-white">« {songTitle} »</span>
    </>
  ) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== TÈT ===== */}
        <div className="relative bg-gradient-to-br from-fuchsia-600 to-violet-700 px-6 pb-5 pt-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/40"
            aria-label="Fèmen"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white">
              <DonateIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 id="donate-title" className="text-lg font-bold text-white">
                Sipòte {artistName}
              </h2>
              {songTitle && <p className="truncate text-sm text-fuchsia-100">pou « {songTitle} »</p>}
            </div>
          </div>
          {step < 4 && (
            <div className="mt-5 flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-white" : "bg-white/25"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="p-6">
          {/* ===== ETAP 1: MONTAN ===== */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="font-semibold text-white">Konbyen ou vle bay?</p>
              <div className="grid grid-cols-3 gap-2">
                {DONATION_PRESETS_USD.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setPreset(v);
                      setCustom("");
                    }}
                    className={`rounded-xl border px-3 py-3 text-center transition ${
                      preset === v ? "border-fuchsia-500 bg-fuchsia-500/15 text-white" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    <span className="block text-lg font-bold">${v}</span>
                    <span className="block text-[11px] text-zinc-400">{formatHTG(toHTG(v))}</span>
                  </button>
                ))}
                <label
                  className={`flex items-center rounded-xl border px-3 transition ${
                    preset === null ? "border-fuchsia-500 bg-fuchsia-500/15" : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-lg font-bold text-zinc-400">$</span>
                  <input
                    inputMode="decimal"
                    value={custom}
                    onFocus={() => setPreset(null)}
                    onChange={(e) => {
                      setPreset(null);
                      setCustom(e.target.value.replace(/[^\d.,]/g, ""));
                    }}
                    placeholder="Lòt"
                    className="w-full bg-transparent py-3 pl-1 text-lg font-bold text-white placeholder:text-sm placeholder:font-normal placeholder:text-zinc-500 focus:outline-none"
                    aria-label="Lòt montan an dola"
                  />
                </label>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-4 text-center">
                {amountValid ? (
                  <>
                    <p className="text-3xl font-extrabold text-white">{formatUSD(amountUsd)}</p>
                    <p className="mt-1 text-fuchsia-300">= {formatHTG(amountHtg)}</p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">Montan minimòm lan se {formatUSD(MIN_DONATION_USD)}.</p>
                )}
                <p className="mt-2 text-xs text-zinc-500">To: 1 $ = {HTG_PER_USD} goud</p>
              </div>

              <button type="button" disabled={!amountValid} onClick={() => setStep(2)} className={primary}>
                Kontinye
              </button>
            </div>
          )}

          {/* ===== ETAP 2: METÒD AK ENSTRIKSYON ===== */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="font-semibold text-white">Ki jan w ap voye l?</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethod(key)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      method === key ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-zinc-700 hover:border-zinc-500"
                    }`}
                  >
                    <span className={`inline-block rounded-lg bg-gradient-to-r px-2.5 py-1 text-sm font-bold text-white ${DONATION_METHODS[key].color}`}>
                      {DONATION_METHODS[key].label}
                    </span>
                    <span className="mt-2 block text-sm tabular-nums text-zinc-300">{DONATION_METHODS[key].number}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <p className="text-sm text-zinc-400">Voye egzakteman:</p>
                <p className="text-3xl font-extrabold text-white">{formatHTG(amountHtg)}</p>
                <p className="text-sm text-zinc-400">
                  sou <span className="font-semibold text-white">{m.label}</span> nan nimewo sa a:
                </p>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3">
                  <span className="text-2xl font-bold tracking-wider text-white tabular-nums">{m.number}</span>
                  <button type="button" onClick={copyNumber} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-700">
                    {copied ? "✓ Kopye" : "Kopye"}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Apre w fin voye l, pran yon foto ekran (screenshot) mesaj konfimasyon an.</p>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className={secondary}>
                  ← Retounen
                </button>
                <button type="button" onClick={() => setStep(3)} className={primary}>
                  Mwen voye l, kontinye
                </button>
              </div>
            </div>
          )}

          {/* ===== ETAP 3: PRÈV AK KONTAK ===== */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 font-semibold text-white">Foto prèv tranzaksyon an</p>
                <label
                  className={`relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-fuchsia-500 ${
                    busy ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {proofPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proofPreview} alt="Prèv tranzaksyon" className="max-h-56 w-full object-contain" />
                  ) : (
                    <>
                      <span className="text-3xl">📸</span>
                      <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi foto a</span>
                      <span className="text-xs text-zinc-500">JPG, PNG, WebP · Maks 5 MB</span>
                    </>
                  )}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => pickProof(e.target.files?.[0])} />
                </label>
              </div>

              <div>
                <p className="mb-2 font-semibold text-white">Kote pou n voye w mesaj mèsi a?</p>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["whatsapp", "💬 WhatsApp"],
                      ["email", "✉️ Imèl"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setContactType(key);
                        setContact("");
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        contactType === key ? "border-fuchsia-500 bg-fuchsia-500/10 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type={contactType === "email" ? "email" : "tel"}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={contactType === "email" ? "ou@egzanp.com" : "+509 3412 3456"}
                  disabled={busy}
                  className={inputClass}
                  aria-label={contactType === "email" ? "Imèl" : "Nimewo WhatsApp"}
                />
              </div>

              <input
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                maxLength={80}
                placeholder="Non ou (opsyonèl)"
                disabled={busy}
                className={inputClass}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={`Yon ti mesaj pou ${artistName} (opsyonèl)`}
                disabled={busy}
                className={`${inputClass} resize-none`}
              />

              <FormMessage error={error} />

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} disabled={busy} className={secondary}>
                  ← Retounen
                </button>
                <button type="button" onClick={submit} disabled={busy} className={primary}>
                  {busy ? "Ap voye..." : `Voye don ${formatUSD(amountUsd)}`}
                </button>
              </div>
            </div>
          )}

          {/* ===== ETAP 4: KONFIMASYON ===== */}
          {step === 4 && (
            <div className="space-y-5 py-2 text-center">
              <p className="text-6xl">🙏</p>
              <h3 className="text-2xl font-extrabold text-white">Mèsi anpil!</h3>
              <p className="text-zinc-300">
                Don ou an <span className="font-semibold text-white">{formatUSD(amountUsd)}</span> ({formatHTG(amountHtg)}) ap ale jwenn{" "}
                <span className="font-semibold text-white">{artistName}</span> {forWhat}.
              </p>
              <div className="rounded-2xl border border-amber-900/60 bg-amber-950/40 p-4 text-left text-sm text-amber-200">
                ⏳ Yon admin ap verifye prèv la anvan li valide don an. W ap resevwa yon mesaj mèsi sou{" "}
                <span className="font-semibold">{contactType === "email" ? "imèl" : "WhatsApp"}</span> ou ({contact.trim()}) lè l fini.
              </div>
              <button type="button" onClick={onClose} className={primary}>
                Fèmen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
