<?php

namespace App\Observers;

use App\Models\Commande;
use App\Models\Ticket;
use App\Models\FactureTva;
use App\Models\Facture;
use App\Models\Quotation;
use App\Services\PerformanceCacheService;
use Illuminate\Support\Facades\Cache;

/**
 * Model Observers for Cache Invalidation
 * 
 * Automatically clears relevant caches when records are created/updated/deleted.
 * This ensures stale data is never served while maintaining cache effectiveness.
 */

class CommandeObserver
{
    public function created(Commande $commande): void
    {
        Cache::forget('nav:commandes_pending');
        PerformanceCacheService::clearTableCache('CommandeResource');
    }

    public function updated(Commande $commande): void
    {
        // Only clear if status changed (affects badge)
        if ($commande->isDirty('etat')) {
            Cache::forget('nav:commandes_pending');
        }
        PerformanceCacheService::clearTableCache('CommandeResource');
    }

    public function deleted(Commande $commande): void
    {
        Cache::forget('nav:commandes_pending');
        PerformanceCacheService::clearTableCache('CommandeResource');
    }
}

class TicketObserver
{
    public function created(Ticket $ticket): void
    {
        PerformanceCacheService::clearTableCache('TicketResource');
    }

    public function updated(Ticket $ticket): void
    {
        PerformanceCacheService::clearTableCache('TicketResource');
    }

    public function deleted(Ticket $ticket): void
    {
        PerformanceCacheService::clearTableCache('TicketResource');
    }
}

class FactureTvaObserver
{
    public function created(FactureTva $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureTvaResource');
    }

    public function updated(FactureTva $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureTvaResource');
    }

    public function deleted(FactureTva $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureTvaResource');
    }
}

class FactureObserver
{
    public function created(Facture $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureResource');
    }

    public function updated(Facture $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureResource');
    }

    public function deleted(Facture $facture): void
    {
        PerformanceCacheService::clearTableCache('FactureResource');
    }
}

class QuotationObserver
{
    public function created(Quotation $quotation): void
    {
        PerformanceCacheService::clearTableCache('QuotationResource');
    }

    public function updated(Quotation $quotation): void
    {
        PerformanceCacheService::clearTableCache('QuotationResource');
    }

    public function deleted(Quotation $quotation): void
    {
        PerformanceCacheService::clearTableCache('QuotationResource');
    }
}
