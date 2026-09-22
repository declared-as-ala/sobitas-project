import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * API Route for manual cache invalidation
 * Called from admin panel when articles are updated
 * 
 * Usage:
 * POST /api/revalidate?path=/blog
 * POST /api/revalidate?path=/blog/[slug]&secret=YOUR_SECRET
 * 
 * Headers:
 * Authorization: Bearer YOUR_SECRET (REVALIDATE_SECRET is required on all methods)
 */

/**
 * Shared secret with the Laravel caller. Falls back to the same committed default that
 * `filament/config/services.php` ('services.frontend.revalidate_secret') and the IndexNow route
 * already use, so every legitimate caller — SeoNotifier and SlideCacheObserver, which both attach
 * it with `withToken($secret)` — keeps working with zero config. Set REVALIDATE_SECRET on BOTH the
 * frontend and the backend to rotate it.
 */
const SECRET = process.env.REVALIDATE_SECRET || 'c3f8316bd2ab7f577f093d1ac33005e3c561060921578c0c';

/**
 * Fail-closed secret check. Revalidation is a cache-invalidation primitive — leaving it open lets
 * anyone trigger arbitrary revalidations (cache-stampede DoS) and, via ?tag=sitemap, force a full
 * catalogue re-crawl on every request.
 *
 * This used to return true when REVALIDATE_SECRET was unset, on the assumption that the backend
 * called in anonymously. It does not: both callers send the secret as a Bearer token and read it
 * from a config default identical to the constant above, so requiring it changes nothing for them
 * and closes the endpoint to everyone else.
 */
function verifySecret(request: NextRequest): boolean {
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret === SECRET) return true;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token === SECRET) return true;

  return false;
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const tag = searchParams.get('tag');

    // Revalidate specific path
    if (path) {
      revalidatePath(path);
      console.log(`[revalidate] Revalidated path: ${path}`);
    }

    // Revalidate specific tag (if using fetch with tags)
    if (tag) {
      revalidateTag(tag);
      console.log(`[revalidate] Revalidated tag: ${tag}`);
    }

    // Default: revalidate all blog pages
    if (!path && !tag) {
      revalidatePath('/blog');
      revalidatePath('/blog', 'page');
      console.log('[revalidate] Revalidated all blog pages');
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      path: path || '/blog',
      tag: tag || null,
    });
  } catch (error) {
    console.error('[revalidate] Error:', error);
    return NextResponse.json(
      { error: 'Error revalidating cache' },
      { status: 500 }
    );
  }
}

// GET for manual testing / internal callers — still requires the secret (fail-closed).
export async function GET(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '/blog';

  try {
    revalidatePath(path);
    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      path,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error revalidating cache' },
      { status: 500 }
    );
  }
}
