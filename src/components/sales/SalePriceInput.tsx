"use client";

export const MIN_PRICE = 10;
export const MAX_SONG_PRICE = 50000;
export const MAX_RELEASE_PRICE = 100000;

// "" = pa an vant; sinon yon pri an kredi (1 kredi = 1 goud)
export function parsePrice(v: string, max = MAX_SONG_PRICE): number | null | undefined {
  if (!v.trim()) return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < MIN_PRICE || n > max) return undefined; // undefined = pa valid
  return n;
}

// 💰 Mete mizik la an vant: yon switch + pri a an kredi
export function SalePriceInput({
  value,
  onChange,
  disabled,
  title = "💰 Vann telechajman an",
  hint = "Tout moun ka toujou koute l gratis. Moun ki vle telechaje fichye a ap peye l ak kredi yo. Ou touche 85 % (avèk featuring ak kolaboratè ou yo).",
  max = MAX_SONG_PRICE,
}: {
  value: string; // "" = pa an vant
  onChange: (v: string) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
  max?: number;
}) {
  const on = value !== "";
  return (
    <div className={`rounded-xl border p-4 transition ${on ? "border-[#FFD700]/50 bg-[#FFD700]/[0.06]" : "border-zinc-800 bg-zinc-900/60"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked ? "100" : "")}
          className="mt-1 h-5 w-5 accent-[#FFD700]"
        />
        <span>
          <span className="block font-semibold text-white">{title}</span>
          <span className="block text-xs text-zinc-500">{hint}</span>
        </span>
      </label>
      {on && (
        <div className="mt-3 flex items-center gap-2 pl-8">
          <span className="text-sm text-zinc-400">Pri</span>
          <span className="flex items-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 focus-within:border-[#FFD700]">
            🪙
            <input
              inputMode="numeric"
              value={value}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-24 bg-transparent px-2 py-2 text-base font-bold text-white outline-none"
              aria-label="Pri an kredi"
            />
          </span>
          <span className="text-xs text-zinc-500">kredi (= goud) · {MIN_PRICE} a {max.toLocaleString("fr-HT")}</span>
        </div>
      )}
    </div>
  );
}
