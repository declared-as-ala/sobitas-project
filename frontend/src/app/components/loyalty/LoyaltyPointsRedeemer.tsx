'use client';

import { Input } from '@/app/components/ui/input';
import { pointsToDt } from '@/util/loyaltyPoints';
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
        <div className="flex items-center gap-3 border-b border-brand/15 bg-brand/5 p-4">
          <ProtinaMark size="md" decorative={false} />
          <div className="min-w-0 flex-1">
            <h3 id="checkout-points-title" className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
              Mes Protinas
            </h3>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-ink-2">
              <span className="whitespace-nowrap font-bold tabular-nums text-ink-1">{safeBalance} Protinas</span>
              <span className="whitespace-nowrap tabular-nums">{availableValue.toFixed(2)} DT</span>
            </p>
          </div>
        </div>

        {safeMax > 0 ? (
          <div className="space-y-3 p-4">
            <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_auto] min-[400px]:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Votre remise</p>
                <p className="mt-1 whitespace-nowrap font-display text-2xl font-extrabold tabular-nums text-ok">−{discount.toFixed(2)} DT</p>
              </div>
              <label className="grid grid-cols-[minmax(0,6rem)_auto] items-center gap-2 text-sm font-semibold text-ink-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={safeMax}
                  step={1}
                  value={safeValue}
                  onChange={(event) => updateValue(Number(event.target.value))}
                  className="h-11 min-w-0 rounded-xl text-center font-bold tabular-nums"
                  aria-label="Nombre de Protinas à utiliser"
                />
                <span className="whitespace-nowrap">Protinas</span>
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

            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {safeValue > 0 && (
                <button
                  type="button"
                  onClick={() => updateValue(0)}
                  className="min-h-11 rounded-xl border border-hairline bg-elevated px-3 text-xs font-semibold text-ink-2 transition-colors hover:border-brand/35 hover:bg-brand/5 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Réinitialiser
                </button>
              )}
              <button
                type="button"
                onClick={() => updateValue(safeMax)}
                disabled={safeValue === safeMax}
                className={`min-h-11 rounded-xl bg-brand-fill px-4 text-xs font-bold text-on-brand-fill transition-[filter,opacity] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 ${safeValue === 0 ? 'min-[400px]:col-span-2' : ''}`}
              >
                {safeValue === safeMax ? 'Maximum appliqué' : 'Tout utiliser'}
              </button>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-ink-2">Vos Protinas deviennent utilisables dès que votre panier contient un produit éligible.</p>
        )}
      </div>
    </section>
  );
}
