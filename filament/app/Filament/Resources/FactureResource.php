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

    public static function form(Schema $schema): Schema
    {
        $coordinate = Coordinate::getCached();
        return $schema->schema([
            Grid::make(3)->schema([
                Grid::make(1)->schema([
                    Forms\Components\Placeholder::make('company_info')
                        ->label('')
                        ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                    Section::make('Informations Client')
                        ->description('Sélectionnez un client pour remplir automatiquement les coordonnées.')
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
                                ->placeholder('Sélectionnez un client…')
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
                            Forms\Components\TextInput::make('client_adresse')->label('Adresse')->disabled()->dehydrated(false)->placeholder('—'),
                            Forms\Components\TextInput::make('client_phone')->label('N° Téléphone')->disabled()->dehydrated(false)->placeholder('—'),
                        ])
                        ->columns(1)
                        ->compact()
                        ->collapsible(),
                    Section::make('Articles et Produits')
                        ->description('Scannez un code-barres ou ajoutez manuellement les produits.')
                        ->icon('heroicon-o-shopping-bag')
                        ->schema([
                            Forms\Components\Placeholder::make('barcode_scan')
                                ->label('')
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Repeater::make('details')
                                ->label('')
                                ->live()
                                ->afterStateUpdated(function ($get, $set) {
                                    $details = $get('details') ?? [];
                                    $total   = 0.0;
                                    foreach ($details as $d) {
                                        if (! empty($d['produit_id'])) {
                                            $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                                        }
                                    }
                                    $remise = (float) ($get('remise') ?? 0);
                                    $set('prix_ht', $total);
                                    $set('prix_ttc', $total - $remise);
                                })
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->options(fn () => \App\Models\Product::where('qte', '>', 0)->get()->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ' (' . (int) $p->qte . ')'])->all())
                                        ->searchable()
                                        ->preload()
                                        ->required()
                                        ->live()
                                        ->placeholder('Sélectionner un produit…')
                                        ->afterStateUpdated(function ($state, $set) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                        })
                                        ->columnSpan(6),
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 400)
                                        ->extraInputAttributes(['style' => 'text-align:center'])
                                        ->columnSpan(2),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('Prix Unit.')
                                        ->numeric()
                                        ->default(0)
                                        ->suffix('DT')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->columnSpan(2),
                                    Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('Total Ligne')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="doc-line-total">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, ',', ' ') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(2),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('＋ Ajouter un produit')
                                ->reorderable()
                                ->reorderableWithButtons()
                                ->collapsible()
                                ->columnSpanFull()
                                ->extraAttributes(['class' => 'doc-lines-repeater'])
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->modalHeading('Supprimer cette ligne ?')
                                    ->modalSubmitActionLabel('Oui, supprimer')
                                    ->modalCancelActionLabel('Annuler')
                                )
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Nouvelle ligne'),
                        ])
                        ->compact()
                        ->columnSpanFull(),
                ])->columnSpan(2),

                Section::make('Récapitulatif & Totaux')
                    ->icon('heroicon-o-calculator')
                    ->description('Calculé automatiquement')
                    ->schema([
                        Forms\Components\Placeholder::make('prix_ht_display')
                            ->label('Sous-total HT')
                            ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                '<span class="doc-total-value">' . number_format((float) $get('prix_ht'), 3, ',', ' ') . ' DT</span>'
                            )),
                        Forms\Components\TextInput::make('remise')
                            ->label('Remise (DT)')
                            ->numeric()
                            ->suffix('DT')
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function ($state, $get, $set) {
                                $details = $get('details') ?? [];
                                $total   = 0.0;
                                foreach ($details as $d) {
                                    if (! empty($d['produit_id'])) {
                                        $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
                                    }
                                }
                                $set('prix_ht', $total);
                                $set('prix_ttc', $total - (float) ($state ?? 0));
                            }),
                        Forms\Components\TextInput::make('pourcentage_remise')
                            ->label('Remise (%)')
                            ->numeric()
                            ->suffix('%')
                            ->default(0)
                            ->live(),
                        Forms\Components\Placeholder::make('prix_ttc_display')
                            ->label('NET À PAYER')
                            ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                '<span class="doc-total-net">' . number_format((float) $get('prix_ttc'), 3, ',', ' ') . ' DT</span>'
                            )),
                        Forms\Components\Placeholder::make('numero_display')
                            ->label('N° Document')
                            ->content(fn ($record) => new \Illuminate\Support\HtmlString(
                                '<span style="font-weight:600;font-family:monospace">' . ($record?->numero ?? 'Nouveau') . '</span>'
                            )),
                    ])
                    ->columns(1)
                    ->compact()
                    ->extraAttributes(['class' => 'doc-totaux-sidebar']),
            ])->columnSpanFull(),

            // Hidden fields persisted to DB
            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(0),
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
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state?->label() ?? (is_string($state) ? $state : '—'))
                    ->color(fn ($state) => match ($state?->value ?? '') {
                        'issued' => 'success',
                        'delivered' => 'info',
                        default => 'gray',
                    })
                    ->toggleable(),
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
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->money('TND')
                    ->sortable(),
                Tables\Columns\TextColumn::make('remise')
                    ->label('Remise')
                    ->money('TND')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->striped()
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options([
                        'draft' => 'Brouillon',
                        'issued' => 'Émis',
                        'delivered' => 'Livré',
                    ])
                    ->placeholder('Tous'),
            ])
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
                    ->modalHeading('Aperçu d\'impression')
                    ->modalContent(fn (Facture $record) => view('filament.components.print-modal', [
                        'printUrl' => route('factures.print', ['facture' => $record->id]),
                        'title' => 'Bon de livraison ' . $record->numero,
                    ]))
                    ->modalSubmitAction(false),
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
