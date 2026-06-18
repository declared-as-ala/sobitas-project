<?php

namespace App\Filament\Widgets;

use App\Models\Facture;
use App\Services\AramexService;
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

    public function refreshAll(): void
    {
        if (! Schema::hasColumn('factures', 'aramex_hawb')) {
            return;
        }

        $this->loading = true;

        $shipments = Facture::query()
            ->whereNotNull('aramex_hawb')
            ->whereNotIn('aramex_status', ['SH006', 'SH069', 'annulé'])
            ->orWhere(fn ($q) => $q->whereNotNull('aramex_hawb')->whereNull('aramex_status'))
            ->get(['id', 'aramex_hawb']);

        $service = app(AramexService::class);
        $updated = 0;

        foreach ($shipments as $bl) {
            $result = $service->trackShipment($bl->aramex_hawb);
            if ($result['update_code']) {
                $bl->aramex_status = $result['update_code'];
                $bl->save();
                $updated++;
            }
        }

        $this->loading = false;

        Notification::make()
            ->title($updated . ' expédition(s) mise(s) à jour')
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
