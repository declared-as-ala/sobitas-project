import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Blog Cache Revalidation API
 *
 * Call from admin backend after any blog CRUD operation to instantly purge
 * cached blog data. Works with ISR + tag-based invalidation.
 *
 * ─── POST (recommended for admin webhooks) ───
 *
 * POST https://protein.tn/api/revalidate
 * Content-Type: application/json
 * {
 *   "secret": "YOUR_REVALIDATE_SECRET",
 *   "action": "create" | "update" | "delete",
 *   "slug": "article-slug"           // optional, for targeted purge
 * }
 *
 * ─── GET (for testing / manual purge) ───
 *
 * GET https://protein.tn/api/revalidate?secret=YOUR_SECRET
 * GET https://protein.tn/api/revalidate?secret=YOUR_SECRET&slug=my-article
 *
 * ─── CURL examples for admin backend ───
 *
 * # Purge all blog caches (after create/delete):
 * curl -X POST https://protein.tn/api/revalidate \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret":"YOUR_SECRET","action":"create"}'
 *
 * # Purge specific article + listing (after update):
 * curl -X POST https://protein.tn/api/revalidate \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret":"YOUR_SECRET","action":"update","slug":"best-whey-protein-2026"}'
 *
 * # Quick test via GET:
 * curl "https://protein.tn/api/revalidate?secret=YOUR_SECRET"
 *
 * ─── Laravel / Filament integration ───
 *
 * In your Filament Article Resource or Observer:
 *
 *   use Illuminate\Support\Facades\Http;
 *
 *   // After save/update/delete:
 *   Http::post('https://protein.tn/api/revalidate', [
 *       'secret' => config('services.frontend.revalidate_secret'),
 *       'action' => 'update',        // or 'create', 'delete'
 *       'slug'   => $article->slug,
 *   ]);
 */

function verifySecret(request: NextRequest, bodySecret?: string): boolean {
  const expectedSecret = process.env.REVALIDATE_SECRET;

  // If no secret is configured, allow all requests (dev mode)
  if (!expectedSecret) return true;

  // Check body secret
  if (bodySecret === expectedSecret) return true;

  // Check query param
  const querySecret = new URL(request.url).searchParams.get('secret');
  if (querySecret === expectedSecret) return true;

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '');
  if (headerToken === expectedSecret) return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { secret, action, slug } = body as {
      secret?: string;
      action?: 'create' | 'update' | 'delete';
      slug?: string;
    };

    if (!verifySecret(request, secret)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const revalidated: string[] = [];

    // 1. Always purge the 'blog' tag → clears ALL blog-related Data Cache entries
    //    (getAllArticles, getLatestArticles, getArticleDetails)
    revalidateTag('blog');
    revalidated.push('tag:blog');

    // 2. Purge specific article tag + path if slug provided
    if (slug) {
      revalidateTag(`blog-${slug}`);
      revalidatePath(`/blog/${slug}`);
      revalidated.push(`tag:blog-${slug}`, `/blog/${slug}`);
    }

    // 3. Purge blog listing page
    revalidatePath('/blog');
    revalidated.push('/blog');

    // 4. Purge homepage (shows latest articles in BlogSection carousel)
    revalidatePath('/');
    revalidated.push('/');

    console.log(
      `[revalidate] Blog ${action || 'manual'} | slug=${slug || 'all'} | purged: ${revalidated.join(', ')}`
    );

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      action: action || 'manual',
      slug: slug || null,
      purged: revalidated,
    });
  } catch (error) {
    console.error('[revalidate] Error:', error);
    return NextResponse.json(
      { error: 'Error revalidating cache', details: String(error) },
      { status: 500 }
    );
  }
}

// GET for testing / manual purge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const revalidated: string[] = [];

    revalidateTag('blog');
    revalidated.push('tag:blog');

    revalidatePath('/blog');
    revalidated.push('/blog');

    revalidatePath('/');
    revalidated.push('/');

    if (slug) {
      revalidateTag(`blog-${slug}`);
      revalidatePath(`/blog/${slug}`);
      revalidated.push(`tag:blog-${slug}`, `/blog/${slug}`);
    }

    console.log(`[revalidate] GET manual purge | purged: ${revalidated.join(', ')}`);

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      purged: revalidated,
    });
  } catch (error) {
    console.error('[revalidate] Error:', error);
    return NextResponse.json(
      { error: 'Error revalidating cache', details: String(error) },
      { status: 500 }
    );
  }
}
