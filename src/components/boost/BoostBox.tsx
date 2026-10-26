"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { requestBoost } from "@/app/boost/actions";
import { ProofCropButton } from "@/components/media/ProofCropButton";
import { AccountName, AccountNameHint } from "@/components/payment/AccountName";
import { useSettings } from "@/components/SettingsProvider";
import { Portal } from "@/components/Portal";
import { FormMessage, inputClass } from "@/components/auth/ui";
import { BoostBadge } from "@/components/boost/BoostBadge";
import { DONATION_METHODS, formatHTG, type DonationMethod } from "@/lib/donations";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, fileExtension } from "@/lib/upload";
import { methodNumber } from "@/lib/settings";
import { BOOST_STATUS_LABEL, boostDaysLeft, type BoostPlan, type BoostStatus, type BoostType } from "@/lib/boost";

export type BoostSong = { id: string; title: string; coverUrl: string | null; boostedUntil: string | null };
export type BoostHistoryItem = {
  id: string;
  type: BoostType;
  targetId: string;
  targetLabel: string;
  amount: number;
  days: number;
  status: BoostStatus;
  expiresAt: string | null;
  createdAt: string;
  adminNote: string | null;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-HT", { day: "numeric", month: "long" });

// Bwat "🔥 Boost" nan dashboard la: atis la chwazi yon mizik oswa pwofil li, yon plan, epi li voye peman an.
// Admin nan verifye prèv la epi l aktive boost la.
export function BoostBox({
  songs,
  plans,
  profileBoostedUntil,
  history,
}: {
  songs: BoostSong[];
  plans: BoostPlan[];
  profileBoostedUntil: string | null;
  history: BoostHistoryItem[];
}) {
  const [type, setType] = useState<BoostType>(songs.length ? "mizik" : "profil");
  const [songId, setSongId] = useState(songs[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[plans.length - 1]?.id ?? "");
  const [paying, setPaying] = useState(false);
  // Fèmen pa defo (pa peze espas atis la); li louvri poukont li si lyen an se /dashboard#boost
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.location.hash === "#boost") setOpen(true);
  }, []);
  const plan = plans.find((p) => p.id === planId);
  const song = songs.find((s) => s.id === songId);
  // Sa ki deja gen yon demann k ap tann (pwofil la = "profil")
  const pendingTargets = new Set(history.filter((h) => h.status === "pending").map((h) => (h.type === "profil" ? "profil" : h.targetId)));

  const activeSongs = songs.filter((s) => s.boostedUntil);
  const cheapestPerDay = Math.min(...plans.map((p) => p.price_htg / p.days));
  const fromPrice = Math.min(...plans.map((p) => p.price_htg));
  const activeCount = activeSongs.length + (profileBoostedUntil ? 1 : 0);
  const pendingCount = history.filter((h) => h.status === "pending").length;

  return (
    <section id="boost" className="mt-6 scroll-mt-24 overflow-hidden rounded-3xl border border-orange-500/30 bg-zinc-900/50">
      {/* ===== TÈT: yon sèl liy (tankou "Vin Pro"); klike pou dewoule ===== */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group relative flex w-full items-center gap-4 overflow-hidden bg-gradient-to-r from-amber-500/25 via-orange-600/15 to-transparent p-4 text-left transition hover:from-amber-500/35 sm:p-5"
      >
        {!open && (
          <span className="absolute right-3 top-3 flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-400" />
          </span>
        )}
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 text-2xl shadow-lg shadow-orange-600/30 transition group-hover:scale-105"
          aria-hidden
        >
          🔥
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">Boost: fè plis moun dekouvri w</span>
          <span className="block text-sm text-zinc-300">
            {activeCount > 0
              ? `🔥 ${activeCount} boost aktif${pendingCount ? ` · ${pendingCount} ap tann` : ""}`
              : pendingCount
                ? `⏳ ${pendingCount} demann ap tann verifikasyon`
                : `Mizik oswa pwofil ou an premye · depi ${formatHTG(fromPrice)}`}
          </span>
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {/* ===== KONTNI AN: dewoule dousman ===== */}
      <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="min-h-0 overflow-hidden">
      <div className="space-y-6 border-t border-orange-500/20 p-5 sm:p-6">
        <p className="text-sm text-zinc-300">
          Mizik oswa pwofil ou parèt <strong className="text-white">an premye</strong> sou paj akèy la, ak badj <BoostBadge size="xs" className="align-middle" />, epi
          vizitè yo resevwa yon ti rekòmandasyon pou yo koute w.
        </p>
        {/* ===== BOOST KI AKTIF ===== */}
        {(profileBoostedUntil || activeSongs.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {profileBoostedUntil && (
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1.5 text-sm text-orange-200 ring-1 ring-orange-400/30">
                🔥 Pwofil ou · rete {boostDaysLeft(profileBoostedUntil)} jou
              </span>
            )}
            {activeSongs.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1.5 text-sm text-orange-200 ring-1 ring-orange-400/30">
                🔥 « {s.title} » · rete {boostDaysLeft(s.boostedUntil!)} jou
              </span>
            ))}
          </div>
        )}

        {/* ===== 1. KISA POU BOOST ===== */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">1 · Kisa w vle boost?</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["mizik", "🎵", "Yon mizik", "Chante a parèt an premye"],
                ["profil", "👤", "Pwofil mwen", "Ou parèt an premye nan atis yo"],
              ] as const
            ).map(([id, icon, label, hint]) => (
              <button
                key={id}
                type="button"
                disabled={id === "mizik" && songs.length === 0}
                onClick={() => setType(id)}
                className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${
                  type === id ? "border-orange-400 bg-orange-500/10 ring-1 ring-orange-400/40" : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {icon}
                </span>
                <span className="mt-1 block font-bold text-white">{label}</span>
                <span className="block text-xs text-zinc-400">{hint}</span>
              </button>
            ))}
          </div>

          {type === "mizik" && songs.length > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2 pr-3">
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                {song?.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xl">🎵</span>
                )}
              </span>
              <select
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                aria-label="Chwazi mizik la"
              >
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.boostedUntil ? " (🔥 deja boost)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ===== 2. KONBYEN TAN ===== */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">2 · Konbyen tan?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const best = plans.length > 1 && p.price_htg / p.days === cheapestPerDay;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    planId === p.id ? "border-orange-400 bg-orange-500/10 ring-1 ring-orange-400/40" : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  {best && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-[#FFD700] px-2 py-0.5 text-[10px] font-black uppercase text-[#0B132B]">Pi bon pri</span>
                  )}
                  <span className="block text-lg font-black text-white">{p.label}</span>
                  <span className="block text-2xl font-black tabular-nums text-orange-300">{formatHTG(p.price_htg)}</span>
                  <span className="text-xs text-zinc-400">
                    {p.days} jou · {formatHTG(Math.round(p.price_htg / p.days))} pa jou
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={!plan || (type === "mizik" && !song)}
          onClick={() => setPaying(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-600/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        >
          🔥 Mande Boost{plan ? ` · ${formatHTG(plan.price_htg)}` : ""}
        </button>

        {/* ===== ISTWA ===== */}
        {history.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Demann boost ou yo</p>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-zinc-950/60 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-white">
                    {h.type === "mizik" ? "🎵" : "👤"} {h.targetLabel} · {h.days} jou · {formatHTG(h.amount)}
                  </span>
                  <span
                    className={`text-xs font-semibold ${h.status === "active" ? "text-orange-300" : h.status === "pending" ? "text-amber-300" : "text-red-300"}`}
                  >
                    {BOOST_STATUS_LABEL[h.status]}
                    {h.status === "active" && h.expiresAt ? ` jiska ${fmtDate(h.expiresAt)}` : ""}
                  </span>
                  {h.status === "rejected" && h.adminNote && <span className="w-full text-xs text-zinc-500">Rezon: {h.adminNote}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>
      </div>

      {paying && plan && (
        <BoostPayModal
          type={type}
          songId={songId}
          targetLabel={type === "mizik" ? `« ${song?.title ?? ""} »` : "pwofil ou"}
          plan={plan}
          alreadyPending={pendingTargets.has(type === "mizik" ? songId : "profil")}
          onClose={() => setPaying(false)}
        />
      )}
    </section>
  );
}

// Fenèt peman an: MonCash/NatCash, nimewo a, foto prèv la (menm jan ak peman Pro a)
function BoostPayModal({
  type,
  songId,
  targetLabel,
  plan,
  alreadyPending,
  onClose,
}: {
  type: BoostType;
  songId: string;
  targetLabel: string;
  plan: BoostPlan;
  alreadyPending: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const settings = useSettings();
  const [method, setMethod] = useState<DonationMethod>("moncash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const number = methodNumber(settings, method);

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
    fd.set("type", type);
    fd.set("target", songId);
    fd.set("plan", plan.id);
    fd.set("method", method);
    fd.set("transaction_ref", transactionRef);
    fd.set("proof", proof);
    startTransition(async () => {
      const res = await requestBoost(fd);
      if (res.error) return setError(res.error);
      setDone(true);
    });
  }

  function close() {
    if (pending) return;
    onClose();
    if (done) router.refresh();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="boost-title"
          className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 px-6 pb-6 pt-7">
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
              {done ? "⏳" : "🔥"}
            </p>
            <h2 id="boost-title" className="mt-2 pr-10 text-2xl font-extrabold text-white">
              {done ? "Demann boost ou an voye!" : `Boost ${targetLabel}`}
            </h2>
            {!done && (
              <p className="mt-1 text-sm font-semibold text-white/90">
                {plan.label} ({plan.days} jou) · {formatHTG(plan.price_htg)}
              </p>
            )}
          </div>

          <div className="space-y-5 p-6">
            {done ? (
              <>
                <p className="text-zinc-300">
                  Mèsi! Ekip UpMizik la ap verifye peman an. Depi yo aktive l, {targetLabel} ap parèt <strong className="text-white">an premye</strong> sou sit la,
                  ak badj <BoostBadge size="xs" className="align-middle" />, pandan {plan.days} jou.
                </p>
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">W ap resevwa yon notifikasyon lè boost la aktive.</p>
                <button type="button" onClick={close} className="btn-primary w-full rounded-xl px-4 py-3 font-semibold">
                  Dakò
                </button>
              </>
            ) : (
              <>
                {alreadyPending && (
                  <p className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                    ⏳ Ou gen yon demann k ap tann deja pou sa. Tann ekip la verifye l anvan w voye yon lòt.
                  </p>
                )}
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Chwazi mwayen peman ou</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMethod(key)}
                        className={`rounded-2xl border p-4 text-left transition ${method === key ? "border-orange-400 bg-orange-500/10" : "border-zinc-700 hover:border-zinc-500"}`}
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
                  Voye <span className="font-semibold text-white">{formatHTG(plan.price_htg)}</span> sou{" "}
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
                  className={`relative flex min-h-[8rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 text-center transition hover:border-orange-400 ${
                    pending ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Prèv peman" className="max-h-52 w-full object-contain" />
                  ) : (
                    <>
                      <span className="text-3xl">📸</span>
                      <span className="mt-1 text-sm text-zinc-300">Klike pou chwazi foto prèv peman an</span>
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

                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-3 font-black text-white disabled:opacity-60"
                >
                  {pending ? "Ap voye…" : "🔥 Voye demann boost la"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
