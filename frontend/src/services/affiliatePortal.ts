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
