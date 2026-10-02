import type { BackendCommandeFields, BackendOrderPayload } from '@/lib/orderPayload';

/** The quote needs no delivery form: only a complete phone / e-mail, for per-customer coupon limits. */
export type CheckoutQuotePayload = Omit<BackendOrderPayload, 'commande'> & { commande: Partial<BackendCommandeFields> };

export interface CheckoutPricing {
  goods_dt: number;
  full_price_goods_dt: number;
  pack: { percent: number; amount_dt: number; applied: boolean };
  coupon: { code: string | null; type: string | null; amount_dt: number; applied: boolean; reason: string | null };
  free_shipping_reason: string | null;
  ceiling_percent: number;
  ceiling_dt: number;
  room_dt: number;
  protinas: { balance: number; pending_welcome_points: number; max_usable_points: number; max_usable_dt: number; used_points: number; used_dt: number; remaining_points: number };
  shipping_dt: number;
  total_discount_dt: number;
  total_discount_percent: number;
  total_dt: number;
  earn_on_delivery_points: number;
  next_pack_tier: { from_dt: number; percent: number; remaining_dt: number } | null;
}

export async function quoteCheckout(payload: CheckoutQuotePayload, signal?: AbortSignal): Promise<CheckoutPricing> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('Devis momentanément indisponible');
  const body = await response.json();
  if (!body.pricing || !Number.isFinite(Number(body.pricing.total_dt))) throw new Error('Devis invalide');
  return body.pricing as CheckoutPricing;
}
