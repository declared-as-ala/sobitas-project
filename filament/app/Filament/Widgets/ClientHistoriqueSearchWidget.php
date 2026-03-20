<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\HistoriqueClient;
use Filament\Widgets\Widget;

class ClientHistoriqueSearchWidget extends Widget
{
    protected string $view = 'filament.widgets.client-historique-search-widget';

    protected static ?int $sort = 25;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    public ?string $tel = null;

    public ?string $name = null;

    public function searchHistorique(): void
    {
        $tel = trim((string) $this->tel);
        $name = trim((string) $this->name);
        if ($tel === '' && $name === '') {
            \Filament\Notifications\Notification::make()
                ->title('Saisissez un numéro de téléphone ou un nom')
                ->warning()
                ->send();
            return;
        }

        $params = array_filter([
            'tel' => $tel !== '' ? $tel : null,
            'name' => $name !== '' ? $name : null,
        ]);
        $this->redirect(HistoriqueClient::getUrl($params), navigate: true);
    }

    public function clearHistorique(): void
    {
        $this->tel = null;
        $this->name = null;
    }

    public function hasSearchCriteria(): bool
    {
        return trim((string) $this->tel) !== '' || trim((string) $this->name) !== '';
    }
}
