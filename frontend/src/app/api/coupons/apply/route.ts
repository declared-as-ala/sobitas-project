import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_URL, forwardShopperIp } from '@/lib/shopperIp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(`${BACKEND_API_URL}/coupons/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        // coupon-apply:{ip} allows 10 tries a minute — per shopper, not per server (lib/shopperIp.ts).
        ...forwardShopperIp(request),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de l\'application du code.' },
      { status: 500 }
    );
  }
}
