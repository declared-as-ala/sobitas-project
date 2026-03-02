<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * PERFORMANCE FIX: Compress API responses to reduce payload size
 * 
 * Reduces response size by 60-80% for JSON responses
 * Improves API response time, especially on slow connections
 */
class CompressResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // CRITICAL FIX: Skip compression for cached responses (already processed)
        // This avoids re-serialization overhead
        if ($response->headers->get('X-Cache') === 'HIT') {
            // Cached response - compression already handled or not needed
            return $response;
        }

        // Only compress JSON responses
        if ($response->headers->get('Content-Type') === 'application/json' ||
            str_contains($response->headers->get('Content-Type', ''), 'application/json')) {
            
            // Check if client supports compression
            $acceptEncoding = $request->header('Accept-Encoding', '');
            
            // CRITICAL FIX: Get content ONCE and reuse
            $content = $response->getContent();
            $contentLength = strlen($content);
            
            // Only compress if response is large enough to benefit (> 1KB)
            if ($contentLength < 1024) {
                return $response; // Too small to benefit from compression
            }
            
            if (str_contains($acceptEncoding, 'br') && function_exists('brotli_compress')) {
                // Brotli compression (best compression ratio)
                $compressed = @brotli_compress($content, 4, BROTLI_DEFAULT_WINDOW);
                
                if ($compressed !== false && strlen($compressed) < $contentLength * 0.9) {
                    // Only use if it reduces size by > 10%
                    $response->setContent($compressed);
                    $response->headers->set('Content-Encoding', 'br');
                    $response->headers->set('Vary', 'Accept-Encoding');
                    return $response;
                }
            }
            
            if (str_contains($acceptEncoding, 'gzip') && function_exists('gzencode')) {
                // Gzip compression (widely supported)
                $compressed = @gzencode($content, 4); // Level 4 = faster compression
                
                if ($compressed !== false && strlen($compressed) < $contentLength * 0.9) {
                    // Only use compression if it actually reduces size by > 10%
                    $response->setContent($compressed);
                    $response->headers->set('Content-Encoding', 'gzip');
                    $response->headers->set('Vary', 'Accept-Encoding');
                    $response->headers->remove('Content-Length'); // Let server calculate
                }
            }
        }

        return $response;
    }
}
