import { NextRequest, NextResponse } from 'next/server';

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
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Devis momentanément indisponible' }, { status: 503 });
  }
}
