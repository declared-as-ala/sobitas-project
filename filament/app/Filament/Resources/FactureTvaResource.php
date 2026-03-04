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

    /**
     * Recalculate all totals. Also syncs remise ↔ remise%.
     * $changedField: 'remise' | 'pourcentage_remise' | null (no sync needed)
     */
    public static function recalculateFactureTvaTotals($get, $set, string $changedField = null): void
    {
        $details = $get('details') ?? [];
        $totalHt = 0.0;
        $totalTva = 0.0;

        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $ht     = (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                $tvaPct = (float) ($d['tva_pct'] ?? 19);
                $totalHt  += $ht;
                $totalTva += $ht * $tvaPct / 100;
            }
        }

        // Sync remise DT ↔ remise %
        $remise    = (float) ($get('remise') ?? 0);
        $pctRemise = (float) ($get('pourcentage_remise') ?? 0);

        if ($changedField === 'pourcentage_remise' && $totalHt > 0) {
            // User changed %, derive DT amount
            $remise = round($totalHt * $pctRemise / 100, 3);
            $set('remise', $remise);
        } elseif ($changedField === 'remise' && $totalHt > 0) {
            // User changed DT, derive %
            $pctRemise = round($remise / $totalHt * 100, 4);
            $set('pourcentage_remise', $pctRemise);
        }

        // Clamp remise to HT
        if ($remise > $totalHt) {
            $remise = $totalHt;
            $set('remise', $remise);
        }
        if ($remise < 0) {
            $remise = 0;
            $set('remise', 0);
        }

        $htApresRemise  = $totalHt - $remise;
        $tvaApresRemise = $totalHt > 0 ? $totalTva - ($totalTva * $remise / $totalHt) : 0.0;
        $timbre = (float) ($get('timbre') ?? 0);
        if ($timbre < 0) {
            $timbre = 0;
        }
        $ttc = $htApresRemise + $tvaApresRemise;
        $net = $ttc + $timbre;

        $set('prix_ht',              $totalHt);
        $set('prix_ht_apres_remise', $htApresRemise);
        $set('tva',                  $tvaApresRemise);
        $set('prix_ttc',             $ttc);
        $set('net_a_payer',          $net);
    }

    public static function form(Schema $schema): Schema
    {
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        return $schema->schema([
            Grid::make(3)->schema([
                /* ── Left column (2/3): Company + Client + Produits ── */
                Grid::make(1)->schema([

                    // Company info card
                    Forms\Components\Placeholder::make('company_info')
                        ->label('')
                        ->content(fn () => $coordinate
                            ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render())
                            : '—'),

                    // Client card
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
                                ->placeholder('Sélectionner un client')
                                ->afterStateUpdated(function ($state, $set) {
                                    if ($state) {
                                        $client = Client::find($state);
                                        $set('client_adresse', $client?->adresse ?? '');
                                        $set('client_phone',   $client?->phone_1 ?? '');
                                        $set('client_email',   $client?->email ?? '');
                                    } else {
                                        $set('client_adresse', '');
                                        $set('client_phone',   '');
                                        $set('client_email',   '');
                                    }
                                })
                                ->columnSpanFull(),
                            Forms\Components\TextInput::make('client_adresse')
                                ->label('Adresse')
                                ->disabled()
                                ->dehydrated(false)
                                ->placeholder('Adresse client')
                                ->columnSpanFull(),
                            Forms\Components\TextInput::make('client_phone')
                                ->label('N° Tél')
                                ->disabled()
                                ->dehydrated(false)
                                ->placeholder('+216 XX XXX XXX'),
                            Forms\Components\TextInput::make('client_email')
                                ->label('Email')
                                ->disabled()
                                ->dehydrated(false)
                                ->placeholder('client@email.com'),
                        ])
                        ->columns(2)
                        ->compact(),

                    // Produits card
                    Section::make('Produits')
                        ->icon('heroicon-o-shopping-bag')
                        ->description('Scannez un code-barres ou ajoutez manuellement les produits.')
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
                                    // Product select — wide
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->options(fn () => \App\Models\Product::where('qte', '>', 0)
                                            ->get()
                                            ->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')'])
                                            ->all())
                                        ->searchable()
                                        ->preload()
                                        ->required()
                                        ->live()
                                        ->placeholder('Sélectionner un produit…')
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                            self::recalculateFactureTvaTotals($get, $set);
                                        })
                                        ->columnSpan(6),

                                    // Qty
                                    Forms\Components\TextInput::make('qte')
                                        ->label('QTÉ')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(0)
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->extraInputAttributes(['style' => 'text-align:center'])
                                        ->columnSpan(1),

                                    // Unit price
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->columnSpan(2),

                                    // TVA %
                                    Forms\Components\TextInput::make('tva_pct')
                                        ->label('TVA %')
                                        ->numeric()
                                        ->default($defaultTva)
                                        ->suffix('%')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->afterStateUpdated(fn ($get, $set) => self::recalculateFactureTvaTotals($get, $set))
                                        ->columnSpan(1),

                                    // TVA amount (read-only)
                                    Forms\Components\Placeholder::make('tva_amt_display')
                                        ->label('TVA (DT)')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="doc-line-total" style="color:#3b82f6">' .
                                            'DT ' . number_format(
                                                (float) $get('qte') * (float) $get('prix_unitaire') * (float) ($get('tva_pct') ?? $defaultTva) / 100,
                                                3, '.', ' '
                                            ) . '</span>'
                                        ))
                                        ->columnSpan(1),

                                    // Line total HT
                                    Forms\Components\Placeholder::make('prix_ht_display')
                                        ->label('P.T HT')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="doc-line-total">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', ' ') .
                                            ' DT</span>'
                                        ))
                                        ->extraAttributes(['style' => 'text-align:right'])
                                        ->columnSpan(1),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('+ Ajouter produit')
                                ->reorderable()
                                ->columnSpanFull()
                                ->extraAttributes(['class' => 'doc-lines-repeater'])
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->modalHeading('Supprimer cette ligne ?')
                                    ->modalSubmitActionLabel('Oui, supprimer')
                                    ->modalCancelActionLabel('Annuler')
                                    ->after(fn (\Filament\Forms\Get $get, \Filament\Forms\Set $set) => self::recalculateFactureTvaTotals($get, $set))
                                )
                                ->itemLabel(fn (array $state) => isset($state['produit_id'])
                                    ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne')
                                    : 'Nouveau produit'),
                        ])
                        ->compact()
                        ->columnSpanFull(),

                ])->columnSpan(2),

                /* ── Right column (1/3): Totaux ── */
                Grid::make(1)->schema([

                    Section::make('Totaux')
                        ->icon('heroicon-o-calculator')
                        ->schema([
                            // Sous-total HT (read-only display)
                            Forms\Components\TextInput::make('prix_ht')
                                ->label('SOUS-TOTAL HT')
                                ->numeric()
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0)
                                ->extraInputAttributes(['class' => 'font-semibold']),

                            // Remise (DT) — editable, triggers calc
                            Forms\Components\TextInput::make('remise')
                                ->label('REMISE')
                                ->numeric()
                                ->prefix('DT')
                                ->default(0)
                                ->live()
                                ->afterStateUpdated(function ($state, $get, $set) {
                                    self::recalculateFactureTvaTotals($get, $set, 'remise');
                                }),

                            // Remise % — editable, triggers calc
                            Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('REMISE (%)')
                                ->numeric()
                                ->suffix('%')
                                ->default(0)
                                ->live()
                                ->afterStateUpdated(function ($state, $get, $set) {
                                    self::recalculateFactureTvaTotals($get, $set, 'pourcentage_remise');
                                }),

                            // HT après remise (read-only)
                            Forms\Components\TextInput::make('prix_ht_apres_remise')
                                ->label('HT APRÈS REMISE')
                                ->numeric()
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),

                            // TVA (read-only)
                            Forms\Components\TextInput::make('tva')
                                ->label('TVA')
                                ->numeric()
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0)
                                ->extraInputAttributes(['style' => 'color: #3b82f6']),

                            // Timbre — editable
                            Forms\Components\TextInput::make('timbre')
                                ->label('TIMBRE')
                                ->numeric()
                                ->prefix('DT')
                                ->default(1)
                                ->live()
                                ->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),

                            // Total TTC (read-only)
                            Forms\Components\TextInput::make('prix_ttc')
                                ->label('TOTAL TTC')
                                ->numeric()
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),

                            // Net à payer — orange block
                            Forms\Components\Placeholder::make('net_a_payer_display')
                                ->label('NET À PAYER')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<div class="doc-total-net-block">' .
                                    '<span class="doc-total-net-prefix">DT</span>' .
                                    '<span class="doc-total-net-amount">' .
                                    number_format((float) $get('net_a_payer'), 3, '.', ' ') .
                                    '</span></div>'
                                )),

                            // N° Document badge
                            Forms\Components\Placeholder::make('numero_display')
                                ->label('N° Document')
                                ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                    '<span class="doc-numero-badge">' . ($record?->numero ?? 'Nouveau') . '</span>'
                                )),
                        ])
                        ->columns(1)
                        ->compact()
                        ->extraAttributes(['class' => 'doc-totaux-sidebar']),

                    // Résumé card
                    Section::make('Résumé')
                        ->icon('heroicon-o-chart-bar')
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<span class="doc-resume-value">' .
                                    count(array_filter($get('details') ?? [], fn ($d) => ! empty($d['produit_id']))) .
                                    '</span>'
                                )),
                            Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<span class="doc-resume-value">' .
                                    array_sum(array_column(
                                        array_filter($get('details') ?? [], fn ($d) => ! empty($d['produit_id'])),
                                        'qte'
                                    )) .
                                    '</span>'
                                )),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                    '<span class="doc-resume-value">' .
                                    ($record?->created_at?->format('d/m/Y') ?? '—') .
                                    '</span>'
                                )),
                            Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                    $record?->status
                                        ? '<span class="fi-badge fi-color-success rounded-md px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">' .
                                          ($record->status->label()) . '</span>'
                                        : '<span class="doc-resume-value">—</span>'
                                )),
                        ])
                        ->compact(),

                ])->columnSpan(1),

            ])->columnSpanFull(),

            // Hidden persisted fields — only columns that exist in facture_tvas table
            // prix_ht, remise, pourcentage_remise, tva, timbre, prix_ttc are real columns.
            // prix_ht_apres_remise and net_a_payer are display-only (no DB column).
            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(1),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => match ($state?->value ?? '') {
                        'issued'          => 'info',
                        'paid'            => 'success',
                        'partially_paid'  => 'warning',
                        'canceled'        => 'danger',
                        default           => 'gray',
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
                    ->url(fn (FactureTva $record) => route('facture-tvas.print', ['factureTva' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
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
