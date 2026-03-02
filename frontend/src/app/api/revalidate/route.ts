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
 * Authorization: Bearer YOUR_SECRET (optional, if REVALIDATE_SECRET is set)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const tag = searchParams.get('tag');
    const secret = searchParams.get('secret');
    
    // Optional: verify secret if REVALIDATE_SECRET is set in env
    const expectedSecret = process.env.REVALIDATE_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      // Also check Authorization header
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (token !== expectedSecret) {
        return NextResponse.json(
          { error: 'Invalid secret' },
          { status: 401 }
        );
      }
    }

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

// Allow GET for testing
export async function GET(request: NextRequest) {
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
