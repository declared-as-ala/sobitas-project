<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Disable file logging for API routes
 * 
 * File I/O on Docker/Windows is slow. Switch to errorlog (stderr) for API routes
 * to avoid filesystem bottlenecks.
 */
class DisableFileLoggingForApi
{
    public function handle(Request $request, Closure $next): Response
    {
        // CRITICAL: Switch to stderr channel for API routes
        // File I/O on Docker/Windows bind mounts is EXTREMELY slow (37s for 1000 writes!)
        // stderr writes to container logs (fast, no filesystem I/O)
        if ($request->is('api/*')) {
            // Switch default channel to stderr (writes to container logs, not files)
            config(['logging.default' => 'stderr']);
            
            // Also disable stack channel file writes
            config(['logging.channels.stack.channels' => ['stderr']]);
        }

        return $next($request);
    }
}
