<?php

namespace App\Filament\Support;

use App\Services\DateRangeFilterService;

trait DashboardHeaderActions
{
    public string $preset = '30d';

    public bool $isRefreshing = false;

    public bool $isExporting = false;

    public function getPresets(): array
    {
        return DateRangeFilterService::getPresets();
    }

    public function updatedPreset($value): void
    {
        session(['dashboard.filter.preset' => $value]);
        $this->dispatch('dashboardFilterUpdated');
        // Keep period in URL so it persists after refresh / navigation
        $this->redirect(request()->fullUrlWithQuery(['period' => $value]), navigate: true);
    }

    public function refreshStats(): void
    {
        $this->isRefreshing = true;

        try {
            session(['dashboard.filter.preset' => $this->preset]);
            $this->dispatch('dashboardFilterUpdated');
            // Do NOT dispatch $refresh — it can re-mount widgets and reset the filter.
            // Widgets listening to dashboardFilterUpdated will refresh their data.

            \Filament\Notifications\Notification::make()
                ->title('Actualisation réussie')
                ->body('Les données du tableau de bord ont été actualisées.')
                ->success()
                ->send();

            $this->js('setTimeout(() => $wire.isRefreshing = false, 500)');
        } catch (\Exception $e) {
            $this->isRefreshing = false;

            \Filament\Notifications\Notification::make()
                ->title('Erreur lors de l\'actualisation')
                ->body('Une erreur est survenue : ' . $e->getMessage())
                ->danger()
                ->send();
        }
    }

    public function exportData(): void
    {
        $this->isExporting = true;

        $exportUrl = route('dashboard.export', ['preset' => $this->preset]);

        $this->js("
            (function() {
                const url = " . json_encode($exportUrl) . ";
                fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'text/csv' } })
                    .then(function(res) {
                        if (!res.ok) {
                            return res.text().then(function(text) {
                                throw new Error(res.status + ' ' + res.statusText + (text ? ': ' + text.substring(0, 100) : ''));
                            });
                        }
                        return res.blob();
                    })
                    .then(function(blob) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'dashboard-export-' + new Date().toISOString().slice(0,10) + '.csv';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(a.href);
                        $wire.call('showExportNotification');
                    })
                    .catch(function(err) {
                        $wire.call('showExportError', err.message);
                    })
                    .finally(function() {
                        $wire.set('isExporting', false);
                    });
            })();
        ");
    }

    public function showExportError(string $message): void
    {
        \Filament\Notifications\Notification::make()
            ->title('Erreur lors de l\'export')
            ->body('Impossible de télécharger le fichier. Vérifiez les logs ou réessayez. ' . $message)
            ->danger()
            ->send();
    }

    public function showExportNotification(): void
    {
        \Filament\Notifications\Notification::make()
            ->title('Export téléchargé')
            ->body('L\'export des données pour ' . ($this->getPresets()[$this->preset] ?? $this->preset) . ' a été téléchargé.')
            ->success()
            ->send();
    }
}

