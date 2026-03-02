<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\HistoriqueClient;
use Filament\Widgets\Widget;

class ClientHistoriqueSearchWidget extends Widget
{
    protected string $view = 'filament.widgets.client-historique-search-widget';

    protected static ?int $sort = -99;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    public ?string $tel = null;

    public function searchHistorique(): void
    {
        $tel = trim((string) $this->tel);
        if ($tel === '') {
            \Filament\Notifications\Notification::make()
                ->title('Saisissez un numéro de téléphone')
                ->warning()
                ->send();
            return;
        }

        $this->redirect(HistoriqueClient::getUrl(['tel' => $tel]));
    }

    public function clearHistorique(): void
    {
        $this->tel = null;
    }

    public function hasValidPhone(): bool
    {
        return trim((string) $this->tel) !== '';
    }
}
