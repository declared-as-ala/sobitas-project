import { NextRequest, NextResponse } from 'next/server';
import { withAffiliateAttribution } from '@/lib/orderAttribution';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_BACKEND_URL ?? 'https://admin.protein.tn/api';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/checkout/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(request.headers.get('Authorization') && { Authorization: request.headers.get('Authorization')! }),
      },
      // Same attribution the order proxy stamps from the HttpOnly `pt_aff` cookie: an affiliate's
      // commission is reserved inside the order budget, so the quote must price it the same way or
      // the order answers 409 with a different total.
      body: JSON.stringify(withAffiliateAttribution(await request.json(), request)),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Devis momentanément indisponible' }, { status: 503 });
  }
}
