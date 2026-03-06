<?php

namespace App\Filament\Resources;

use App\Filament\Resources\QuotationResource\Pages;
use App\Filament\Resources\QuotationResource\RelationManagers;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\Quotation;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Notifications\Actions\Action as NotificationAction;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class QuotationResource extends Resource
{
    protected static ?string $model = Quotation::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?string $navigationLabel = 'Devis';

    protected static ?string $modelLabel = 'Devis';

    protected static ?string $pluralModelLabel = 'Devis';

    protected static ?int $navigationSort = 4;

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
            Grid::make(['default' => 3])->schema([
                // Left Column (Main)
                Forms\Components\Group::make()->schema([
                    Forms\Components\Section::make('Informations société')
                        ->schema([
                            Forms\Components\Placeholder::make('company_info')
                                ->hiddenLabel()
                                ->content(fn () => $coordinate ? new \Illuminate\Support\HtmlString(view('filament.components.company-info-compact', ['coordinate' => $coordinate])->render()) : '—'),
                        ]),
                        
                    Forms\Components\Section::make('Client')
                        ->schema([
                            Forms\Components\Select::make('client_id')
                                ->label('Client')
                                ->relationship('client', 'name')
                                ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id))
                                ->searchable()
                                ->preload()
                                ->placeholder('Sélectionner un client')
                                ->createOptionForm([
                                    Forms\Components\TextInput::make('name')->required()->label('Nom'),
                                    Forms\Components\TextInput::make('phone_1')->label('Téléphone'),
                                    Forms\Components\TextInput::make('email')->email()->label('Email'),
                                    Forms\Components\TextInput::make('adresse')->label('Adresse'),
                                    Forms\Components\TextInput::make('matricule')->label('Matricule fiscal'),
                                ])
                                ->createOptionModalHeading('Nouveau Client')
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
                            Forms\Components\TextInput::make('client_adresse')
                                ->label('Adresse')
                                ->disabled()
                                ->dehydrated(false)
                                ->columnSpanFull(),
                            Forms\Components\TextInput::make('client_phone')
                                ->label('N° Tél')
                                ->disabled()
                                ->dehydrated(false),
                            Forms\Components\TextInput::make('client_email')
                                ->label('Email')
                                ->disabled()
                                ->dehydrated(false),
                        ])
                        ->columns(2),

                    Forms\Components\Section::make('Produits')
                        ->extraAttributes(['class' => 'overflow-visible', 'style' => 'overflow: visible !important;'])
                        ->schema([
                            Forms\Components\Placeholder::make('barcode_scan')
                                ->hiddenLabel()
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Repeater::make('details')
                                ->hiddenLabel()
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
                                        ->columnSpan(['default' => 12]),
                                    
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),
                                        
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),

                                    Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('P.T/HT')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="font-medium text-gray-700 dark:text-gray-200">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', '') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(['default' => 4]),

                                    Forms\Components\TextInput::make('tva_pct')
                                        ->label('TVA %')
                                        ->numeric()
                                        ->default($coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19)
                                        ->suffix('%')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                        ->columnSpan(['default' => 4]),
                                        
                                    Forms\Components\Placeholder::make('tva_montant_display')
                                        ->label('TVA (DT)')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<span class="inline-flex items-center px-3 py-1 rounded-md font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">' .
                                            number_format((float) $get('qte') * (float) $get('prix_unitaire') * ((float) $get('tva_pct') / 100), 3, '.', '') .
                                            ' DT</span>'
                                        ))
                                        ->columnSpan(['default' => 8]),
                                ])
                                ->columns(12)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter produit')
                                ->reorderable()
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->after(fn ($get, $set) => self::updateTotals($get, $set, false))
                                )
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Nouveau produit')
                                ->extraAttributes(['class' => 'overflow-visible', 'style' => 'overflow: visible !important;']),
                        ]),
                ])->columnSpan(['default' => 3, 'lg' => 2]),

                // Right Column (Sidebar)
                Forms\Components\Group::make()->schema([
                    Forms\Components\Section::make('Totaux')
                        ->schema([
                            Forms\Components\TextInput::make('prix_ht')
                                ->label('Sous-total HT')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            Forms\Components\TextInput::make('remise')
                                ->label('Remise')
                                ->prefix('DT')
                                ->default(0)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('Remise %')
                                ->suffix('%')
                                ->default(0)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            Forms\Components\TextInput::make('prix_ht_apres_remise')
                                ->label('HT après remise')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            Forms\Components\TextInput::make('tva')
                                ->label('TVA')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),
                                
                            Forms\Components\TextInput::make('timbre')
                                ->label('Timbre')
                                ->prefix('DT')
                                ->default(1.000)
                                ->numeric()
                                ->live(debounce: 400)
                                ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, false)),
                                
                            Forms\Components\TextInput::make('prix_ttc')
                                ->label('Total TTC')
                                ->prefix('DT')
                                ->disabled()
                                ->dehydrated(false)
                                ->default(0),

                            Forms\Components\ViewField::make('net_a_payer_display')
                                ->hiddenLabel()
                                ->view('filament.forms.components.net-a-payer-card'),

                            Forms\Components\TextInput::make('numero_fake')
                                ->label('N° Document')
                                ->disabled()
                                ->dehydrated(false)
                                ->formatStateUsing(fn ($record) => $record?->numero ?? 'Nouveau')
                        ])->columns(1),

                    Forms\Components\Section::make('Résumé')
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => count(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])))),
                            Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => array_sum(array_column(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])), 'qte'))),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($record) => $record?->created_at?->format('d/m/Y') ?? date('d/m/Y')),
                            Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn () => 'Validée'),
                        ])->columns(1),
                ])->columnSpan(['default' => 3, 'lg' => 1]),
            ]),
            
            // Hidden fields
            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('pourcentage_remise'),
            Forms\Components\Hidden::make('prix_ht_apres_remise'),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(1.000),
            Forms\Components\Hidden::make('net_a_payer'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
            ->striped()
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ht')
                    ->label('Total HT')
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('Net à Payer')
                    ->state(fn (Quotation $record) => $record->net_a_payer ?? 0)
                    ->money('TND', divideBy: 1)
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('statut')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'brouillon' => 'Brouillon',
                        'valide' => 'Validé',
                        'refuse' => 'Refusé',
                        'en_attente' => 'En attente',
                        default => '—',
                    })
                    ->color(fn (?string $state): string => match ($state) {
                        'brouillon' => 'gray',
                        'valide' => 'success',
                        'refuse' => 'danger',
                        'en_attente' => 'warning',
                        default => 'gray',
                    })
                    ->toggleable(isToggledHiddenByDefault: false),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\SelectFilter::make('statut')
                    ->label('Statut')
                    ->options([
                        'brouillon' => 'Brouillon',
                        'en_attente' => 'En attente',
                        'valide' => 'Validé',
                        'refuse' => 'Refusé',
                    ])
                    ->placeholder('Tous les statuts'),
                Tables\Filters\Filter::make('date')
                    ->form([
                        Forms\Components\DatePicker::make('from')->label('Du'),
                        Forms\Components\DatePicker::make('until')->label('Au'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($q) => $q->whereDate('created_at', '>=', $data['from']))
                            ->when($data['until'], fn ($q) => $q->whereDate('created_at', '<=', $data['until']));
                    }),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\ActionGroup::make([
                    Actions\Action::make('convertToTicket')
                        ->label('en Ticket')
                        ->icon('heroicon-o-ticket')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer le devis en ticket')
                        ->modalSubmitActionLabel('Confirmer')
                        ->action(function (Quotation $record) {
                            $ticket = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToTicket($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Ticket #' . $ticket->numero . ' créé')
                                ->success()
                                ->actions([
                                    NotificationAction::make('open')
                                        ->label('Ouvrir le document créé')
                                        ->url(\App\Filament\Resources\TicketResource::getUrl('edit', ['record' => $ticket]))
                                        ->openUrlInNewTab(false),
                                ])
                                ->send();
                        }),
                    Actions\Action::make('convertToFactureTva')
                        ->label('en Facture TVA')
                        ->icon('heroicon-o-document-duplicate')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer le devis en facture TVA')
                        ->modalSubmitActionLabel('Confirmer')
                        ->action(function (Quotation $record) {
                            $invoice = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToFactureTva($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Facture TVA #' . $invoice->numero . ' créée')
                                ->success()
                                ->actions([
                                    NotificationAction::make('open')
                                        ->label('Ouvrir le document créé')
                                        ->url(\App\Filament\Resources\FactureTvaResource::getUrl('edit', ['record' => $invoice]))
                                        ->openUrlInNewTab(false),
                                ])
                                ->send();
                        }),
                    Actions\Action::make('convertToBl')
                        ->label('en Bon de livraison')
                        ->icon('heroicon-o-document-text')
                        ->requiresConfirmation()
                        ->modalHeading('Transformer le devis en bon de livraison')
                        ->modalSubmitActionLabel('Confirmer')
                        ->action(function (Quotation $record) {
                            $bl = app(\App\Services\DocumentConversion\QuotationConversionService::class)->convertToBl($record);
                            \Filament\Notifications\Notification::make()
                                ->title('Bon de livraison #' . $bl->numero . ' créé')
                                ->success()
                                ->actions([
                                    NotificationAction::make('open')
                                        ->label('Ouvrir le document créé')
                                        ->url(\App\Filament\Resources\FactureResource::getUrl('edit', ['record' => $bl]))
                                        ->openUrlInNewTab(false),
                                ])
                                ->send();
                        }),
                ])
                    ->label('Transformer')
                    ->icon('heroicon-o-arrow-path')
                    ->color('success')
                    ->dropdownPlacement('bottom-start'),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Quotation $record) => route('quotations.print', ['quotation' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListQuotations::route('/'),
            'create' => Pages\CreateQuotation::route('/create'),
            'edit'   => Pages\EditQuotation::route('/{record}/edit'),
        ];
    }
}
