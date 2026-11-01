"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";
import { Portal } from "@/components/Portal";
import { useSettings } from "@/components/SettingsProvider";
import { votesFor } from "@/lib/contest";

// ===== Bouton "🗳️ Vote" + fenèt vòt la: montan → peman MonCash/NatCash → prèv =====
const PRESETS = [50, 100, 250, 500, 1000];

export function VoteButton({
  teamId,
  teamName,
  schoolName,
  price,
  open,
  big,
}: {
  teamId: string;
  teamName: string;
  schoolName: string;
  price: number;
  open: boolean;
  big?: boolean;
}) {
  const settings = useSettings();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [method, setMethod] = useState<"moncash" | "natcash">("moncash");
  const [ref, setRef] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(0);
  const [pending, start] = useTransition();

  const value = custom ? Number(custom.replace(/\D/g, "")) : amount;
  const votes = votesFor(value, price);
  const number = method === "moncash" ? settings.moncashNumber : settings.natcashNumber;

  function close() {
    if (pending) return;
    setShow(false);
    setStep(1);
    setError(undefined);
    setProof(null);
    setSent(0);
  }

  function submit() {
    setError(undefined);
    if (!proof) return setError("Ajoute foto prèv peman an.");
    start(async () => {
      try {
        const supabase = createClient();
        const small = await compressImage(proof, 1600, 0.85);
        const path = `pending/contest-${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from("donation-proofs").upload(path, small, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw new Error(`Prèv la pa monte: ${up.error.message}`);
        const { data, error: err } = await supabase.rpc("submit_contest_vote", {
          p_team: teamId,
          p_amount: value,
          p_name: name.trim() || null,
          p_method: method,
          p_ref: ref.trim() || null,
          p_proof_path: path,
        });
        if (err) throw new Error(err.message);
        setSent(Number(data ?? votes));
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vòt la pa pase. Eseye ankò.");
      }
    });
  }

  const inputCls = "w-full rounded-xl border border-white/15 bg-[#0B132B] px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-[#FFD700] focus:outline-none";

  return (
    <>
      <button
        type="button"
        disabled={!open}
        onClick={() => setShow(true)}
        className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#FFE34D] to-[#E6C000] font-black text-[#0B132B] shadow-lg shadow-[#FFD700]/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 ${
          big ? "px-8 py-4 text-lg" : "px-5 py-2.5 text-sm"
        }`}
      >
        <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/50 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" aria-hidden />
        🗳️ {open ? "Vote" : "Vòt yo fèmen"}
      </button>

      {show && (
        <Portal>
          <div className="force-dark fixed inset-0 z-[85] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#7A0E1F] via-[#0B132B] to-[#0B132B] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white shadow-2xl sm:rounded-3xl"
              role="dialog"
              aria-modal="true"
              aria-label={`Vote pou ${teamName}`}
            >
              <button type="button" onClick={close} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fèmen">
                ✕
              </button>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD700]">🎄 Konkou Nwèl</p>
              <h2 className="mt-1 pr-10 text-2xl font-black">Vote pou {teamName}</h2>
              <p className="text-sm text-white/60">{schoolName}</p>

              {step === 1 && (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-white/80">
                    Chak <strong className="text-[#FFD700]">{price} goud = 1 vòt</strong>. Plis ou bay, plis ekip la monte!
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setAmount(p);
                          setCustom("");
                        }}
                        className={`rounded-2xl py-3 text-center transition ${!custom && amount === p ? "bg-[#FFD700] text-[#0B132B]" : "bg-white/[0.07] ring-1 ring-white/15 hover:bg-white/[0.12]"}`}
                      >
                        <span className="block text-lg font-black">{p}</span>
                        <span className="block text-[11px] font-bold opacity-70">{votesFor(p, price)} vòt</span>
                      </button>
                    ))}
                    <input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 7))}
                      inputMode="numeric"
                      placeholder="Lòt"
                      className={`rounded-2xl bg-white/[0.07] px-3 py-3 text-center text-lg font-black ring-1 ring-white/15 placeholder:text-white/40 focus:outline-none focus:ring-[#FFD700] ${custom ? "ring-2 ring-[#FFD700]" : ""}`}
                    />
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-4 text-center ring-1 ring-white/10">
                    <p className="text-4xl font-black text-[#FFD700]">{votes}</p>
                    <p className="text-sm text-white/70">{votes === 1 ? "vòt" : "vòt"} pou {value || 0} goud</p>
                  </div>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Non ou (si w vle)" className={inputCls} />
                  <button
                    type="button"
                    disabled={votes < 1}
                    onClick={() => setStep(2)}
                    className="w-full rounded-full bg-[#FFD700] py-3.5 font-black text-[#0B132B] disabled:opacity-40"
                  >
                    {votes < 1 ? `Minimòm ${price} goud` : `Kontinye: ${votes} vòt →`}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(["moncash", "natcash"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`rounded-2xl py-3 font-black transition ${method === m ? "bg-[#FFD700] text-[#0B132B]" : "bg-white/[0.07] ring-1 ring-white/15"}`}
                      >
                        {m === "moncash" ? "MonCash" : "NatCash"}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                    <p className="text-sm text-white/70">Voye</p>
                    <p className="text-3xl font-black text-[#FFD700]">{value} goud</p>
                    <p className="mt-2 text-sm text-white/70">sou {method === "moncash" ? "MonCash" : "NatCash"}:</p>
                    <p className="text-2xl font-black tracking-wider">{number}</p>
                    <p className="text-xs text-white/60">Non sou kont lan: {settings.accountName}</p>
                  </div>
                  <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} placeholder="Nimewo tranzaksyon an (si w genyen l)" className={inputCls} />
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-white/25 p-4 hover:border-[#FFD700]">
                    <span className="text-3xl" aria-hidden>
                      {proof ? "✅" : "📷"}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{proof ? "Prèv la la" : "Foto prèv peman an"}</span>
                      <span className="block truncate text-xs text-white/60">{proof ? proof.name : "Capture mesaj MonCash/NatCash la"}</span>
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
                  </label>
                  {error && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(1)} className="rounded-full px-5 py-3 font-semibold text-white/70">
                      ← Retounen
                    </button>
                    <button type="button" disabled={pending || !proof} onClick={submit} className="flex-1 rounded-full bg-[#FFD700] py-3.5 font-black text-[#0B132B] disabled:opacity-40">
                      {pending ? "Ap voye…" : `🗳️ Voye ${votes} vòt`}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="mt-6 text-center">
                  <p className="text-6xl motion-safe:animate-fade-up">🎄</p>
                  <p className="mt-3 text-2xl font-black">Mèsi pou {sent} vòt ou yo!</p>
                  <p className="mt-2 text-sm text-white/70">
                    Ekip UpMizik la ap verifye peman an. Depi l valide, vòt ou yo ap parèt sou klasman <strong>{teamName}</strong>.
                  </p>
                  <button type="button" onClick={close} className="mt-5 rounded-full bg-[#FFD700] px-8 py-3 font-black text-[#0B132B]">
                    Fèmen
                  </button>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
