import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BACKEND_URL ?? 'https://admin.protein.tn/api';

export async function GET() {
  try {
    // `?v=3` keys the 300 s data cache apart from the pre-v3 URL, so a deploy never serves rules
    // cached under the 02/10 rules (the backend ignores the parameter).
    const response = await fetch(`${API_URL}/loyalty/rules?v=3`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return NextResponse.json({ error: 'Règles Protinas indisponibles' }, { status: response.status });
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return NextResponse.json({ error: 'Règles Protinas indisponibles' }, { status: 503 });
  }
}
