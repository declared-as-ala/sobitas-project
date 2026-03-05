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
            Grid::make(3)->schema([
                /* Left column (2/3): Informations société + Client + Produits */
                Grid::make(1)->schema([
                    Section::make('Informations société')
                        ->icon('heroicon-o-information-circle')
                        ->schema([
                            Forms\Components\Placeholder::make('company_info')
                                ->label('')
                                ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                        ])
                        ->columns(1),
                    Section::make('Client')
                        ->icon('heroicon-o-user')
                        ->schema([
                            Forms\Components\Select::make('client_id')
                                ->label('Client')
                                ->relationship('client', 'name')
                                ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id))
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
                            Forms\Components\TextInput::make('client_phone')->label('N° Tél')->disabled()->dehydrated(false),
                            Forms\Components\TextInput::make('client_email')->label('Email')->email()->disabled()->dehydrated(false),
                        ])
                        ->columns(1)
                        ->collapsible(),
                    Section::make('Produits')
                        ->icon('heroicon-o-shopping-cart')
                        ->schema([
                            Forms\Components\Placeholder::make('barcode_scan')
                                ->label('')
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Repeater::make('details')
                                ->label('')
                                ->live()
                                ->afterStateUpdated(function ($set, $get) {
                                    self::recalculateFactureTvaTotals($get, $set);
                                })
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->options(fn () => \App\Models\Product::where('qte', '>', 0)->get()->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')'])->all())
                                        ->searchable()
                                        ->preload()
                                        ->required()
                                        ->live()
                                        ->columnSpan(['default' => 7, 'sm' => 12])
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                            self::recalculateFactureTvaTotals($get, $set);
                                        }),
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->columnSpan(['default' => 1, 'sm' => 4]),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->columnSpan(['default' => 2, 'sm' => 4]),
                                    Forms\Components\Placeholder::make('prix_ht_display')
                                        ->label('P.T/HT')
                                        ->content(fn ($get) => number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', ' ') . ' DT')
                                        ->extraAttributes(['class' => 'text-right font-medium'])
                                        ->columnSpan(['default' => 2, 'sm' => 4]),
                                    Forms\Components\TextInput::make('tva_pct')
                                        ->label('TVA %')
                                        ->numeric()
                                        ->default($defaultTva)
                                        ->suffix('%')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->columnSpan(['default' => 1, 'sm' => 4]),
                                    Forms\Components\Placeholder::make('prix_ttc_display')
                                        ->label('TVA (DT)')
                                        ->content(fn ($get) => number_format((float) $get('qte') * (float) $get('prix_unitaire') * (float) ($get('tva_pct') ?? $defaultTva) / 100, 3, '.', ' ') . ' DT')
                                        ->extraAttributes(['class' => 'doc-line-tva-badge text-right'])
                                        ->columnSpan(['default' => 1, 'sm' => 4]),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter produit')
                                ->columnSpanFull()
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Ligne')
                                ->extraAttributes(['class' => 'doc-lines-repeater']),
                        ])
                        ->columnSpanFull(),
                ])->columnSpan(2),

                /* Right column (1/3): Totaux + Résumé */
                Grid::make(1)->schema([
                    Section::make('Totaux')
                        ->icon('heroicon-o-calculator')
                        ->schema([
                            Forms\Components\TextInput::make('prix_ht')->label('Sous-total HT')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\TextInput::make('remise')->label('Remise')->numeric()->prefix('DT')->default(0)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),
                            Forms\Components\Placeholder::make('remise_error')->label('')->content(fn ($get) => (float) ($get('remise') ?? 0) > (float) ($get('prix_ht') ?? 0) ? new \Illuminate\Support\HtmlString('<p class="text-sm text-danger-600 dark:text-danger-400">La remise ne peut pas dépasser le sous-total.</p>') : '')->visible(fn ($get) => (float) ($get('remise') ?? 0) > (float) ($get('prix_ht') ?? 0)),
                            Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('Remise %')
                                ->numeric()
                                ->suffix('%')
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
                                    self::recalculateFactureTvaTotals($get, $set);
                                }),
                            Forms\Components\TextInput::make('prix_ht_apres_remise')->label('HT après remise')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\TextInput::make('tva')->label('TVA')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\TextInput::make('timbre')->label('Timbre')->numeric()->prefix('DT')->default(0)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),
                            Forms\Components\TextInput::make('prix_ttc')->label('Total TTC')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\ViewField::make('net_a_payer_display')
                                ->label('')
                                ->view('filament.forms.components.net-a-payer-card'),
                            Forms\Components\TextInput::make('numero_display')
                                ->label('N° Document')
                                ->disabled()
                                ->dehydrated(false),
                        ])
                        ->columns(1)
                        ->extraAttributes(['class' => 'doc-totaux-sidebar']),
                    Section::make('Résumé')
                        ->icon('heroicon-o-document-text')
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => (string) count(array_filter($get('details') ?? [], fn ($d) => ! empty($d['produit_id'])))),
                            Forms\Components\Placeholder::make('resume_quantite')
                                ->label('Quantité totale')
                                ->content(fn ($get) => (string) array_sum(array_map(fn ($d) => (int) ($d['qte'] ?? 0), $get('details') ?? []))),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($get) => $get('resume_date_display') ?? '—'),
                            Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn ($get) => $get('resume_statut_display') ?? '—')
                                ->visible(fn ($get) => (string) ($get('resume_statut_display') ?? '') !== ''),
                            Forms\Components\Hidden::make('resume_date_display')->dehydrated(false),
                            Forms\Components\Hidden::make('resume_statut_display')->dehydrated(false),
                        ])
                        ->columns(1)
                        ->collapsible(),
                ])->columnSpan(1),
            ])->columnSpanFull(),

            Forms\Components\Hidden::make('numero'),
        ]);
    }

    public static function table(Table $table): Table
    {
        // Root cause fix: facture_tvas.tva stores TVA AMOUNT (TND), not rate. The previous column
        // displayed it with suffix '%', producing nonsense (e.g. 23978%). We now show TVA % (derived)
        // and TVA (DT) (amount) separately.
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => match ($state?->value ?? '') {
                        'issued' => 'info',
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
                    ->modalHeading('Aperçu d\'impression')
                    ->modalContent(fn (FactureTva $record) => view('filament.components.print-modal', [
                        'printUrl' => route('facture-tvas.print', ['factureTva' => $record->id]),
                        'title' => 'Facture ' . $record->numero,
                    ]))
                    ->modalSubmitAction(false),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function recalculateFactureTvaTotals($get, $set): void
    {
        // When called from inside the repeater, $get('details') is null.
        // We must reach the root form state using '../../'
        $details = $get('../../details') ?? $get('details') ?? [];
        
        $remise = (float) ($get('../../remise') ?? $get('remise') ?? 0);
        $timbre = (float) ($get('../../timbre') ?? $get('timbre') ?? 0);
        
        // Find default TVA from db (optional cache to avoid 100 queries)
        static $defaultTva = null;
        if ($defaultTva === null) {
            $coordinate = Coordinate::getCached();
            $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        }

        $totals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);

        // Set values at the root form state
        $setFn = function($field, $value) use ($get, $set) {
            if ($get('../../' . $field) !== null || $get('details') === null) {
                $set('../../' . $field, $value);
            } else {
                $set($field, $value);
            }
        };

        $setFn('prix_ht', $totals['total_ht_brut']);
        $setFn('prix_ht_apres_remise', $totals['prix_ht_apres_remise']);
        $setFn('tva', $totals['tva']);
        $setFn('prix_ttc', $totals['prix_ttc']);
        $setFn('net_a_payer', $totals['net_a_payer']);
        $setFn('pourcentage_remise', $totals['pourcentage_remise']);
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
