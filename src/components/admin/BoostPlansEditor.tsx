"use client";

import { useState, useTransition } from "react";
import { deleteBoostPlan, saveBoostPlan } from "@/app/boost/actions";
import { formatHTG } from "@/lib/donations";

export type EditablePlan = { id: string; label: string; days: number; price_htg: number; active: boolean };

const field = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400";

// Admin: chanje non, kantite jou ak pri plan boost yo; ajoute yon nouvo plan; kache oswa efase youn
export function BoostPlansEditor({ plans }: { plans: EditablePlan[] }) {
  return (
    <section className="mt-8 rounded-2xl border border-orange-500/30 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-bold text-white">⚙️ Plan ak pri boost yo</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Sa w chanje la a parèt touswit nan bwat Boost atis yo. Demann ki deja voye yo kenbe pri ak jou yo te chwazi a.
      </p>
      <ul className="mt-4 space-y-3">
        {plans.map((p) => (
          <PlanRow key={p.id} plan={p} />
        ))}
        <PlanRow plan={null} />
      </ul>
    </section>
  );
}

function PlanRow({ plan }: { plan: EditablePlan | null }) {
  const isNew = !plan;
  const [label, setLabel] = useState(plan?.label ?? "");
  const [days, setDays] = useState(String(plan?.days ?? ""));
  const [price, setPrice] = useState(String(plan?.price_htg ?? ""));
  const [active, setActive] = useState(plan?.active ?? true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const changed = isNew || label !== plan.label || Number(days) !== plan.days || Number(price) !== plan.price_htg || active !== plan.active;
  const perDay = Number(days) > 0 && Number(price) > 0 ? Math.round(Number(price) / Number(days)) : null;

  function save() {
    setMsg(undefined);
    startTransition(async () => {
      const res = await saveBoostPlan({ id: plan?.id, label, days: Number(days), price_htg: Number(price), active });
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: isNew ? "✓ Plan an ajoute" : "✓ Anrejistre" });
      if (isNew) {
        setLabel("");
        setDays("");
        setPrice("");
        setActive(true);
      }
    });
  }

  function remove() {
    if (!plan || !confirm(`Efase plan « ${plan.label} » nèt? (Ou ka jis dezaktive l si w vle kenbe l pou pita.)`)) return;
    startTransition(async () => {
      const res = await deleteBoostPlan(plan.id);
      if (res.error) setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <li className={`rounded-xl p-3 ring-1 ${isNew ? "bg-orange-500/5 ring-orange-400/30" : active ? "bg-zinc-950/60 ring-zinc-800" : "bg-zinc-950/30 opacity-70 ring-zinc-800"}`}>
      {isNew && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-300">＋ Nouvo plan</p>}
      <div className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_1fr_auto] sm:items-end">
        <label className="text-xs text-zinc-400">
          Non plan an
          <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 40))} placeholder="Egz: 1 mwa" className={`mt-1 ${field}`} />
        </label>
        <label className="text-xs text-zinc-400">
          Kantite jou
          <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="30" className={`mt-1 ${field}`} />
        </label>
        <label className="text-xs text-zinc-400">
          Pri (goud)
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="3500" className={`mt-1 ${field}`} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-300">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-orange-500" />
          Aktif
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {perDay !== null && <span className="text-xs text-zinc-500">≈ {formatHTG(perDay)} pa jou</span>}
        <span className="ml-auto" />
        {msg && <span className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
        {!isNew && (
          <button type="button" disabled={pending} onClick={remove} className="rounded-lg px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50">
            🗑 Efase
          </button>
        )}
        <button
          type="button"
          disabled={pending || !changed}
          onClick={save}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {pending ? "…" : isNew ? "＋ Ajoute" : "Anrejistre"}
        </button>
      </div>
    </li>
  );
}
