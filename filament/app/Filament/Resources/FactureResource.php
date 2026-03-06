<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\Facture;
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

class FactureResource extends Resource
{
    protected static ?string $model = Facture::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Bon de Livraison';

    protected static ?string $pluralModelLabel = 'Bons de Livraison';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function updateTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        $timbre = (float) ($isItem ? ($get('../../timbre') ?? 0) : ($get('timbre') ?? 0));
        
        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
        
        $prefix = $isItem ? '../../' : '';
        
        $set($prefix . 'prix_ht', $calcTotals['total_ht_brut']);
        $set($prefix . 'pourcentage_remise', $calcTotals['pourcentage_remise']);
        $set($prefix . 'prix_ht_apres_remise', $calcTotals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $calcTotals['tva']);
        $set($prefix . 'prix_ttc', $calcTotals['prix_ttc']);
        $set($prefix . 'net_a_payer', $calcTotals['net_a_payer']);
    }

    public static function form(Schema $schema): Schema
    {
        $coordinate = Coordinate::getCached();
        return $schema->schema([
            Grid::make(12)->schema([
                // --------- ROW 1 ---------
                Grid::make(1)->schema([
                    Forms\Components\Placeholder::make('company_info')
                        ->label('Informations société')
                        ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                ])
                    ->columnSpan(['default' => 12, 'md' => 5])
                    ->extraAttributes(['class' => 'rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 shadow-sm']),
                Section::make('Informations Client')
                    ->description('Sélectionnez un client pour remplir automatiquement les coordonnées.')
                    ->icon('heroicon-o-user')
                    ->extraAttributes(['class' => 'rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg p-6'])
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
                                        $set('client_phone', $client?->phone_1 ?? '');
                                        $set('client_email', $client?->email ?? '');
                                    } else {
                                        $set('client_adresse', '');
                                        $set('client_phone', '');
                                        $set('client_email', '');
                                    }
                                }),
                            Forms\Components\TextInput::make('client_adresse')
                                ->label('Adresse')
                                ->disabled()
                                ->dehydrated(false)
                                ->placeholder('Adresse de livraison')
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
                        ->columnSpan(['default' => 12, 'md' => 7]),

                // --------- ROW 2 ---------
                Section::make('Articles et Produits')
                    ->description('Scannez un code-barres ou ajoutez manuellement les produits.')
                    ->icon('heroicon-o-shopping-bag')
                    ->extraAttributes(['class' => 'doc-section-produits overflow-visible rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-lg p-6'])
                    ->schema([
                            Forms\Components\Placeholder::make('barcode_scan')
                                ->label('')
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Repeater::make('details')
                                ->label('')
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->searchable()
                                        ->getSearchResultsUsing(function (string $search): array {
                                            $query = \App\Models\Product::query()
                                                ->where('qte', '>', 0)
                                                ->orderBy('designation_fr');
                                            if (strlen($search) >= 1) {
                                                $query->where(function ($q) use ($search) {
                                                    $q->where('designation_fr', 'like', '%' . $search . '%')
                                                        ->orWhere('code_product', 'like', '%' . $search . '%');
                                                });
                                            }
                                            return $query->limit(30)->get()
                                                ->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')'])
                                                ->all();
                                        })
                                        ->getOptionLabelUsing(fn ($value): ?string => $value ? (function () use ($value) {
                                            $p = \App\Models\Product::find($value);
                                            return $p ? (($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')') : null;
                                        })() : null)
                                        ->required()
                                        ->live()
                                        ->placeholder('Sélectionner un produit…')
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                            self::updateTotals($get, $set, true);
                                        })
                                        ->columnSpan(6),
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->extraInputAttributes(['style' => 'text-align:center'])
                                        ->columnSpan(2),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('Prix Unit.')
                                        ->numeric()
                                        ->default(0)
                                        ->suffix('DT')
                                        ->extraInputAttributes(['class' => 'min-w-[0]'])
                                        ->extraAttributes(['class' => '[&_.fi-input-suffix]:shrink-0 [&_.fi-input-suffix]:min-w-[35px] [&_.fi-input-suffix]:text-center'])
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(2),
                                    Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('Total Ligne')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="inline-block whitespace-nowrap font-bold tabular-nums text-sm text-gray-700 dark:text-gray-200">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, ',', ' ') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(2),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('+ Ajouter produit')
                                ->reorderable()
                                ->columnSpanFull()
                                ->extraAttributes(['class' => 'doc-lines-repeater overflow-visible'])
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->modalHeading('Supprimer cette ligne ?')
                                    ->modalSubmitActionLabel('Oui, supprimer')
                                    ->modalCancelActionLabel('Annuler')
                                    ->after(fn ($get, $set) => self::updateTotals($get, $set, false))
                                )
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Nouveau produit'),
                        ])
                        ->columnSpan(['default' => 12, 'lg' => 8]),

                // Right Column: Récapitulatif & Totaux
                Grid::make(1)->schema([
                    Section::make('Récapitulatif & Totaux')
                        ->icon('heroicon-o-calculator')
                        ->schema([
                            Forms\Components\Placeholder::make('prix_ht_label')
                                ->label('SOUS-TOTAL')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<div class="doc-sidebar-row"><span class="doc-sidebar-prefix">DT</span><span class="doc-sidebar-amount">' . number_format((float) $get('prix_ht'), 3, ',', ' ') . '</span></div>'
                                )),
                            Forms\Components\TextInput::make('remise')
                                ->label('REMISE')
                                ->numeric()
                                ->prefix('DT')
                                ->extraInputAttributes(['class' => 'min-w-[0]'])
                                ->extraAttributes(['class' => '[&_.fi-input-prefix]:shrink-0 [&_.fi-input-prefix]:min-w-[35px] [&_.fi-input-prefix]:text-center'])
                                ->default(0)
                                ->live()
                                ->afterStateUpdated(function ($state, $get, $set) {
                                    self::updateTotals($get, $set, false);
                                }),
                            Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('REMISE (%)')
                                ->numeric()
                                ->suffix('%')
                                ->default(0)
                                ->live()
                                ->afterStateUpdated(function ($state, $get, $set) {
                                    self::updateTotals($get, $set, false);
                                }),
                            Forms\Components\ViewField::make('net_a_payer_display')
                                ->hiddenLabel()
                                ->view('filament.forms.components.net-a-payer-card'),
                            Forms\Components\Placeholder::make('numero_display')
                                ->label('N° Document')
                                ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                    '<span class="inline-block font-bold font-mono text-sm px-3 py-1 rounded border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200">' . ($record?->numero ?? 'Nouveau') . '</span>'
                                )),
                        ])
                        ->columns(1),

                    Section::make('Résumé Produits')
                        ->icon('heroicon-o-chart-bar')
                        ->extraAttributes(['class' => 'rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 shadow-sm p-6'])
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<span class="block font-bold tabular-nums text-right text-gray-900 dark:text-white">' . count(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id']))) . '</span>'
                                )),
                            Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                    '<span class="block font-bold tabular-nums text-right text-gray-900 dark:text-white">' . array_sum(array_column(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])), 'qte')) . '</span>'
                                )),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                    '<span class="block font-bold text-right text-gray-900 dark:text-white">' . ($record?->created_at?->format('d/m/Y') ?? '—') . '</span>'
                                )),
                        ]),
                ])
                    ->columnSpan(['default' => 12, 'lg' => 4])
                    ->extraAttributes(['class' => 'space-y-6']),
            ])
                ->extraAttributes(['class' => 'w-full max-w-full gap-6']),

            // Hidden fields persisted to DB
            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('pourcentage_remise'),
            Forms\Components\Hidden::make('prix_ht_apres_remise'),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(0),
            Forms\Components\Hidden::make('net_a_payer'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Eager load client to prevent N+1 on client.name column
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('facture_tva_badge')
                    ->label('Facture TVA')
                    ->state(function (Facture $record): ?string {
                        $invoice = $record->factureTvas()->first();
                        return $invoice ? ('Facture TVA #' . $invoice->numero) : null;
                    })
                    ->url(fn (Facture $record): ?string => $record->factureTvas()->exists()
                        ? FactureTvaResource::getUrl('edit', ['record' => $record->factureTvas()->first()])
                        : null)
                    ->badge()
                    ->color('success')
                    ->icon('heroicon-o-document-check')
                    ->placeholder('—')
                    ->toggleable()
                    ->sortable(false),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ht')
                    ->label('Total HT')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('Net à Payer')
                    ->state(function (Facture $record) {
                        return $record->net_a_payer ?? 0;
                    })
                    ->money('TND', divideBy: 1)
                    ->sortable(),
                Tables\Columns\TextColumn::make('remise')
                    ->label('Remise')
                    ->money('TND', divideBy: 1)
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->striped()
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('convertToInvoice')
                    ->label('')
                    ->tooltip('Transformer en facture TVA')
                    ->icon('heroicon-o-arrow-right-on-rectangle')
                    ->color('success')
                    ->visible(fn (Facture $record): bool => \Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'facture_id') && ! $record->factureTvas()->exists())
                    ->requiresConfirmation()
                    ->modalHeading('Transformer en facture TVA')
                    ->modalDescription('Voulez-vous transformer ce Bon de Livraison en facture TVA ?')
                    ->modalSubmitActionLabel('Transformer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (Facture $record) {
                        $invoice = app(\App\Services\DocumentConversion\BlToInvoiceService::class)->createInvoiceFromBl($record);
                        \Filament\Notifications\Notification::make()->title('Facture #' . $invoice->numero . ' créée')->success()->send();
                        return redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                    }),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Facture $record) => route('factures.print', ['facture' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFactures::route('/'),
            'create' => Pages\CreateFacture::route('/create'),
            'edit'   => Pages\EditFacture::route('/{record}/edit'),
        ];
    }
}
