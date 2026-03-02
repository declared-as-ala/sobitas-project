import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Secure endpoint to invalidate the blog Data Cache.
 *
 * Call this from the backend admin (Filament/Voyager) after any
 * article create / update / delete.
 *
 * ── Usage ──────────────────────────────────────────────────
 *   POST https://protein.tn/api/revalidate-blog
 *   Headers:  Authorization: Bearer <REVALIDATE_SECRET>
 *   Body (optional JSON):  { "slug": "article-slug" }
 *
 * If a slug is provided the individual article page is also
 * revalidated by path.
 *
 * ── Env var ────────────────────────────────────────────────
 *   REVALIDATE_SECRET — shared secret between admin & frontend.
 *   If unset, all requests are accepted (dev mode).
 * ───────────────────────────────────────────────────────────
 */

function verifySecret(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return true; // no secret configured → allow (dev)

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === expected) return true;
  }

  // Check query param ?secret=
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret === expected) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Invalidate all Data Cache entries tagged 'blog'
    //    This covers getAllArticles, getArticleDetails, getLatestArticles.
    revalidateTag('blog');

    // 2. Also bust the Full Route Cache for /blog listing
    revalidatePath('/blog');
    revalidatePath('/blog', 'layout');

    // 3. If a slug was provided, revalidate that specific article page
    let slug: string | null = null;
    try {
      const body = await request.json().catch(() => null);
      slug = body?.slug ?? null;
    } catch { /* no body */ }

    if (slug) {
      revalidatePath(`/blog/${slug}`);
    }

    console.log(
      `[revalidate-blog] tag=blog, path=/blog${slug ? `, /blog/${slug}` : ''}`
    );

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      slug: slug || undefined,
    });
  } catch (error) {
    console.error('[revalidate-blog] Error:', error);
    return NextResponse.json(
      { error: 'Internal revalidation error' },
      { status: 500 }
    );
  }
}

// GET for quick manual testing / health-check (still requires secret)
export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    revalidateTag('blog');
    revalidatePath('/blog');
    revalidatePath('/blog', 'layout');

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[revalidate-blog] Error:', error);
    return NextResponse.json(
      { error: 'Internal revalidation error' },
      { status: 500 }
    );
  }
}
