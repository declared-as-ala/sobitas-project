<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\HistoriqueClient;
use Filament\Widgets\Widget;

class ClientHistoriqueSearchWidget extends Widget
{
    protected string $view = 'filament.widgets.client-historique-search-widget';

    protected static ?int $sort = -150;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    public ?string $tel = null;

    public ?string $name = null;

    /**
     * Named distinctly from Dashboard stubs (searchHistorique/clearHistorique no-ops)
     * so Livewire never dispatches this action to the parent page by mistake.
     */
    public function submitClientHistoriqueSearch(): mixed
    {
        $tel = trim((string) $this->tel);
        $name = trim((string) $this->name);
        if ($tel === '' && $name === '') {
            \Filament\Notifications\Notification::make()
                ->title('Saisissez un numéro de téléphone ou un nom')
                ->warning()
                ->send();

            return null;
        }

        $params = array_filter([
            'tel' => $tel !== '' ? $tel : null,
            'name' => $name !== '' ? $name : null,
        ]);

        // Full navigation — Filament SPA redirect from widgets can otherwise no-op / refresh dashboard.
        return $this->redirect(HistoriqueClient::getUrl($params), navigate: false);
    }

    public function clearClientHistoriqueFields(): void
    {
        $this->tel = null;
        $this->name = null;
    }

    public function hasSearchCriteria(): bool
    {
        return trim((string) $this->tel) !== '' || trim((string) $this->name) !== '';
    }
}
