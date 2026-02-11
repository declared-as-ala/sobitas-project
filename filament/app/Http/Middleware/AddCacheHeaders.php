<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * PERFORMANCE FIX: Add Cache-Control headers to cached API routes
 * 
 * Allows browsers/CDNs to cache responses, reducing server load
 * Only applied to routes that are already cached server-side
 */
class AddCacheHeaders
{
    public function handle(Request $request, Closure $next, int $maxAge = 300): Response
    {
        $response = $next($request);

        // Only add cache headers to successful GET requests
        if ($request->isMethod('GET') && $response->getStatusCode() === 200) {
            $response->headers->set('Cache-Control', "public, max-age={$maxAge}, s-maxage={$maxAge}");
            $response->headers->set('Expires', now()->addSeconds($maxAge)->toRfc7231String());
            
            // Add ETag for conditional requests (only if not already set)
            // Note: Generating ETag from content is expensive, so we skip it for large responses
            // The cache middleware already handles caching, ETag is optional
            if (!$response->headers->has('ETag') && $response->headers->get('Content-Length', 0) < 100000) {
                // Only generate ETag for smaller responses (< 100KB) to avoid performance hit
                try {
                    $etag = md5($response->getContent());
                    $response->headers->set('ETag', "\"{$etag}\"");
                } catch (\Exception $e) {
                    // Skip ETag if content can't be read (streamed responses, etc.)
                }
            }
        }

        return $response;
    }
}
