<?php

namespace App\Filament\Pages;

use App\Models\LoyaltyProgramSetting;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ManageLoyaltyProgramSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationLabel = 'Paramètres fidélité';

    protected static ?string $title = 'Paramètres programme fidélité';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string|\UnitEnum|null $navigationGroup = 'Fidélité';

    protected static ?int $navigationSort = 50;

    protected static ?string $slug = 'loyalty-program-settings';

    protected string $view = 'filament.pages.manage-loyalty-program-settings';

    /** @var array<string, mixed> */
    public array $data = [];

    public function mount(): void
    {
        $m = LoyaltyProgramSetting::merged();
        $this->form->fill([
            'enabled'                   => (bool) ($m['enabled'] ?? true),
            'points_per_currency'       => (int) ($m['points_per_currency'] ?? 1),
            'points_per_dt'             => (int) ($m['points_per_dt'] ?? 10),
            'min_points_to_redeem'      => (int) ($m['min_points_to_redeem'] ?? 100),
            'max_discount_percent'      => (float) ($m['max_discount_percent'] ?? 0.5),
            'allow_manual_adjustment'   => (bool) ($m['allow_manual_adjustment'] ?? true),
            'card_prefix'               => (string) ($m['card_prefix'] ?? 'PROT'),
            'ticket_earn_csv'           => implode(',', $m['ticket_earn_trigger_statuses'] ?? ['paid']),
            'ticket_reversal_csv'       => implode(',', $m['ticket_reversal_trigger_statuses'] ?? ['annulee', 'annuler', 'cancelled']),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->schema([
                Section::make('Règles générales')
                    ->schema([
                        Toggle::make('enabled')
                            ->label('Activer le programme fidélité (POS)'),
                        TextInput::make('points_per_currency')
                            ->label('Points par 1 DT dépensé (caisse)')
                            ->numeric()
                            ->minValue(1)
                            ->required(),
                        TextInput::make('points_per_dt')
                            ->label('Points pour 1 DT de remise')
                            ->numeric()
                            ->minValue(1)
                            ->required(),
                        TextInput::make('min_points_to_redeem')
                            ->label('Minimum de points pour utiliser une remise')
                            ->numeric()
                            ->minValue(0)
                            ->required(),
                        TextInput::make('max_discount_percent')
                            ->label('Part max du ticket payable en points (0–1)')
                            ->numeric()
                            ->step(0.01)
                            ->minValue(0)
                            ->maxValue(1)
                            ->required(),
                        Toggle::make('allow_manual_adjustment')
                            ->label('Autoriser les ajustements manuels'),
                        TextInput::make('card_prefix')
                            ->label('Préfixe numéro de carte')
                            ->maxLength(12)
                            ->required(),
                    ])
                    ->columns(2),
                Section::make('Tickets caisse')
                    ->schema([
                        Textarea::make('ticket_earn_csv')
                            ->label('Statuts ticket déclenchant gain (séparés par virgule)')
                            ->rows(2)
                            ->helperText('Ex. : paid'),
                        Textarea::make('ticket_reversal_csv')
                            ->label('Statuts ticket déclenchant annulation fidélité')
                            ->rows(2)
                            ->helperText('Ex. : annulee,annuler,cancelled'),
                    ]),
            ]);
    }

    public function save(): void
    {
        $state = $this->form->getState();
        $earn = array_values(array_filter(array_map('trim', explode(',', (string) ($state['ticket_earn_csv'] ?? 'paid')))));
        $rev  = array_values(array_filter(array_map('trim', explode(',', (string) ($state['ticket_reversal_csv'] ?? '')))));

        $options = [
            'enabled'                     => (bool) ($state['enabled'] ?? true),
            'points_per_currency'         => (int) ($state['points_per_currency'] ?? 1),
            'points_per_dt'               => (int) ($state['points_per_dt'] ?? 10),
            'min_points_to_redeem'        => (int) ($state['min_points_to_redeem'] ?? 100),
            'max_discount_percent'        => (float) ($state['max_discount_percent'] ?? 0.5),
            'allow_manual_adjustment'     => (bool) ($state['allow_manual_adjustment'] ?? true),
            'card_prefix'                 => (string) ($state['card_prefix'] ?? 'PROT'),
            'ticket_earn_trigger_statuses'=> $earn !== [] ? $earn : ['paid'],
            'ticket_reversal_trigger_statuses' => $rev !== [] ? $rev : ['annulee', 'annuler', 'cancelled'],
        ];

        $row = LoyaltyProgramSetting::query()->first();
        if ($row) {
            $row->update(['options' => $options]);
        } else {
            LoyaltyProgramSetting::query()->create(['options' => $options]);
        }

        LoyaltyProgramSetting::forgetMergedCache();

        Notification::make()->title('Paramètres enregistrés')->success()->send();
    }
}
