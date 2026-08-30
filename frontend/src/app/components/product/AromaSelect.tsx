'use client';

import Image from 'next/image';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { Aroma } from '@/types';
import { cn } from '@/app/components/ui/utils';

const FLAVOR_IMAGES = {
  chocolate: '/images/flavors/chocolate.webp',
  vanilla: '/images/flavors/vanilla.webp',
  strawberry: '/images/flavors/strawberry.webp',
  cookies: '/images/flavors/cookies-cream.webp',
  tropical: '/images/flavors/tropical-fruit.webp',
  neutral: '/images/flavors/neutral.webp',
} as const;

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function flavorImage(name: string) {
  const value = normalize(name);

  if (/chocolat|cacao|brownie|fudge|mocha|cappuccino|cafe|coffee/.test(value)) {
    return FLAVOR_IMAGES.chocolate;
  }
  if (/vanill/.test(value)) return FLAVOR_IMAGES.vanilla;
  if (/fraise|strawberry|framboise|berry|fruits? rouges?/.test(value)) {
    return FLAVOR_IMAGES.strawberry;
  }
  if (/cookie|biscuit|cream|creme/.test(value)) return FLAVOR_IMAGES.cookies;
  if (/mangue|mango|orange|citron|lemon|lime|peche|peach|ananas|tropical|fruit/.test(value)) {
    return FLAVOR_IMAGES.tropical;
  }

  return FLAVOR_IMAGES.neutral;
}

function FlavorThumb({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-lg border border-hairline bg-sunken"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={flavorImage(name)}
        alt=""
        fill
        loading="lazy"
        sizes={`${size}px`}
        className="object-contain p-1"
      />
    </span>
  );
}

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
    <Select.Root value={String(selected.id)} onValueChange={(value) => onChange(Number(value))}>
      <Select.Trigger
        aria-label="Choisir un arôme"
        className="group flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-hairline bg-elevated px-2 py-2 text-start transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:px-3"
      >
        <FlavorThumb name={selected.designation_fr} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-1">
            {selected.designation_fr}
          </span>
          {selected.designation_ar && (
            <span dir="rtl" className="mt-0.5 block truncate text-xs text-ink-3">
              {selected.designation_ar}
            </span>
          )}
        </span>
        <Select.Icon asChild>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={16}
          className="z-header max-h-72 w-72 overflow-hidden rounded-xl border border-hairline bg-elevated shadow-card sm:w-80"
        >
          <Select.Viewport className="p-1.5">
            {aromas.map((aroma) => (
              <Select.Item
                key={aroma.id}
                value={String(aroma.id)}
                className={cn(
                  'relative flex min-h-[56px] cursor-pointer select-none items-center gap-3 rounded-lg px-2 py-2 pe-9 outline-none',
                  'data-[highlighted]:bg-sunken data-[state=checked]:bg-brand/5'
                )}
              >
                <FlavorThumb name={aroma.designation_fr} />
                <Select.ItemText>
                  <span className="block text-sm font-semibold text-ink-1">{aroma.designation_fr}</span>
                  {aroma.designation_ar && (
                    <span dir="rtl" className="mt-0.5 block text-xs text-ink-3">
                      {aroma.designation_ar}
                    </span>
                  )}
                </Select.ItemText>
                <Select.ItemIndicator className="absolute end-3 inline-flex text-brand">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
