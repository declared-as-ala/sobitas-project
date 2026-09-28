'use client';

import { ChevronDown } from 'lucide-react';
import type { Aroma } from '@/types';

export function AromaSelect({
  aromas,
  selectedId,
  onChange,
}: {
  aromas: Aroma[];
  selectedId: number | null;
  onChange: (id: number) => void;
}) {
  const selected = aromas.find((aroma) => aroma.id === selectedId) ?? aromas[0];

  if (!selected) return null;

  return (
    <div className="relative w-full">
      <select
        aria-label="Choisir un arôme"
        value={String(selected.id)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-[56px] w-full appearance-none rounded-xl border border-hairline bg-elevated px-3 pe-10 text-sm font-semibold text-ink-1 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {aromas.map((aroma) => (
          <option key={aroma.id} value={String(aroma.id)}>
            {aroma.designation_fr}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
    </div>
  );
}
