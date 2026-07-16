import { NextRequest, NextResponse } from 'next/server';

/**
 * IndexNow submission endpoint.
 *
 * The Laravel backend (Product/Review observers) POSTs the changed URLs here right after an admin
 * save; we forward them to IndexNow so Bing / Yandex / Seznam / Naver / Yep recrawl within minutes.
 * (Google does NOT consume IndexNow — its freshness signal is the sitemap <lastmod>, handled
 * separately.) A single POST to api.indexnow.org federates to all participating engines.
 *
 * Ownership is proven by the static key file served at https://protein.tn/<KEY>.txt.
 *
 * Auth is fail-closed: the caller must present the shared secret (Bearer or ?secret=). Both the key
 * and the secret fall back to committed defaults so the automation works with zero VPS config; set
 * INDEXNOW_KEY / REVALIDATE_SECRET in the environment to rotate them (update the key file name too).
 */

// Public key (also served as /<KEY>.txt). Safe to ship in the bundle — it is public by design.
const KEY = process.env.INDEXNOW_KEY || '84ddeaef0cbbc380f0bb96f4340b6a10';
// Shared secret with the backend caller. Committed default keeps it turnkey; override via env to rotate.
const SECRET = process.env.REVALIDATE_SECRET || 'c3f8316bd2ab7f577f093d1ac33005e3c561060921578c0c';
const HOST = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer && bearer === SECRET) return true;
  return new URL(req.url).searchParams.get('secret') === SECRET;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const rawUrls = (body as { urls?: unknown })?.urls;
  const urlList = (Array.isArray(rawUrls) ? rawUrls : [rawUrls])
    // Only accept absolute URLs on our own host — IndexNow rejects cross-host URLs anyway.
    .filter((u): u is string => typeof u === 'string' && u.includes(`://${HOST}`))
    .slice(0, 10000);

  if (urlList.length === 0) {
    return NextResponse.json({ ok: false, error: 'no valid urls' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList,
      }),
    });
    return NextResponse.json({ ok: res.ok, status: res.status, submitted: urlList.length });
  } catch (error) {
    console.error('[indexnow] submit failed:', error);
    return NextResponse.json({ ok: false, error: 'submit failed' }, { status: 502 });
  }
}
