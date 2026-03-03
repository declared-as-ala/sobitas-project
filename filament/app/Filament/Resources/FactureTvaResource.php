<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\FactureTva;
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
                /* Left column (2/3): Company compact + Client + Produits */
                Grid::make(1)->schema([
                    Forms\Components\Placeholder::make('company_info')
                        ->label('')
                        ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                    Section::make('Client')
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
                                    } else {
                                        $set('client_adresse', '');
                                        $set('client_phone', '');
                                    }
                                }),
                            Forms\Components\TextInput::make('client_adresse')->label('Adresse')->disabled()->dehydrated(false),
                            Forms\Components\TextInput::make('client_phone')->label('N° Tél')->disabled()->dehydrated(false),
                        ])
                        ->columns(1)
                        ->collapsible(),
                    Section::make('Produits')
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
                                        ->columnSpan(7)
                                        ->afterStateUpdated(function ($state, $set) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                        }),
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(1),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(2),
                                    Forms\Components\Placeholder::make('prix_ht_display')
                                        ->label('P.T/HT')
                                        ->content(fn ($get) => number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', ' ') . ' DT')
                                        ->extraAttributes(['style' => 'text-align: right;'])
                                        ->columnSpan(2),
                                    Forms\Components\TextInput::make('tva_pct')
                                        ->label('TVA %')
                                        ->numeric()
                                        ->default($defaultTva)
                                        ->suffix('%')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(1),
                                    Forms\Components\Placeholder::make('prix_ttc_display')
                                        ->label('TVA (DT)')
                                        ->content(fn ($get) => number_format((float) $get('qte') * (float) $get('prix_unitaire') * (float) ($get('tva_pct') ?? $defaultTva) / 100, 3, '.', ' ') . ' DT')
                                        ->extraAttributes(['style' => 'text-align: right;'])
                                        ->columnSpan(1),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter produit')
                                ->columnSpanFull()
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Ligne'),
                        ])
                        ->columnSpanFull(),
                ])->columnSpan(2),

                /* Right column (1/3): Totaux sticky */
                Section::make('Totaux')
                    ->schema([
                        Forms\Components\TextInput::make('prix_ht')->label('Sous-total HT')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                        Forms\Components\TextInput::make('remise')->label('Remise')->numeric()->prefix('DT')->default(0)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),
                        Forms\Components\Placeholder::make('remise_error')->label('')->content(fn ($get) => (float) ($get('remise') ?? 0) > (float) ($get('prix_ht') ?? 0) ? new \Illuminate\Support\HtmlString('<p class="text-sm text-danger-600 dark:text-danger-400">La remise ne peut pas dépasser le sous-total.</p>') : '')->visible(fn ($get) => (float) ($get('remise') ?? 0) > (float) ($get('prix_ht') ?? 0)),
                        Forms\Components\TextInput::make('pourcentage_remise')->label('Remise %')->numeric()->suffix('%')->default(0)->live(),
                        Forms\Components\TextInput::make('prix_ht_apres_remise')->label('HT après remise')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                        Forms\Components\TextInput::make('tva')->label('TVA')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                        Forms\Components\TextInput::make('timbre')->label('Timbre')->numeric()->prefix('DT')->default(0)->live()->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),
                        Forms\Components\TextInput::make('prix_ttc')->label('Total TTC')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                        Forms\Components\TextInput::make('net_a_payer')->label('NET À PAYER')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0)->extraInputAttributes(['class' => 'font-bold text-lg']),
                    ])
                    ->columns(1)
                    ->columnSpan(1)
                    ->extraAttributes(['class' => 'doc-totaux-sidebar']),
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
                Tables\Columns\TextColumn::make('prix_ttc')->label('Total TTC')->money('TND')->sortable(),
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
        $details = $get('details') ?? [];
        $totalHt = 0.0;
        $totalTva = 0.0;
        foreach ($details as $d) {
            if (!empty($d['produit_id'])) {
                $ht = (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                $tvaPct = (float) ($d['tva_pct'] ?? 19);
                $totalHt += $ht;
                $totalTva += $ht * $tvaPct / 100;
            }
        }
        $remise = (float) ($get('remise') ?? 0);
        $htApresRemise = $totalHt - $remise;
        $tvaApresRemise = $totalHt > 0 ? $totalTva - ($totalTva * $remise / $totalHt) : 0.0;
        $timbre = (float) ($get('timbre') ?? 0);
        $net = $htApresRemise + $tvaApresRemise + $timbre;
        $set('prix_ht', $totalHt);
        $set('prix_ht_apres_remise', $htApresRemise);
        $set('tva', $tvaApresRemise);
        $set('prix_ttc', $htApresRemise + $tvaApresRemise);
        $set('net_a_payer', $net);
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
