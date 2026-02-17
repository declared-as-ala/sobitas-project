import { NextRequest, NextResponse } from 'next/server';
import type { OrderRequest, QuickOrderPayload, QuickOrderResponse } from '@/types';

const API_URL = 'https://admin.protein.tn/api';

/** Simple rate limit: IP -> timestamps (last N requests). Max 5 per minute. */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let list = rateLimitMap.get(ip) ?? [];
  list = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (list.length >= RATE_LIMIT_MAX) return true;
  list.push(now);
  rateLimitMap.set(ip, list);
  return false;
}

function parseName(full: string): { nom: string; prenom: string } {
  const t = (full || '').trim();
  const i = t.indexOf(' ');
  if (i <= 0) return { nom: t || 'Client', prenom: '' };
  return { nom: t.slice(0, i).trim(), prenom: t.slice(i + 1).trim() };
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\s/g, '').replace(/^\+216/, '');
  return /^[0-9]{8}$/.test(digits) || /^2[0-9]{7}$/.test(digits);
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans une minute.' },
        { status: 429 }
      );
    }

    const body = await request.json() as QuickOrderPayload & { website?: string };

    if (body.website != null && String(body.website).trim() !== '') {
      return NextResponse.json({ orderId: 0, status: 'ignored' } as QuickOrderResponse);
    }

    const {
      productId,
      qty,
      customerName,
      phone,
      city,
      address,
      note,
      priceSnapshot,
      deliveryFeeSnapshot = 0,
    } = body;

    if (!productId || !Number.isFinite(priceSnapshot) || priceSnapshot < 0) {
      return NextResponse.json(
        { error: 'Produit ou prix invalide.' },
        { status: 400 }
      );
    }
    const qtyNum = Math.max(1, Math.min(99, Number(qty) || 1));
    const nameTrim = (customerName || '').trim();
    const phoneTrim = (phone || '').trim();
    const cityTrim = (city || '').trim();
    const addressTrim = (address || '').trim();

    if (!nameTrim) {
      return NextResponse.json(
        { error: 'Nom et prénom requis.' },
        { status: 400 }
      );
    }
    if (!phoneTrim) {
      return NextResponse.json(
        { error: 'Téléphone requis.' },
        { status: 400 }
      );
    }
    if (!validatePhone(phoneTrim)) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide (8 chiffres).' },
        { status: 400 }
      );
    }
    if (!cityTrim) {
      return NextResponse.json(
        { error: 'Ville / Gouvernorat requis.' },
        { status: 400 }
      );
    }
    if (!addressTrim) {
      return NextResponse.json(
        { error: 'Adresse requise.' },
        { status: 400 }
      );
    }

    const { nom, prenom } = parseName(nameTrim);
    const livraisonEmail = `quickorder-${Date.now()}@protein.tn`;

    const orderPayload: OrderRequest = {
      commande: {
        livraison_nom: nom,
        livraison_prenom: prenom,
        livraison_email: livraisonEmail,
        livraison_phone: phoneTrim,
        livraison_region: cityTrim,
        livraison_ville: cityTrim,
        livraison_adresse1: addressTrim,
        note: (note || '').trim() || undefined,
        livraison: 1,
        frais_livraison: Number(deliveryFeeSnapshot) || 0,
      },
      panier: [
        {
          produit_id: productId,
          quantite: qtyNum,
          prix_unitaire: priceSnapshot,
        },
      ],
    };

    const authHeader = request.headers.get('Authorization');
    const response = await fetch(`${API_URL}/add_commande`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(30000),
    });

    const contentType = response.headers.get('content-type');
    let data: any;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Erreur serveur. Réessayez.' },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Erreur lors de la commande.' },
        { status: response.status }
      );
    }

    const orderId = data.id ?? data.commande?.id ?? data.data?.id ?? 0;
    const numero = data.numero ?? data.commande?.numero;

    return NextResponse.json({
      orderId,
      status: 'created',
      numero: numero ?? (orderId ? `#${orderId}` : undefined),
    } as QuickOrderResponse);
  } catch (error: any) {
    console.error('[quick-order]', error);
    const msg = error.name === 'AbortError' ? 'Délai dépassé. Réessayez.' : 'Erreur inattendue. Réessayez.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
