"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compressImage";

export type IdType = "paspo" | "kat_idantite";
export type IdentityFiles = { selfie: File | null; idDoc: File | null; idType: IdType | null };

const ID_TYPES: { value: IdType; icon: string; label: string; hint: string }[] = [
  { value: "kat_idantite", icon: "🪪", label: "Kat idantite nasyonal", hint: "CIN / NIN" },
  { value: "paspo", icon: "🛂", label: "Paspò", hint: "Paj ki gen foto a" },
];

// Yon kare pou chwazi/pran yon foto, ak yon gid (sèk pou figi, rektang pou kat la) ak aperçu a
function PhotoSlot({
  title,
  subtitle,
  guide,
  file,
  onFile,
  step,
  tips,
}: {
  title: string;
  subtitle: string;
  guide: "face" | "card";
  file: File | null;
  onFile: (f: File | null) => void;
  step: number;
  tips: string[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(undefined);
    if (!f.type.startsWith("image/")) return setError("Chwazi yon foto (pa yon PDF ni yon videyo).");
    setBusy(true);
    try {
      onFile(await compressImage(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Foto a pa ka itilize.");
    } finally {
      setBusy(false);
    }
  }

  const done = !!file && !busy;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 p-4 transition duration-300 ${
        done ? "border-emerald-400/70 bg-emerald-400/[0.06]" : "border-dashed border-zinc-700 bg-zinc-900/60 hover:border-[#FFD700]/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition ${
            done ? "bg-emerald-400 text-[#0B132B]" : "bg-[#FFD700] text-[#0B132B]"
          }`}
        >
          {done ? "✓" : step}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-white">{title}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative mt-4 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#0A5C36]/60 ring-1 ring-white/10"
        aria-label={file ? `Chanje ${title.toLowerCase()}` : `Ajoute ${title.toLowerCase()}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover motion-safe:animate-fade-up" />
        ) : (
          <>
            {/* Gid: sèk pou figi a, rektang pou kat la */}
            {guide === "face" ? (
              <span className="flex h-[70%] aspect-[3/4] items-center justify-center rounded-[50%] border-2 border-dashed border-[#FFD700]/70 motion-safe:animate-pulse">
                <span className="text-5xl opacity-80">🙂</span>
              </span>
            ) : (
              <span className="flex h-[58%] aspect-[1.586] items-center gap-3 rounded-xl border-2 border-dashed border-[#FFD700]/70 px-3 motion-safe:animate-pulse">
                <span className="flex h-[70%] aspect-[3/4] items-center justify-center rounded-md bg-white/10 text-2xl">👤</span>
                <span className="flex-1 space-y-1.5">
                  <span className="block h-1.5 w-full rounded bg-white/20" />
                  <span className="block h-1.5 w-3/4 rounded bg-white/20" />
                  <span className="block h-1.5 w-1/2 rounded bg-white/20" />
                </span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-3 text-center text-sm font-bold text-white">
              {busy ? "Ap prepare foto a…" : "📷 Peze pou w pran oswa chwazi foto a"}
            </span>
          </>
        )}
        {preview && (
          <span className="absolute inset-x-3 bottom-3 rounded-full bg-black/60 px-3 py-1.5 text-center text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
            🔄 Chanje foto a
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} tabIndex={-1} />

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      ) : (
        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          {tips.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      )}
      {file && (
        <button type="button" onClick={() => onFile(null)} className="mt-2 text-xs font-semibold text-zinc-400 underline hover:text-red-300">
          Retire foto a
        </button>
      )}
    </div>
  );
}

// Seksyon "Verifikasyon idantite" nan demann manm nan
export function IdentityUpload({ value, onChange }: { value: IdentityFiles; onChange: (v: IdentityFiles) => void }) {
  const count = Number(!!value.selfie) + Number(!!value.idDoc && !!value.idType);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-zinc-900 to-[#0A5C36]/40 p-5 ring-1 ring-white/10 sm:p-6">
      <span className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#FFD700]/15 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#FFD700]">🛡️ Verifikasyon idantite</p>
          <h3 className="mt-1 text-xl font-black text-white">Montre nou se ou menm</h3>
          <p className="mt-1 max-w-md text-sm text-zinc-300">Pou pwoteje atis yo ak peman yo, chak manm dwe verifye idantite l. Sa pran 1 minit.</p>
        </div>
        {/* Pwogrè: 0/2, 1/2, 2/2 */}
        <span className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/10">
          <span className="flex gap-1" aria-hidden>
            {[0, 1].map((i) => (
              <span key={i} className={`h-2 w-5 rounded-full transition-colors duration-500 ${i < count ? "bg-emerald-400" : "bg-white/15"}`} />
            ))}
          </span>
          {count}/2
        </span>
      </div>

      <div className="relative mt-5 grid gap-4 md:grid-cols-2">
        <PhotoSlot
          step={1}
          title="Foto figi ou (selfie)"
          subtitle="Yon foto klè, figi ou gade kamera a"
          guide="face"
          file={value.selfie}
          onFile={(f) => onChange({ ...value, selfie: f })}
          tips={["Bon limyè, pa gen linèt nwa ni chapo", "Figi ou antye nan sèk la"]}
        />

        <div className="space-y-3">
          {/* Kalite pyès la */}
          <fieldset>
            <legend className="sr-only">Kalite pyès idantite</legend>
            <div className="grid grid-cols-2 gap-2">
              {ID_TYPES.map((t) => {
                const active = value.idType === t.value;
                return (
                  <label
                    key={t.value}
                    className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 text-center transition ${
                      active ? "border-[#FFD700] bg-[#FFD700]/10 shadow-lg shadow-[#FFD700]/10" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="id_type"
                      value={t.value}
                      checked={active}
                      onChange={() => onChange({ ...value, idType: t.value })}
                      required
                      className="sr-only"
                    />
                    <span className="text-2xl" aria-hidden>
                      {t.icon}
                    </span>
                    <span className="text-sm font-bold text-white">{t.label}</span>
                    <span className="text-[11px] text-zinc-500">{t.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <PhotoSlot
            step={2}
            title={value.idType === "paspo" ? "Foto paspò ou" : "Foto kat idantite ou"}
            subtitle={value.idType ? "Tout 4 kwen pyès la dwe parèt" : "Chwazi kalite pyès la anlè a"}
            guide="card"
            file={value.idDoc}
            onFile={(f) => onChange({ ...value, idDoc: f })}
            tips={["Mete pyès la sou yon tab, san flash", "Non ak foto sou pyès la dwe li byen"]}
          />
        </div>
      </div>

      <p className="relative mt-4 flex items-start gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs text-zinc-300 ring-1 ring-white/10">
        <span aria-hidden>🔒</span>
        <span>
          Foto yo <strong className="text-white">prive</strong>: se sèlman ekip UpMizik ki ka wè yo, pou verifye demann ou. Yo pa janm parèt sou sit la.
        </span>
      </p>
    </section>
  );
}
