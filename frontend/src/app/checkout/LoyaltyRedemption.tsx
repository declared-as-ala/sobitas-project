'use client';

import { useState, useEffect } from 'react';
import { getLoyaltyCard, validateLoyaltyRedemption } from '@/services/api';
import type { LoyaltyCardData, RedemptionValidation } from '@/types/loyalty';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  subtotal: number;
  onRedeem: (points: number, discount: number) => void;
  onRemove: () => void;
  redeemedPoints: number;
}

export function LoyaltyRedemption({ subtotal, onRedeem, onRemove, redeemedPoints }: Props) {
  const [cardData, setCardData] = useState<LoyaltyCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputPoints, setInputPoints] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<RedemptionValidation | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    getLoyaltyCard()
      .then(setCardData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cardData || cardData.points < cardData.min_redeem) {
    return null;
  }

  const handleValidate = async () => {
    const pts = parseInt(inputPoints, 10);
    if (!pts || pts <= 0) return;
    setValidating(true);
    try {
      const result = await validateLoyaltyRedemption(pts, subtotal);
      setValidation(result);
    } finally {
      setValidating(false);
    }
  };

  const handleApply = () => {
    if (!validation?.valid) return;
    onRedeem(validation.points, validation.discount);
    setApplied(true);
  };

  const handleRemove = () => {
    onRemove();
    setApplied(false);
    setValidation(null);
    setInputPoints('');
  };

  if (applied && redeemedPoints > 0) {
    return (
      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {redeemedPoints} points utilisés — {(validation?.discount ?? 0).toFixed(3)} DT de réduction
          </span>
        </div>
        <button onClick={handleRemove} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border border-amber-200 dark:border-amber-700 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold text-gray-800 dark:text-white">
          Utiliser vos points fidélité
        </p>
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {cardData.points} pts disponibles ≈ {cardData.monetary_value.toFixed(3)} DT
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">{cardData.rate_info}</p>

      <div className="flex gap-2">
        <Input
          type="number"
          min={cardData.min_redeem}
          max={cardData.points}
          value={inputPoints}
          onChange={(e) => {
            setInputPoints(e.target.value);
            setValidation(null);
          }}
          placeholder={`Min. ${cardData.min_redeem} points`}
          className="text-sm h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          onClick={handleValidate}
          disabled={validating || !inputPoints}
        >
          {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
        </Button>
      </div>

      {validation && (
        <div className={`mt-3 text-sm rounded px-3 py-2 ${validation.valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          {validation.valid ? (
            <div className="flex items-center justify-between">
              <span>
                {validation.points} points = <strong>−{validation.discount.toFixed(3)} DT</strong>
              </span>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white ml-3"
                onClick={handleApply}
              >
                Appliquer
              </Button>
            </div>
          ) : (
            validation.message
          )}
        </div>
      )}
    </div>
  );
}
