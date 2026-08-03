import axios from 'axios';

/**
 * Partner / B2B programme — the storefront half.
 *
 * Kept out of `api.ts` on purpose. That file is 1,200+ lines of catalogue and order calls that
 * every route pulls in; the partner surface is three endpoints used by two routes, and folding
 * them into the shared module would put them in everyone's bundle for nothing.
 *
 * ── WHAT AN APPLICATION IS ────────────────────────────────────────────────────────────────
 * A request, not an account. `applyAsPartner` creates a partner with status `pending` and NOTHING
 * else: no commission rate, no code, no panel access. An administrator reviews it in Filament and
 * approves. That separation is the entire reason a public form is safe to expose against a module
 * that was previously admin-only — the form can only ever create the least-privileged row in the
 * system, so the worst a bad actor achieves is noise in a review queue.
 */

const getApiBaseUrl = (): string => {
  // Same-origin proxy in the browser (next.config.js rewrites /api-proxy → backend) so the
  // application POST is not a cross-origin request from protein.tn to admin.protein.tn.
  if (typeof window !== 'undefined') return `${window.location.origin}/api-proxy`;
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
};

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});

export type PartnerKind = 'coach' | 'gym';

export interface PartnerApplication {
  type: PartnerKind;
  name: string;
  email: string;
  phone: string;
  city: string;
  /** Free text — "40", "~200 adhérents". Kept a string because people do not answer with integers. */
  audience_size?: string;
  message?: string;
  /** Set automatically from the attribution cookie when a partner was referred by another. */
  referred_by_code?: string;
}

export interface PartnerApplicationResult {
  status: 'pending';
  reference: string;
}

/**
 * Turn a Laravel error response into one sentence a human can act on.
 *
 * Laravel 422 returns `{ message, errors: { field: [msg, …] } }`. Showing the raw `message`
 * ("The given data was invalid.") tells the visitor nothing, so the first field error wins — it is
 * the one that actually names what to change.
 */
function readableError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    if (firstFieldError) return new Error(firstFieldError);

    if (err.response?.status === 409) {
      return new Error('Une candidature existe déjà pour cette adresse e-mail. Nous vous répondrons bientôt.');
    }
    if (err.response?.status === 429) {
      return new Error('Trop de tentatives. Réessayez dans quelques minutes.');
    }
    if (data?.message) return new Error(data.message);
    if (!err.response) {
      return new Error('Connexion impossible. Vérifiez votre réseau et réessayez.');
    }
  }
  return new Error("L'envoi a échoué. Réessayez, ou contactez-nous directement.");
}

export async function applyAsPartner(payload: PartnerApplication): Promise<PartnerApplicationResult> {
  try {
    const { data } = await client.post<PartnerApplicationResult>('/partner-applications', payload);
    return data;
  } catch (err) {
    throw readableError(err);
  }
}

export interface PartnerCodePreview {
  code: string;
  /** 'percent' | 'fixed' — how the customer's discount is expressed. */
  discount_type: string;
  discount_value: number;
  partner_name: string;
}

/**
 * Look up a referral code so the storefront can show "Code d'Ali — -10%" before checkout.
 *
 * Read-only and deliberately thin: it returns what the CUSTOMER is entitled to see and nothing
 * about the partner's commission. A public endpoint that leaked `commission_rate` would publish
 * the margin structure of the whole programme to anyone who can guess a code.
 */
export async function previewPartnerCode(code: string): Promise<PartnerCodePreview | null> {
  try {
    const { data } = await client.get<PartnerCodePreview>(`/partner-codes/${encodeURIComponent(code)}`);
    return data;
  } catch {
    // An unknown or inactive code is a normal outcome, not an error worth surfacing.
    return null;
  }
}
