'use client';

import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { pointsToDt, REDEEM_POINTS_PER_DT } from '@/util/loyaltyPoints';
import { ProtinaMark } from './Protina';

interface LoyaltyPointsRedeemerProps {
  balance: number;
  maxPoints: number;
  value: number;
  onChange: (points: number) => void;
}

export function LoyaltyPointsRedeemer({ balance, maxPoints, value, onChange }: LoyaltyPointsRedeemerProps) {
  const safeBalance = Math.max(0, Math.floor(balance));
  const safeMax = Math.max(0, Math.min(Math.floor(maxPoints), safeBalance));
  const safeValue = Math.max(0, Math.min(Math.floor(value), safeMax));
  const discount = pointsToDt(safeValue);
  const availableValue = pointsToDt(safeBalance);

  const updateValue = (next: number) => {
    const normalized = Number.isFinite(next) ? Math.floor(next) : 0;
    onChange(Math.max(0, Math.min(normalized, safeMax)));
  };

  return (
    <section className="border-t border-rule pt-5" aria-labelledby="checkout-points-title">
      <div className="overflow-hidden rounded-2xl border border-brand/20 bg-elevated">
        <div className="relative flex items-center gap-3 overflow-hidden border-b border-brand/15 bg-brand/5 p-4 pr-24 sm:pr-32">
          <ProtinaMark size="lg" />
          <div className="min-w-0 flex-1">
            <h3 id="checkout-points-title" className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
              Mes Protinas
            </h3>
            <p className="mt-0.5 text-sm text-ink-2">
              <span className="font-bold tabular-nums text-ink-1">{safeBalance} Protinas</span>
              <span aria-hidden="true"> · </span>
              <span className="tabular-nums">{availableValue.toFixed(2)} DT disponibles</span>
            </p>
          </div>
          <Image src="/member/protina-checkout-v1.webp" alt="" width={132} height={132} className="pointer-events-none absolute -bottom-8 -right-3 h-28 w-28 object-contain opacity-90 sm:h-32 sm:w-32" aria-hidden="true" />
        </div>

        {safeMax > 0 ? (
          <div className="space-y-4 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Votre remise</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ok">−{discount.toFixed(2)} DT</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={safeMax}
                  step={1}
                  value={safeValue}
                  onChange={(event) => updateValue(Number(event.target.value))}
                  className="h-11 w-24 rounded-xl text-center font-bold tabular-nums"
                  aria-label="Nombre de Protinas à utiliser"
                />
                <span>Protinas</span>
              </label>
            </div>

            <input
              type="range"
              min={0}
              max={safeMax}
              step={1}
              value={safeValue}
              onChange={(event) => updateValue(Number(event.target.value))}
              className="h-11 w-full cursor-pointer accent-brand"
              aria-label="Choisir le nombre de Protinas à utiliser"
              aria-valuetext={`${safeValue} Protinas, soit ${discount.toFixed(2)} dinars de remise`}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-3">
                Maximum ici : <span className="font-semibold tabular-nums text-ink-1">{safeMax} Protinas</span>
              </p>
              <div className="flex items-center gap-2">
                {safeValue > 0 && (
                  <button
                    type="button"
                    onClick={() => updateValue(0)}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-ink-2 hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Ne pas utiliser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updateValue(safeMax)}
                  className="min-h-11 rounded-xl bg-brand px-4 text-xs font-bold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  Utiliser le maximum
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-sunken p-3 text-xs leading-relaxed text-ink-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
              <p>
                Jusqu’à 50% des produits. Vos nouvelles Protinas sont calculées avant cette remise.
                Le serveur vérifie et débite exactement le solde utilisé. {REDEEM_POINTS_PER_DT} Protinas = 1 DT.
              </p>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-ink-2">Vos Protinas deviennent utilisables dès que votre panier contient un produit éligible.</p>
        )}
      </div>
    </section>
  );
}
