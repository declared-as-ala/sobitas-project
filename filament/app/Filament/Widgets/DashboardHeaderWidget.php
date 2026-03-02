<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class DashboardHeaderWidget extends Widget
{
    protected string $view = 'filament.widgets.dashboard-header-widget';
    
    protected static ?int $sort = -100;
    
    protected int | string | array $columnSpan = 'full';
    
    protected static bool $isLazy = false;

    public string $preset = '30_days';
    
    public bool $isRefreshing = false;
    
    public bool $isExporting = false;
    
    public function getPresets(): array
    {
        return [
            '7_days' => '7 derniers jours',
            '30_days' => '30 derniers jours',
            '90_days' => '90 derniers jours',
            'this_month' => 'Ce mois',
            'last_month' => 'Mois dernier',
        ];
    }

    public function updatedPreset($value)
    {
        $this->dispatch('dashboardFilterUpdated', preset: $value);
    }

    public function refreshStats()
    {
        $this->isRefreshing = true;
        
        try {
            // Dispatch event to refresh all widgets listening to dashboardFilterUpdated
        $this->dispatch('dashboardFilterUpdated', preset: $this->preset);
            
            // Refresh all widgets on the dashboard
        $this->dispatch('$refresh');
            
            // Show success notification
            Notification::make()
                ->title('Actualisation réussie')
                ->body('Les données du tableau de bord ont été actualisées.')
                ->success()
                ->send();
            
            // Use a small delay to show loading state, then reset
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

    public function exportData()
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
                        \$wire.call('showExportNotification');
                    })
                    .catch(function(err) {
                        \$wire.call('showExportError', err.message);
                    })
                    .finally(function() {
                        \$wire.set('isExporting', false);
                    });
            })();
        ");
    }

    public function showExportError(string $message): void
    {
        Notification::make()
            ->title('Erreur lors de l\'export')
            ->body('Impossible de télécharger le fichier. Vérifiez les logs ou réessayez. ' . $message)
            ->danger()
            ->send();
    }
    
    public function showExportNotification()
    {
        Notification::make()
            ->title('Export téléchargé')
            ->body('L\'export des données pour ' . $this->getPresets()[$this->preset] . ' a été téléchargé.')
            ->success()
            ->send();
    }
}
