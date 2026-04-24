<?php

namespace App\Filament\Partner\Pages;

use App\Models\Partner;
use App\Services\PartnerCommissionService;
use Filament\Pages\Page;

class PartnerDashboard extends Page
{
    protected string $view = 'filament.partner.pages.dashboard';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-home';

    protected static ?string $navigationLabel = 'Tableau de bord';

    protected static ?string $title = 'Tableau de bord';

    protected static ?int $navigationSort = 1;

    public ?Partner $partner = null;
    public float $totalEarned = 0;
    public float $availableBalance = 0;
    public float $pendingEarnings = 0;
    public float $totalPaid = 0;
    public int $totalOrders = 0;

    public function mount(): void
    {
        $this->partner = $this->getCurrentPartner();
        if (! $this->partner) {
            abort(403, 'Compte partenaire introuvable.');
        }

        $this->totalEarned      = $this->partner->total_earned;
        $this->availableBalance = $this->partner->available_balance;
        $this->pendingEarnings  = $this->partner->pending_earnings;
        $this->totalPaid        = $this->partner->total_paid;
        $this->totalOrders      = $this->partner->commandes()->count();
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();
        if (! $user) {
            return false;
        }
        return \App\Models\Partner::where('user_id', $user->id)->where('status', 'active')->exists();
    }

    protected function getCurrentPartner(): ?Partner
    {
        return Partner::where('user_id', auth()->id())->where('status', 'active')->first();
    }
}
