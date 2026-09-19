/**
 * API client for the affiliate portal (protein.tn/affiliate/*).
 *
 * Separate from services/api.ts on purpose: it reuses the SAME storefront Sanctum token (an
 * affiliate is a storefront user) but must NOT inherit api.ts's global "401 → /login" redirect —
 * a 401/403 in the affiliate area is decided by the affiliate guard (→ /affiliate/login or
 * /partenaires), not the customer login. Kept out of api.ts so it isn't bundled site-wide.
 */
import axios from 'axios';

function getApiBaseUrl(): string {
  // Browser: same-origin proxy (next.config.js rewrites /api-proxy → backend /api), avoids CORS.
  if (typeof window !== 'undefined') return `${window.location.origin}/api-proxy`;
  return process.env.NEXT_PUBLIC_API_URL ?? 'https://admin.protein.tn/api';
}

const client = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AffiliateMe {
  id: number;
  name: string;
  status: string | null;
  type: string | null;
  reference: string | null;
  subdomain: string | null;
  is_affiliate: boolean;
}

export interface AffiliateDashboard {
  balances: {
    payable: number;
    held: number;
    confirmed: number;
    pending: number;
    earned: number;
    paid: number;
  };
  this_month: { earnings: number; orders: number };
  orders: { total: number; delivered: number; open: number };
  chart: { labels: string[]; confirmed: number[]; pending: number[] };
  referral: { link: string | null; code: string | null; reference: string | null };
  next_payout: string;
}

export async function getAffiliateMe(): Promise<AffiliateMe> {
  const { data } = await client.get<AffiliateMe>('/affilie/me');
  return data;
}

export async function getAffiliateDashboard(): Promise<AffiliateDashboard> {
  const { data } = await client.get<AffiliateDashboard>('/affilie/dashboard');
  return data;
}

/** True if the signed-in user is an approved affiliate (200 from /affilie/me); 403/anything → false. */
export async function checkIsAffiliate(): Promise<boolean> {
  try {
    const me = await getAffiliateMe();
    return Boolean(me?.is_affiliate);
  } catch {
    return false;
  }
}

/** French money format used across the portal: "1 234.567 DT". */
export function fmtDT(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(/ | /g, ' ')} DT`;
}

// ── Order desk (Phase 2) ───────────────────────────────────────────────────────────────────────

/** A sellable product for the create-order picker (only products with a real prix_affilie appear). */
export interface AffiliateProduct {
  id: number;
  name: string;
  image: string | null;
  /** The affiliate floor: selling below this is refused server-side. */
  base: number;
  /** Suggested retail price, used when no default markup is configured. */
  suggested: number;
  markup_percent: number;
  stock: number;
  code: string;
}

export type OrderTone = 'ok' | 'warn' | 'destructive' | 'info' | 'brand' | 'neutral';

export interface AffiliateOrder {
  id: number;
  numero: string;
  created_at: string | null;
  status: string;
  status_label: string;
  status_tone: OrderTone;
  customer: string | null;
  phone: string | null;
  ville: string | null;
  items_count: number;
  total: number;
  commission: number;
}

export interface AffiliateOrdersPage {
  data: AffiliateOrder[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface CreateOrderLine {
  produit_id: number;
  qte: number;
  prix_unitaire: string;
}

export interface CreateOrderCustomer {
  nom?: string;
  phone: string;
  email?: string;
  region?: string;
  ville?: string;
  adresse1?: string;
  code_postale?: string;
  note?: string;
}

export interface CreateOrderPayload {
  lines: CreateOrderLine[];
  customer: CreateOrderCustomer;
  fulfillment_mode: 'delivery' | 'pickup';
}

export interface CreateOrderResult {
  id: number;
  numero: string;
  status: string;
  total: number;
  commission: number;
}

/** Normalised create-order failure: `field` is the semantic field, `line` the offending line index. */
export interface AffiliateOrderError {
  message: string;
  field?: string | null;
  line?: number | string | null;
}

export async function getAffiliateProducts(q = ''): Promise<AffiliateProduct[]> {
  const { data } = await client.get<{ data: AffiliateProduct[] }>('/affilie/products', { params: { q } });
  return data.data ?? [];
}

export async function getAffiliateOrders(page = 1, perPage = 20): Promise<AffiliateOrdersPage> {
  const { data } = await client.get<AffiliateOrdersPage>('/affilie/orders', { params: { page, per_page: perPage } });
  return data;
}

export async function createAffiliateOrder(payload: CreateOrderPayload): Promise<CreateOrderResult> {
  try {
    const { data } = await client.post<CreateOrderResult>('/affilie/orders', payload);
    return data;
  } catch (err: unknown) {
    throw normaliseOrderError(err);
  }
}

/** Turn an axios failure (our {message,field,line} 422 OR Laravel's {errors} validation) into one shape. */
function normaliseOrderError(err: unknown): AffiliateOrderError {
  const resp = (err as { response?: { data?: Record<string, unknown> } })?.response;
  const body = resp?.data;
  if (body && typeof body === 'object') {
    if (typeof body.message === 'string' && 'field' in body) {
      return { message: body.message, field: (body.field as string) ?? null, line: (body.line as number) ?? null };
    }
    if (body.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors as Record<string, string[]>)[0]?.[0];
      return { message: first || (typeof body.message === 'string' ? body.message : 'Données invalides.') };
    }
    if (typeof body.message === 'string') return { message: body.message };
  }
  return { message: 'Création impossible. Vérifiez votre connexion et réessayez.' };
}

// ── Commissions / payments / profile (Phase 3) ──────────────────────────────────────────────────

export interface AffiliateCommission {
  id: number;
  type: string;
  type_label: string;
  amount: number;
  status: string;
  status_label: string;
  status_tone: OrderTone;
  description: string;
  commande: string | null;
  created_at: string | null;
}

export interface AffiliateCommissionsPage {
  summary: { pending: number; confirmed: number; paid: number };
  data: AffiliateCommission[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface AffiliatePayment {
  id: number;
  amount: number;
  status: string;
  status_label: string;
  status_tone: OrderTone;
  reference: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface AffiliatePaymentsPage {
  summary: { paid: number; pending: number };
  data: AffiliatePayment[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface AffiliateProfile {
  name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  reference: string | null;
  type: string | null;
  status: string | null;
  payment_method: string | null;
  bank_name: string | null;
  rib_or_iban: string | null;
}

/** The contact fields an affiliate may edit (payout details stay admin-managed). */
export interface AffiliateProfileContact {
  name?: string;
  business_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export async function getAffiliateCommissions(page = 1, perPage = 20): Promise<AffiliateCommissionsPage> {
  const { data } = await client.get<AffiliateCommissionsPage>('/affilie/commissions', { params: { page, per_page: perPage } });
  return data;
}

export async function getAffiliatePayments(page = 1, perPage = 20): Promise<AffiliatePaymentsPage> {
  const { data } = await client.get<AffiliatePaymentsPage>('/affilie/payments', { params: { page, per_page: perPage } });
  return data;
}

export async function getAffiliateProfile(): Promise<AffiliateProfile> {
  const { data } = await client.get<AffiliateProfile>('/affilie/profile');
  return data;
}

export async function updateAffiliateProfile(contact: AffiliateProfileContact): Promise<AffiliateProfile> {
  const { data } = await client.put<AffiliateProfile>('/affilie/profile', contact);
  return data;
}
