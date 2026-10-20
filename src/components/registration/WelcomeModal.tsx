"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DONATION_METHODS, formatHTG, formatUSD, type DonationMethod } from "@/lib/donations";
import { ARTIST_SHARE_PERCENT, MONTHLY_FEE_USD, PAYOUT_WAIT_MONTHS, PLATFORM_FEE_PERCENT } from "@/lib/finance";
import { REGISTRATION_FEE_HTG, REGISTRATION_FEE_USD } from "@/lib/registration";

// Pop-up byenvini pou yon nouvo atis: règ yo + frè enskripsyon an
export function WelcomeModal({ name }: { name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : overflow;
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function close(goToPayment: boolean) {
    setOpen(false);
    router.replace("/dashboard", { scroll: false });
    if (goToPayment) setTimeout(() => document.getElementById("peman")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  if (!open) return null;

  const rules = [
    { icon: "💝", text: `Fanatik ou yo ka voye ou don pa MonCash oswa NatCash. Ou menm ak kolaboratè ou yo resevwa ${ARTIST_SHARE_PERCENT}%, UpMizik kenbe ${PLATFORM_FEE_PERCENT}%.` },
    { icon: "📅", text: `Ou touche chak mwa. Chak mwa ou touche, gen yon frè ${formatUSD(MONTHLY_FEE_USD)}. Si w pa touche anyen, ou pa peye anyen.` },
    { icon: "⏳", text: `Ou ka mande premye retrè ou ${PAYOUT_WAIT_MONTHS} mwa apre kont ou apwouve. Apre sa, nenpòt ki lè nan mwa a.` },
    { icon: "🤝", text: "Ou ka bay royalties bay jiska 5 moun ki te travay sou yon chante. UpMizik peye yo dirèkteman." },
    { icon: "🔐", text: "PIN ou a pwoteje lajan ou: li obligatwa pou chak retrè." },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-3xl">
        <div className="bg-gradient-to-br from-fuchsia-600 to-violet-700 px-6 pb-6 pt-8 text-center">
          <p className="text-5xl">🎉</p>
          <h2 id="welcome-title" className="mt-3 text-2xl font-extrabold text-white">
            Byenvini sou UpMizik, {name}!
          </h2>
          <p className="mt-2 text-fuchsia-100">Kont atis ou kreye. Yon sèl etap ki rete pou w kòmanse pibliye mizik ou.</p>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Kijan sa mache</p>
            <ul className="mt-3 space-y-3">
              {rules.map((r) => (
                <li key={r.icon} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-lg leading-5">{r.icon}</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5">
            <p className="text-sm text-zinc-400">Frè enskripsyon (yon sèl fwa)</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {formatUSD(REGISTRATION_FEE_USD)} <span className="text-lg font-semibold text-fuchsia-300">= {formatHTG(REGISTRATION_FEE_HTG)}</span>
            </p>
            <p className="mt-3 text-sm text-zinc-400">Chwazi mwayen peman ou:</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(DONATION_METHODS) as DonationMethod[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => close(true)}
                  className="rounded-xl border border-zinc-700 p-3 text-left transition hover:border-fuchsia-500"
                >
                  <span className={`inline-block rounded-lg bg-gradient-to-r px-2.5 py-1 text-sm font-bold text-white ${DONATION_METHODS[key].color}`}>
                    {DONATION_METHODS[key].label}
                  </span>
                  <span className="mt-1.5 block text-sm tabular-nums text-zinc-300">{DONATION_METHODS[key].number}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => close(true)}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Peye frè enskripsyon an kounye a
            </button>
            <button type="button" onClick={() => close(false)} className="rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:text-white">
              Pita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
