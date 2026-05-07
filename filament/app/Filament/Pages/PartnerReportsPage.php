<?php

namespace App\Filament\Pages;

use App\Enums\PartnerStatus;
use App\Models\Partner;
use App\Models\PartnerCommissionTransaction;
use App\Models\Ticket;
use Filament\Pages\Page;

class PartnerReportsPage extends Page
{
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chart-pie';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Rapports partenaires';

    protected static ?string $title = 'Rapports partenaires';

    protected static ?string $slug = 'partner-reports';

    protected static ?int $navigationSort = 40;

    protected string $view = 'filament.pages.partner-reports';

    public int $partnersTotal = 0;

    public int $partnersActive = 0;

    public int $ticketsAttributed = 0;

    public float $commissionsConfirmed = 0;

    public float $payoutsPending = 0;

    public function mount(): void
    {
        $this->partnersTotal = Partner::query()->count();
        $this->partnersActive = Partner::query()->where('status', PartnerStatus::Active->value)->count();
        $this->ticketsAttributed = Ticket::query()->whereNotNull('partner_id')->count();

        $this->commissionsConfirmed = (float) PartnerCommissionTransaction::query()
            ->where('type', \App\Enums\PartnerCommissionTransactionType::Commission->value)
            ->where('status', \App\Enums\PartnerCommissionTransactionStatus::Confirmed->value)
            ->sum('amount');

        $this->payoutsPending = (float) PartnerCommissionTransaction::query()
            ->where('type', \App\Enums\PartnerCommissionTransactionType::Payout->value)
            ->where('status', \App\Enums\PartnerCommissionTransactionStatus::Pending->value)
            ->sum('amount');
    }
}
