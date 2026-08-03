<?php

namespace App\Observers;

use App\Models\Slide;
use App\Support\ApiResponseCache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Make a slide edit visible on the storefront immediately.
 *
 * THE OWNER'S BUG REPORT: "when I write a title and description in the admin dashboard and click
 * save, it's not saving, it's not showing in the slider."
 *
 * The save was fine. The change was sitting behind TWO independent 5-minute caches with nothing
 * connecting them to the admin:
 *
 *   1. Laravel  — routes/api.php puts /slides behind `cache.api:300`, keyed by URL with no
 *                 invalidation path (see ApiResponseCache for why finding that key needed an index).
 *   2. Next.js  — services/siteChrome.server.ts fetches with `{ revalidate: 300, tags: ['slides'] }`.
 *
 * They are sequential, not overlapping: worst case the admin waits out Laravel's TTL and THEN
 * Next's, so a change could take ~10 minutes to appear with no feedback whatsoever. Anyone would
 * conclude the save had failed and try again.
 *
 * ORDER IS LOAD-BEARING. Laravel's cache must be dropped BEFORE Next is asked to refetch —
 * otherwise the refetch is served the stale payload Laravel is still holding and the fresh copy is
 * baked in for another five minutes, which is worse than doing nothing.
 *
 * Both `path=/` and `tag=slides` are sent: the tag covers the fetch itself, and the path covers the
 * homepage's own rendered output, which also embeds the LCP <link rel="preload"> derived from slide
 * one (app/(shop)/page.tsx). Refreshing the tag without the path would leave the preload pointing at
 * the previous slide's image.
 *
 * Fire-and-forget with every failure swallowed: the storefront being slow or unreachable must never
 * turn into a failed save in the admin. Worst case we fall back to the old TTL behaviour.
 */
class SlideCacheObserver
{
    public function saved(Slide $slide): void
    {
        $this->refresh($slide, 'saved');
    }

    public function deleted(Slide $slide): void
    {
        $this->refresh($slide, 'deleted');
    }

    private function refresh(Slide $slide, string $event): void
    {
        // 1) Drop Laravel's own cached /slides payload FIRST — see the note on ordering above.
        ApiResponseCache::forget('slides');

        $internal = rtrim((string) config('services.frontend.internal_url'), '/');
        if ($internal === '') {
            return; // frontend not configured (local admin-only env) — the TTL still expires normally
        }
        $secret = (string) config('services.frontend.revalidate_secret');

        // 2) Then tell Next to drop both the fetch and the homepage it feeds.
        dispatch(static function () use ($internal, $secret, $slide, $event): void {
            try {
                $request = Http::connectTimeout(2)->timeout(4);
                if ($secret !== '') {
                    $request = $request->withToken($secret);
                }
                $request->post($internal . '/api/revalidate?tag=slides');
                $request->post($internal . '/api/revalidate?path=/');

                Log::info('slides.storefront_refreshed', ['slide_id' => $slide->getKey(), 'event' => $event]);
            } catch (Throwable $e) {
                Log::warning('slides.storefront_refresh_failed', [
                    'slide_id' => $slide->getKey(),
                    'event'    => $event,
                    'error'    => $e->getMessage(),
                ]);
            }
        })->afterResponse();
    }
}
