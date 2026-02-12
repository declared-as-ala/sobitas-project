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
            \Filament\Notifications\Notification::make()
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
        
        try {
            // Generate export URL with preset parameter
            $exportUrl = route('dashboard.export', ['preset' => $this->preset]);
            
            // Trigger download via JavaScript
            $this->js("
                (function() {
                    const link = document.createElement('a');
                    link.href = '{$exportUrl}';
                    link.download = '';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => {
                        \$wire.isExporting = false;
                    }, 1000);
                })();
            ");
            
            // Show success notification after a short delay
            $this->js("
                setTimeout(() => {
                    \$wire.call('showExportNotification');
                }, 500);
            ");
        } catch (\Exception $e) {
            $this->isExporting = false;
            
            \Filament\Notifications\Notification::make()
                ->title('Erreur lors de l\'export')
                ->body('Une erreur est survenue : ' . $e->getMessage())
                ->danger()
                ->send();
        }
    }
    
    public function showExportNotification()
    {
        \Filament\Notifications\Notification::make()
            ->title('Export téléchargé')
            ->body('L\'export des données pour ' . $this->getPresets()[$this->preset] . ' a été téléchargé.')
            ->success()
            ->send();
    }
}
