"use client";

import { useState } from "react";
import { inputClass } from "@/components/auth/ui";
import { ALL_PLACES, LOCATION_GROUPS, LOCATION_MAX, OTHER_PLACE } from "@/lib/locations";

// Meni dewoulan zòn atis la (depatman Ayiti + dyaspora), ak "Lòt kote" pou ekri vil la.
// Valè final la voye nan chan "location" la.
export function LocationSelect({ defaultValue, required = false }: { defaultValue?: string | null; required?: boolean }) {
  const initial = defaultValue?.trim() ?? "";
  const known = !initial || ALL_PLACES.includes(initial);
  const [choice, setChoice] = useState(known ? initial : OTHER_PLACE);
  const [custom, setCustom] = useState(known ? "" : initial);
  const value = choice === OTHER_PLACE ? custom.trim() : choice;

  return (
    <div className="space-y-2">
      <select value={choice} onChange={(e) => setChoice(e.target.value)} required={required} className={inputClass} aria-label="Zòn ou">
        <option value="">📍 Chwazi zòn ou…</option>
        {LOCATION_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.places.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_PLACE}>✏️ Lòt kote (ekri l)</option>
      </select>
      {choice === OTHER_PLACE && (
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          required={required}
          maxLength={LOCATION_MAX}
          placeholder="Egz: Chicago, Etazini"
          className={inputClass}
          aria-label="Ekri vil ou"
        />
      )}
      <input type="hidden" name="location" value={value} />
    </div>
  );
}
