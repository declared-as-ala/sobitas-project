import { NextRequest, NextResponse } from 'next/server';
import type { OrderRequest, QuickOrderPayload, QuickOrderResponse } from '@/types';

const API_URL = 'https://admin.protein.tn/api';

type AddCommandeResponse = {
  id?: number;
  numero?: string;
  message?: string;
  error?: string;
  commande?: { id?: number; numero?: string };
  data?: { id?: number };
};

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

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\s/g, '').replace(/^\+216/, '');
  return /^[0-9]{8}$/.test(digits) || /^2[0-9]{7}$/.test(digits);
}

async function handleQuickOrder(request: NextRequest): Promise<Response> {
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
      nom: bodyNom,
      prenom: bodyPrenom,
      phone,
      gouvernorat,
      delegation,
      localite,
      codePostal,
      city,
      address,
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
    const nom = (bodyNom ?? '').trim();
    const prenom = (bodyPrenom ?? '').trim();
    const phoneTrim = (phone || '').trim();
    const govTrim = (gouvernorat || '').trim();
    const delTrim = (delegation || '').trim();
    const locTrim = (localite || '').trim();
    const cityTrim = (city || '').trim();
    const addressTrim = (address || '').trim();
    const useAddressFlow = !govTrim && !delTrim && !locTrim;

    if (!nom) {
      return NextResponse.json(
        { error: 'Nom requis.' },
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
    if (useAddressFlow) {
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
    } else {
      if (!govTrim || !delTrim || !locTrim) {
        return NextResponse.json(
          { error: 'Gouvernorat, délégation et localité requis.' },
          { status: 400 }
        );
      }
    }

    const livraisonEmail = `quickorder-${Date.now()}@protein.tn`;
    const livraisonRegion = useAddressFlow ? cityTrim : govTrim;
    const livraisonVille = useAddressFlow ? cityTrim : [delTrim, locTrim].filter(Boolean).join(', ');
    const livraisonAdresse1 = useAddressFlow ? addressTrim : 'Livraison';

    const orderPayload: OrderRequest = {
      commande: {
        livraison_nom: nom,
        livraison_prenom: prenom,
        livraison_email: livraisonEmail,
        livraison_phone: phoneTrim,
        livraison_region: livraisonRegion,
        livraison_ville: livraisonVille,
        livraison_code_postale: (codePostal || '').trim() || undefined,
        livraison_adresse1: livraisonAdresse1,
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
    let data: AddCommandeResponse;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      await response.text();
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

    const result: QuickOrderResponse = {
      orderId,
      status: 'created',
      numero: numero ?? (orderId ? `#${orderId}` : undefined),
    };
    return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return handleQuickOrder(request).catch((error: unknown) => {
    console.error('[quick-order]', error);
    const msg = error instanceof Error && error.name === 'AbortError' ? 'Délai dépassé. Réessayez.' : 'Erreur inattendue. Réessayez.';
    return NextResponse.json({ error: msg }, { status: 500 });
  });
}
