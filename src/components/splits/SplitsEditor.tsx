"use client";

import { MAX_SPLITS, SPLIT_ROLES, emptySplit, splitsTotal, type Split } from "@/lib/splits";

const small = "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-fuchsia-500";

export function SplitsEditor({
  splits,
  onChange,
  disabled,
  reserved = 0,
}: {
  splits: Split[];
  onChange: (s: Split[]) => void;
  disabled?: boolean;
  reserved?: number; // pousantaj ki deja bay atis featuring yo
}) {
  const total = splitsTotal(splits);
  const artistShare = Math.max(0, Math.round((100 - total - reserved) * 100) / 100);
  const over = total + reserved > 100;

  function update(i: number, patch: Partial<Split>) {
    onChange(splits.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">🤝 Pataj royalties</p>
          <p className="text-xs text-zinc-500">Pataje 85% chante a ak jiska {MAX_SPLITS} moun ki te patisipe. UpMizik peye yo dirèkteman.</p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {splits.length}/{MAX_SPLITS}
        </span>
      </div>

      {/* Ba ki montre pataj la */}
      <div className="mt-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${artistShare}%` }} />
          {splits.map((s, i) => (
            <div key={i} className="h-full bg-violet-400/70 transition-all" style={{ width: `${Math.min(100, Number(s.percentage) || 0)}%` }} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-zinc-300">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-fuchsia-500" />
            Ou menm: <span className="font-semibold text-white">{artistShare}%</span>
          </span>
          <span className={over ? "font-semibold text-red-400" : "text-zinc-300"}>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-400/70" />
            Kolaboratè: {total}%{over && " (depase 100%!)"}
          </span>
        </div>
      </div>

      {splits.length > 0 && (
        <ul className="mt-4 space-y-3">
          {splits.map((s, i) => (
            <li key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 p-3 sm:grid-cols-[1fr_9rem_6rem]">
              {/* Tit + bouton pou retire kolaboratè a (si atis la fè erè oswa li pa vle ba l pa ankò) */}
              <div className="col-span-2 flex items-center justify-between sm:col-span-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Kolaboratè #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange(splits.filter((_, j) => j !== i))}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                  aria-label={`Retire kolaboratè #${i + 1}`}
                >
                  ✕ Retire
                </button>
              </div>
              <input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Non"
                maxLength={80}
                disabled={disabled}
                className={`${small} col-span-2 sm:col-span-1`}
                aria-label={`Non kolaboratè #${i + 1}`}
              />
              <select value={s.role} onChange={(e) => update(i, { role: e.target.value })} disabled={disabled} className={small} aria-label="Wòl">
                <option value="">Wòl...</option>
                {SPLIT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={s.percentage || ""}
                  onChange={(e) => update(i, { percentage: Number(e.target.value) })}
                  placeholder="0"
                  disabled={disabled}
                  className={`${small} pr-7`}
                  aria-label="Pousantaj"
                />
                <span className="pointer-events-none absolute right-3 top-2 text-sm text-zinc-500">%</span>
              </div>
              {/* Kote UpMizik ap voye pa kolaboratè a */}
              <select
                value={s.method}
                onChange={(e) => update(i, { method: e.target.value as Split["method"] })}
                disabled={disabled}
                className={small}
                aria-label="Metòd peman kolaboratè a"
              >
                <option value="">Peye sou...</option>
                <option value="moncash">MonCash</option>
                <option value="natcash">NatCash</option>
              </select>
              <input
                type="tel"
                value={s.phone}
                onChange={(e) => update(i, { phone: e.target.value })}
                placeholder="Nimewo telefòn li"
                disabled={disabled}
                className={`${small} sm:col-span-2`}
                aria-label="Nimewo telefòn kolaboratè a"
              />
              <input
                type="email"
                value={s.email}
                onChange={(e) => update(i, { email: e.target.value })}
                placeholder="Imèl (opsyonèl)"
                disabled={disabled}
                className={`${small} col-span-2 sm:col-span-1`}
                aria-label="Imèl"
              />
            </li>
          ))}
        </ul>
      )}

      {splits.length < MAX_SPLITS && (
        <button
          type="button"
          onClick={() => onChange([...splits, emptySplit()])}
          disabled={disabled}
          className="mt-4 w-full rounded-lg border border-dashed border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-fuchsia-500 hover:text-white"
        >
          + Ajoute yon kolaboratè
        </button>
      )}

      <p className="mt-3 text-xs text-zinc-500">
        ℹ️ Chak don valide pataje otomatikman dapre pousantaj sa yo. UpMizik voye pa kolaboratè yo sou MonCash/NatCash yo chak mwa.
      </p>
    </div>
  );
}
