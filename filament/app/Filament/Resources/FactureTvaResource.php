<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\FactureTva;
use App\Services\InvoiceCalculator;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FactureTvaResource extends Resource
{
    protected static ?string $model = FactureTva::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-duplicate';
    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';
    protected static ?int $navigationSort = 2;
    protected static ?string $modelLabel = 'Facture TVA';
    protected static ?string $pluralModelLabel = 'Factures TVA';
    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function form(Schema $schema): Schema
    {
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        return $schema->schema([
            Forms\Components\Placeholder::make('css_injector')
                ->hiddenLabel()
                ->content(fn () => new \Illuminate\Support\HtmlString('<style>' . file_get_contents(resource_path('css/filament/facture-pos.css')) . '</style>')),

            Grid::make(12)
                ->extraAttributes(['class' => 'facture-pos-page'])
                ->schema([
                /* TOP ZONE: Left (Company) | Right (Client) */
                Forms\Components\Group::make()->schema([
                    Forms\Components\ViewField::make('company_info')
                        ->hiddenLabel()
                        ->view('filament.components.company-info-pos'),
                ])->columnSpan(['default' => 12, 'lg' => 6])->extraAttributes(['class' => 'pos-company-block']),
                
                Forms\Components\Group::make()->schema([
                    Forms\Components\Select::make('client_id')
                        ->label('Client')
                        ->relationship('client', 'name')
                        ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id) . ($record->phone_1 ? ' - ' . $record->phone_1 : ''))
                        ->getSearchResultsUsing(fn (string $search): array => Client::where('name', 'like', "%{$search}%")
                            ->orWhere('phone_1', 'like', "%{$search}%")
                            ->orWhere('mf', 'like', "%{$search}%")
                            ->limit(50)
                            ->get()
                            ->mapWithKeys(fn ($client) => [$client->id => $client->name . ($client->phone_1 ? ' - ' . $client->phone_1 : '')])
                            ->toArray()
                        )
                        ->searchable()
                        ->preload()
                        ->required()
                        ->live()
                        ->afterStateUpdated(function ($state, $set) {
                            if ($state) {
                                $client = Client::find($state);
                                $set('client_adresse', $client?->adresse ?? '');
                                $set('client_phone', $client?->phone_1 ?? '');
                                $set('client_email', $client?->email ?? '');
                            } else {
                                $set('client_adresse', '');
                                $set('client_phone', '');
                                $set('client_email', '');
                            }
                        }),
                    Forms\Components\TextInput::make('client_adresse')->label('Adresse')->disabled()->dehydrated(false),
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('client_phone')->label('N° Tél')->disabled()->dehydrated(false),
                        Forms\Components\TextInput::make('client_email')->label('Email')->email()->disabled()->dehydrated(false),
                    ]),
                ])->columnSpan(['default' => 12, 'lg' => 6])->extraAttributes(['class' => 'pos-client-block']),

                /* MIDDLE ZONE: Products Table & Scanning */
                Forms\Components\Group::make()->schema([
                    Forms\Components\ViewField::make('details')
                        ->hiddenLabel()
                        ->view('filament.forms.components.instant-invoice-details')
                ])->columnSpanFull()->extraAttributes(['class' => 'mt-6']),

                /* BOTTOM RIGHT ZONE: Totals */
                Forms\Components\Group::make()->schema([
                    Forms\Components\TextInput::make('prix_ht')->label('Montant Total HT')->numeric()->disabled()->dehydrated(false)->default(0),
                    Forms\Components\TextInput::make('remise')->label('Montant Remise')->numeric()->default(0)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set, false)),
                    Forms\Components\TextInput::make('pourcentage_remise')
                        ->label('Pourcentage Remise %')
                        ->numeric()
                        ->default(0)
                        ->live(debounce: 300)
                        ->afterStateUpdated(function ($state, $get, $set) {
                            $details = $get('details') ?? [];
                            $totalHt = 0.0;
                            foreach ($details as $d) {
                                if (! empty($d['produit_id'])) {
                                    $totalHt += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                                }
                            }
                            $set('remise', round($totalHt * (float) ($state ?? 0) / 100, 3));
                            self::recalculateFactureTvaTotals($get, $set, false);
                        }),
                    Forms\Components\TextInput::make('tva')->label('Montant Totale TVA')->numeric()->disabled()->dehydrated(false)->default(0),
                    Forms\Components\TextInput::make('prix_ttc')->label('Montant Totale TTC')->numeric()->disabled()->dehydrated(false)->default(0),
                    Forms\Components\TextInput::make('timbre')->label('Timbre Fiscal')->numeric()->default(1.000)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set, false)),
                    
                    Forms\Components\ViewField::make('net_a_payer_display')
                        ->label('')
                        ->hiddenLabel()
                        ->view('filament.forms.components.net-a-payer-card'),
                        
                    Forms\Components\Hidden::make('prix_ht_apres_remise')->dehydrated(false),
                ])
                ->columnSpan(['default' => 12, 'lg' => 4])
                ->columnStart(['lg' => 9])
                ->extraAttributes(['class' => 'pos-totals-panel mt-6']),
            ]),

            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('resume_date_display')->dehydrated(false),
            Forms\Components\Hidden::make('resume_statut_display')->dehydrated(false),
        ]);
    }

    public static function table(Table $table): Table
    {
        // Root cause fix: facture_tvas.tva stores TVA AMOUNT (TND), not rate. The previous column
        // displayed it with suffix '%', producing nonsense (e.g. 23978%). We now show TVA % (derived)
        // and TVA (DT) (amount) separately.
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name')->select(['facture_tvas.id', 'facture_tvas.numero', 'facture_tvas.status', 'facture_tvas.client_id', 'facture_tvas.prix_ht', 'facture_tvas.tva', 'facture_tvas.remise', 'facture_tvas.timbre', 'facture_tvas.prix_ttc', 'facture_tvas.net_a_payer', 'facture_tvas.created_at']))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => match ($state?->value ?? '') {
                        'issued' => 'success',
                        'paid' => 'success',
                        'partially_paid' => 'warning',
                        'canceled' => 'danger',
                        default => 'gray',
                    })
                    ->toggleable(),
                Tables\Columns\TextColumn::make('client.name')->label('Client')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('NET À PAYER')
                    ->getStateUsing(fn (FactureTva $record) => $record->net_a_payer ?? 0)
                    ->money('TND')
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->money('TND')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('tva_rate_display')
                    ->label('TVA %')
                    ->getStateUsing(fn (FactureTva $record) => $record->getTvaRatePercent())
                    ->formatStateUsing(fn ($state) => $state !== null ? (round($state) == $state ? (int) $state : $state) . '%' : '—')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('tva_amount_display')
                    ->label('TVA (DT)')
                    ->getStateUsing(fn (FactureTva $record) => $record->getTvaAmount())
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT')
                    ->sortable(query: function ($query, string $direction) {
                        return $query->orderBy('tva', $direction);
                    }),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (FactureTva $record) => route('facture-tvas.print', ['factureTva' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function recalculateFactureTvaTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        $timbre = (float) ($isItem ? ($get('../../timbre') ?? 0) : ($get('timbre') ?? 0));
        
        static $defaultTva = null;
        if ($defaultTva === null) {
            $coordinate = Coordinate::getCached();
            $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        }

        $totals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);

        $prefix = $isItem ? '../../' : '';

        $set($prefix . 'prix_ht', $totals['total_ht_brut']);
        $set($prefix . 'prix_ht_apres_remise', $totals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $totals['tva']);
        $set($prefix . 'prix_ttc', $totals['prix_ttc']);
        $set($prefix . 'net_a_payer', $totals['net_a_payer']);
        $set($prefix . 'pourcentage_remise', $totals['pourcentage_remise']);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFactureTvas::route('/'),
            'create' => Pages\CreateFactureTva::route('/create'),
            'edit'   => Pages\EditFactureTva::route('/{record}/edit'),
        ];
    }
}
