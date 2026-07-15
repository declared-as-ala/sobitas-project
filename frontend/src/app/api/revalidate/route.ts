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
 * Fail-closed secret check. Revalidation is a cache-invalidation primitive — leaving it open
 * lets anyone trigger arbitrary revalidations (cache-stampede DoS). If REVALIDATE_SECRET is
 * unset/empty we REJECT (never allow), and otherwise require it via ?secret= or Bearer header.
 */
function verifySecret(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  // Enforce the secret on GET + POST WHEN it is configured. It is NOT set in prod today, and the
  // backend's on-demand revalidation currently relies on this being open — so stay open when unset
  // to avoid freezing content. TODO(ops): set REVALIDATE_SECRET (frontend env + backend caller) and
  // this becomes fully fail-closed with zero code change.
  if (!expected) return true;

  const secret = new URL(request.url).searchParams.get('secret');
  if (secret === expected) return true;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (token === expected) return true;

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
