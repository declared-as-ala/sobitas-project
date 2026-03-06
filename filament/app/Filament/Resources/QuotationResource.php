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
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        return $schema->schema([
            Grid::make(3)->schema([
                // Left Column (Main): Informations société + Client + Produits
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
                        ->schema([
                            Grid::make(2)->schema([
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
                                    ->columnSpanFull()
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
                                    ->dehydrated(false)
                                    ->columnSpan(1),
                                Forms\Components\TextInput::make('client_email')
                                    ->label('Email')
                                    ->disabled()
                                    ->dehydrated(false)
                                    ->columnSpan(1),
                            ]),
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
                            \Filament\Forms\Components\Repeater::make('details')
                                ->label('')
                                ->live()
                                ->afterStateUpdated(function ($set, $get) {
                                    self::updateTotals($get, $set, false);
                                })
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
                                        ->columnSpan(['default' => 12])
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::find($state)) {
                                                $set('prix_unitaire', (float) ($product->prix ?? 0));
                                            }
                                            self::updateTotals($get, $set, true);
                                        }),
                                    
                                    Grid::make(10)->schema([
                                        Forms\Components\TextInput::make('qte')
                                            ->label('Qté *')
                                            ->numeric()
                                            ->default(1)
                                            ->minValue(1)
                                            ->required()
                                            ->live(debounce: 300)
                                            ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                            ->columnSpan(['default' => 2]),
                                            
                                        Forms\Components\TextInput::make('prix_unitaire')
                                            ->label('P.U HT *')
                                            ->numeric()
                                            ->default(0)
                                            ->required()
                                            ->live(debounce: 300)
                                            ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                            ->columnSpan(['default' => 3]),

                                        Forms\Components\TextInput::make('tva_pct')
                                            ->label('TVA % *')
                                            ->numeric()
                                            ->default($defaultTva)
                                            ->required()
                                            ->live(debounce: 300)
                                            ->afterStateUpdated(fn ($get, $set) => self::updateTotals($get, $set, true))
                                            ->columnSpan(['default' => 2]),

                                        Forms\Components\Placeholder::make('prix_total_display')
                                            ->label('Total HT')
                                            ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-line-total text-right bg-gray-50 px-2 py-0.5 rounded">' . number_format((float) $get('qte') * (float) $get('prix_unitaire'), 3, '.', ' ') . ' DT</div>'))
                                            ->columnSpan(['default' => 2]),
                                            
                                        Forms\Components\Placeholder::make('tva_montant_display')
                                            ->label('TVA (DT)')
                                            ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-line-tva-badge text-right text-gray-500 bg-gray-50 px-2 py-0.5 rounded">' . number_format((float) $get('qte') * (float) $get('prix_unitaire') * ((float) ($get('tva_pct') ?? $defaultTva) / 100), 3, '.', ' ') . ' DT</div>'))
                                            ->columnSpan(['default' => 1]),
                                    ]),
                                ])
                                ->columns(1)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter un produit')
                                ->columnSpanFull()
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Ligne')
                                ->reorderable()
                                ->deleteAction(fn ($action) => $action
                                    ->requiresConfirmation()
                                    ->modalHeading('Supprimer cette ligne ?')
                                    ->modalSubmitActionLabel('Oui, supprimer')
                                    ->modalCancelActionLabel('Annuler')
                                    ->after(fn ($get, $set) => self::updateTotals($get, $set, false))
                                )
                                ->extraAttributes(['class' => 'doc-lines-repeater']),
                        ])
                        ->columnSpanFull(),
                ])->columnSpan(2),

                // Right Column (Sidebar): Totaux + Résumé
                Grid::make(1)->schema([
                    Section::make('Totaux')
                        ->icon('heroicon-o-calculator')
                        ->schema([
                            Forms\Components\Placeholder::make('prix_ht')
                                ->label('Sous-total HT')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-resume-value">' . number_format((float) ($get('prix_ht') ?: 0), 3, ',', ' ') . ' DT</div>')),

                            Forms\Components\TextInput::make('pourcentage_remise')
                                ->label('Remise %')
                                ->numeric()
                                ->suffix('%')
                                ->default(0)
                                ->live(debounce: 300)
                                ->afterStateUpdated(function ($state, $get, $set) {
                                    $ht = (float) ($get('prix_ht') ?? 0);
                                    $pct = (float) ($state ?? 0);
                                    $set('remise', round($ht * ($pct / 100), 3));
                                    self::updateTotals($get, $set, false);
                                }),

                            Forms\Components\Hidden::make('remise'),

                            Forms\Components\Placeholder::make('prix_ht_apres_remise')
                                ->label('HT après remise')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-resume-value">' . number_format((float) ($get('prix_ht_apres_remise') ?: 0), 3, ',', ' ') . ' DT</div>')),
                                
                            Forms\Components\Placeholder::make('tva')
                                ->label('TVA')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-resume-value">' . number_format((float) ($get('tva') ?: 0), 3, ',', ' ') . ' DT</div>')),
                                
                            Forms\Components\Placeholder::make('timbre')
                                ->label('Timbre')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-resume-value">' . number_format((float) ($get('timbre') ?: 0), 3, ',', ' ') . ' DT</div>')),

                            Forms\Components\Placeholder::make('prix_ttc')
                                ->label('Total TTC')
                                ->content(fn ($get) => new \Illuminate\Support\HtmlString('<div class="doc-resume-value text-base font-bold text-gray-900">' . number_format((float) ($get('prix_ttc') ?: 0), 3, ',', ' ') . ' DT</div>')),

                            Forms\Components\ViewField::make('net_a_payer_display')
                                ->hiddenLabel()
                                ->view('filament.forms.components.net-a-payer-card')
                                ->columnSpanFull(),

                            Forms\Components\TextInput::make('numero_fake')
                                ->label('N° Document')
                                ->disabled()
                                ->dehydrated(false)
                                ->formatStateUsing(fn ($record) => $record?->numero ?? 'Nouveau')
                        ])
                        ->columns(1)
                        ->extraAttributes(['class' => 'doc-totaux-sidebar']),

                    Section::make('Résumé')
                        ->icon('heroicon-o-document-text')
                        ->schema([
                            Forms\Components\Placeholder::make('resume_articles')
                                ->label('Articles')
                                ->content(fn ($get) => (string) count(array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id'])))),
                            Forms\Components\Placeholder::make('resume_qte')
                                ->label('Quantité totale')
                                ->content(fn ($get) => (string) array_sum(array_map(fn ($d) => (int) ($d['qte'] ?? 0), array_filter($get('details') ?? [], fn($d) => !empty($d['produit_id']))))),
                            Forms\Components\Placeholder::make('resume_date')
                                ->label('Date')
                                ->content(fn ($record) => $record?->created_at?->format('d/m/Y') ?? date('d/m/Y')),
                            Forms\Components\Placeholder::make('resume_statut')
                                ->label('Statut')
                                ->content(fn () => new \Illuminate\Support\HtmlString('<span class="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md text-xs font-medium text-success-700 bg-success-50 ring-1 ring-inset ring-success-600/20 dark:bg-success-400/10 dark:text-success-400 dark:ring-success-400/20"><svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>Validée</span>')),
                        ])
                        ->columns(1)
                        ->collapsible(),
                ])->columnSpan(1),
            ])->columnSpanFull(),
            
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
