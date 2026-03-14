<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Performance Caching Service: Cache stable data to reduce DB queries
 * Used for tables, nav badges, and frequently accessed settings
 */
class PerformanceCacheService
{
    private const CACHE_TTL_SHORT = 60; // 1 minute for frequently changing data
    private const CACHE_TTL_MEDIUM = 600; // 10 minutes for stable data
    private const CACHE_TTL_LONG = 3600; // 1 hour for very stable data

    /**
     * Get cached counts for navigation badges (fast!)
     */
    public static function getCommandesPendingCount(): int
    {
        return Cache::remember('filament:commandes_pending_count', self::CACHE_TTL_SHORT, function () {
            return \App\Models\Commande::where('etat', 'nouvelle_commande')->count();
        });
    }

    /**
     * Get cached ticket types for filters
     */
    public static function getTicketTypes(): array
    {
        return Cache::remember('filament:ticket_types', self::CACHE_TTL_LONG, function () {
            return \App\Models\Ticket::typeOptions();
        });
    }

    /**
     * Get cached commande statuses
     */
    public static function getCommandeStatuses(): array
    {
        return Cache::remember('filament:commande_statuses', self::CACHE_TTL_LONG, function () {
            return \App\Models\Commande::getStatusOptions();
        });
    }

    /**
     * Clear performance caches on data changes
     */
    public static function clearFilamentCaches(): void
    {
        Cache::forget('filament:commandes_pending_count');
        Cache::forget('filament:ticket_types');
        Cache::forget('filament:commande_statuses');
    }

    /**
     * Cache list query with pagination key
     * Use for expensive list views that change infrequently
     */
    public static function cacheTableQuery(
        string $key,
        callable $query,
        int $ttl = self::CACHE_TTL_SHORT
    ): mixed {
        return Cache::remember("table:{$key}", $ttl, $query);
    }

    /**
     * Clear all table cache for a resource
     */
    public static function clearTableCache(string $resourceName): void
    {
        // Clear all variations of this table cache
        $keys = Cache::tags(['table', strtolower($resourceName)])->flush();
    }
}
