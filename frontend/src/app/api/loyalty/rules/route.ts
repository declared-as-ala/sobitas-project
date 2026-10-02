import { NextResponse } from 'next/server';
import { BACKEND_API_URL } from '@/lib/shopperIp';

// No shopper IP here on purpose: this fetch is cached for 5 minutes and shared by every visitor, so it
// reaches Laravel about once per revalidation, and a per-visitor header would split that cache.
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_URL}/loyalty/rules`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: 'Règles Protinas indisponibles' }, { status: response.status });
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ error: 'Règles Protinas indisponibles' }, { status: 503 });
  }
}
