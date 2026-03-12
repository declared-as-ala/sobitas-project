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
        // BL: no timbre — always 0
        $timbre = 0.0;
        $fraisLivraison = (float) ($isItem ? ($get('../../frais_livraison') ?? 0) : ($get('frais_livraison') ?? 0));

        // BL is HT only: no TVA; net_a_payer includes frais_livraison
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);

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
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        return $schema->schema([
            Grid::make(3)->schema([
                /* Left column (2/3): Informations société + Client + Produits */
                Grid::make(1)->schema([
                    Section::make('Informations société')
                        ->icon('heroicon-o-information-circle')
                        ->schema([
                            Forms\Components\Placeholder::make('company_info')
                                ->hiddenLabel()
                                ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                        ])
                        ->columns(1),

                    Section::make('Client')
                        ->icon('heroicon-o-user')
                        ->extraAttributes(['class' => 'doc-section-client'])
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
                            Forms\Components\TextInput::make('client_adresse')->label('Adresse')->disabled()->dehydrated(false),
                            Forms\Components\TextInput::make('client_phone')->label('N° Tél')->disabled()->dehydrated(false),
                            Forms\Components\TextInput::make('client_email')->label('Email')->email()->disabled()->dehydrated(false),
                        ])
                        ->columns(1)
                        ->collapsible(),

                    Section::make('Produits')
                        ->icon('heroicon-o-shopping-cart')
                        ->extraAttributes(['class' => 'doc-section-produits'])
                        ->schema([
                            Forms\Components\Placeholder::make('barcode_scan')
                                ->label('')
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Forms\Components\ViewField::make('details')
                                ->hiddenLabel()
                                ->view('filament.forms.components.instant-invoice-details')
                                ->columnSpanFull(),
                        ])
                        ->columnSpanFull(),
                ])->columnSpan(2),

                /* Right column (1/3): Totaux + Résumé */
                Grid::make(1)->schema([
                    Section::make('Totaux')
                        ->icon('heroicon-o-calculator')
                        ->schema([
                            Forms\Components\TextInput::make('prix_ht')->label('Sous-total HT')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\TextInput::make('remise')->label('Remise')->numeric()->prefix('DT')->default(0)->live(debounce: 300)->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
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
                                    self::updateTotals($get, $set, false);
                                }),
                            Forms\Components\TextInput::make('prix_ht_apres_remise')->label('HT après remise')->numeric()->prefix('DT')->disabled()->dehydrated(false)->default(0),
                            Forms\Components\TextInput::make('frais_livraison')
                                ->label('Frais de livraison')
                                ->numeric()
                                ->prefix('DT')
                                ->default(0)
                                ->live(debounce: 300)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                            // Timbre is not used for BL, kept at 0 silently
                            Forms\Components\ViewField::make('net_a_payer_display')
                                ->label('')
                                ->hiddenLabel()
                                ->view('filament.forms.components.net-a-payer-card'),
                            Forms\Components\TextInput::make('numero_fake')
                                ->label('N° Document')
                                ->disabled()
                                ->dehydrated(false)
                                ->formatStateUsing(fn ($record) => $record?->numero ?? 'Nouveau'),
                        ])
                        ->columns(1)
                        ->extraAttributes(['class' => 'doc-totaux-sidebar']),
                    Section::make('Résumé')
                        ->icon('heroicon-o-document-text')
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => (string) count(array_filter($get('details') ?? [], fn ($d) => ! empty($d['produit_id'])))),
                            Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => (string) array_sum(array_map(fn ($d) => (int) ($d['qte'] ?? 0), $get('details') ?? []))),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($get) => $get('resume_date_display') ?? '—'),
                            Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn ($get) => $get('resume_statut_display') ?? '—'),
                            Forms\Components\Hidden::make('resume_date_display')->dehydrated(false),
                            Forms\Components\Hidden::make('resume_statut_display')->dehydrated(false),
                        ])
                        ->columns(1)
                        ->collapsible(),
                ])->columnSpan(1),
            ])->columnSpanFull(),

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
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name', 'factureTvas:id,facture_id'))
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable(),
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
