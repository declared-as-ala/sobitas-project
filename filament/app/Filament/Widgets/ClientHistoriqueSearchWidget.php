<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\HistoriqueClient;
use Filament\Notifications\Notification;
use Filament\Widgets\Widget;

/**
 * Nested Livewire widget: this class owns $tel / $name and all actions.
 * The Blade view renders in *this* component’s context ($this = widget).
 */
class ClientHistoriqueSearchWidget extends Widget
{
    protected string $view = 'filament.widgets.client-historique-search-widget';

    protected static ?int $sort = -150;

    protected int | string | array $columnSpan = 'full';

    protected static bool $isLazy = false;

    public ?string $tel = null;

    public ?string $name = null;

    public function submitClientHistoriqueSearch(): mixed
    {
        $tel = trim((string) $this->tel);
        $name = trim((string) $this->name);
        if ($tel === '' && $name === '') {
            Notification::make()
                ->title('Saisissez un numéro de téléphone ou un nom')
                ->warning()
                ->send();

            return null;
        }

        $params = array_filter([
            'tel' => $tel !== '' ? $tel : null,
            'name' => $name !== '' ? $name : null,
        ]);

        return $this->redirect(HistoriqueClient::getUrl($params), navigate: false);
    }

    public function clearClientHistoriqueFields(): void
    {
        $this->tel = null;
        $this->name = null;
    }
}
