<?php

namespace App\Filament\Widgets;

use App\Models\Facture;
use App\Services\AramexTrackingSync;
use Filament\Notifications\Notification;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Schema;

class AramexTrackingWidget extends Widget
{
    protected string $view = 'filament.widgets.aramex-tracking';

    protected static ?int $sort = 50;

    protected int|string|array $columnSpan = 'full';

    public bool $loading = false;

    public function getShipments(): \Illuminate\Support\Collection
    {
        if (! Schema::hasColumn('factures', 'aramex_hawb')) {
            return collect();
        }

        return Facture::query()
            ->whereNotNull('aramex_hawb')
            ->orderByDesc('aramex_pushed_at')
            ->limit(50)
            ->get(['id', 'numero', 'aramex_hawb', 'aramex_status', 'aramex_label_url', 'aramex_pushed_at', 'aramex_error', 'net_a_payer', 'client_id'])
            ->load('client:id,name');
    }

    /**
     * Manual refresh — the same code path the hourly schedule runs.
     *
     * It used to be a private copy: its own query, its own loop, and a write that touched only
     * `factures.aramex_status`. So pressing this button told you a parcel had been delivered and
     * left the ORDER untouched — no delivered_at, no loyalty points, no review request. That
     * divergence is exactly what AramexTrackingSync exists to remove, and a button that does
     * something subtly different from the scheduler is worse than no button.
     *
     * (Its query was also wrong. `->whereNotIn(...)->orWhere(...)` binds as
     * `(A AND B) OR (C AND D)`, so it re-admitted rows the first half had just excluded and
     * re-polled settled shipments on every press.)
     */
    public function refreshAll(): void
    {
        if (! Schema::hasColumn('factures', 'aramex_hawb')) {
            return;
        }

        $this->loading = true;

        $result = app(AramexTrackingSync::class)->sync();

        $this->loading = false;

        $body = $result['orders_updated'] > 0
            ? $result['orders_updated'] . ' commande(s) marquée(s) comme livrée(s).'
            : null;

        Notification::make()
            ->title($result['status_changed'] . ' expédition(s) mise(s) à jour')
            ->body($body)
            ->success()
            ->send();
    }

    public static function statusLabel(string $code): string
    {
        return match ($code) {
            'SH001' => 'Créé',
            'SH002' => 'En attente collecte',
            'SH003' => 'Collecté',
            'SH004' => 'En transit',
            'SH005' => 'En livraison',
            'SH006' => 'Livré',
            'SH069' => 'Tentative échouée',
            'annulé' => 'Annulé',
            default  => $code,
        };
    }

    public static function statusColor(string $code): string
    {
        return match ($code) {
            'SH006'  => 'green',
            'SH005'  => 'blue',
            'SH003', 'SH004' => 'indigo',
            'SH069'  => 'orange',
            'annulé' => 'red',
            default  => 'gray',
        };
    }
}
