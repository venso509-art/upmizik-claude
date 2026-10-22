"use client";

import { useState } from "react";
import { inputClass } from "@/components/auth/ui";
import { GENRES, GENRE_MAX, OTHER_GENRE } from "@/lib/genres";

// Meni jan mizik yo, ak "Lòt jan" pou atis ki pa jwenn pa l nan lis la.
// Valè final la voye nan chan "genre" la (oswa bay onChange si paran an kontwole l).
export function GenreSelect({
  defaultValue,
  name = "genre",
  disabled,
  onChange,
  emptyLabel = "Chwazi yon jan (opsyonèl)",
}: {
  defaultValue?: string | null;
  name?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  emptyLabel?: string;
}) {
  const initial = defaultValue?.trim() ?? "";
  const known = !initial || GENRES.includes(initial);
  const [choice, setChoice] = useState(known ? initial : OTHER_GENRE);
  const [custom, setCustom] = useState(known ? "" : initial);
  const value = choice === OTHER_GENRE ? custom.trim() : choice;

  return (
    <div className="space-y-2">
      <select
        value={choice}
        disabled={disabled}
        onChange={(e) => {
          setChoice(e.target.value);
          onChange?.(e.target.value === OTHER_GENRE ? custom.trim() : e.target.value);
        }}
        className={inputClass}
        aria-label="Jan mizik"
      >
        <option value="">{emptyLabel}</option>
        {GENRES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
        <option value={OTHER_GENRE}>✏️ Lòt jan (ekri l)</option>
      </select>
      {choice === OTHER_GENRE && (
        <input
          value={custom}
          disabled={disabled}
          onChange={(e) => {
            setCustom(e.target.value);
            onChange?.(e.target.value.trim());
          }}
          maxLength={GENRE_MAX}
          placeholder="Egz: Dancehall, Kompa Love, Jazz…"
          className={inputClass}
          aria-label="Ekri jan mizik la"
        />
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
