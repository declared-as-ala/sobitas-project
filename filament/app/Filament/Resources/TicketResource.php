<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TicketResource\Pages;
use App\Enums\LoyaltyCardStatus;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\LoyaltyCard;
use App\Models\Ticket;
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

class TicketResource extends Resource
{
    protected static ?string $model = Ticket::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-ticket';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'ticket';

    protected static ?string $pluralModelLabel = 'tickets';

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
                    Section::make('Client / Commande')
                        ->schema([
                                Forms\Components\Select::make('client_id')
                                    ->label('Client (optionnel)')
                                    ->relationship('client', 'name')
                                    ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id))
                                    ->getSearchResultsUsing(fn (string $search): array => \App\Models\Client::where('name', 'like', "%{$search}%")->orWhere('phone_1', 'like', "%{$search}%")->limit(30)->pluck('name', 'id')->toArray())
                                    ->getOptionLabelUsing(fn ($value): ?string => \App\Models\Client::find($value)?->name)
                                    ->preload()
                                    ->createOptionForm([
                                        Forms\Components\TextInput::make('name')
                                            ->label('Nom et prénom')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('phone_1')
                                            ->label('Téléphone')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('adresse')
                                            ->label('Adresse')
                                            ->maxLength(255),
                                    ])
                                    ->createOptionUsing(function (array $data): int {
                                        $client = Client::create([
                                            'name' => (string) ($data['name'] ?? ''),
                                            'phone_1' => $data['phone_1'] ?? null,
                                            'adresse' => $data['adresse'] ?? null,
                                        ]);

                                        return (int) $client->id;
                                    })
                                    ->searchable()
                                    ->nullable()
                                    ->rules(['nullable', 'exists:clients,id'])
                                    ->placeholder('— Aucun client (comptoir) —')
                                    ->live()
                                ->afterStateUpdated(function ($state, $set) {
                                    if ($state && $client = Client::find($state)) {
                                        $set('client_adresse', $client->adresse ?? '');
                                        $set('client_phone', $client->phone_1 ?? '');
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
                                ->label('Scan code-barres')
                                ->content(fn () => new \Illuminate\Support\HtmlString(view('filament.components.barcode-scan-compact')->render())),
                            Repeater::make('details')
                                ->label('Détails')
                                ->live()
                                ->afterStateUpdated(function ($set, $get) {
                                    self::recalculateTicketTotals($get, $set);
                                })
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->searchable()
                                        ->getSearchResultsUsing(fn (string $search): array => \App\Models\Product::getSearchOptionsForFilament($search, 30))
                                        ->getOptionLabelUsing(fn ($value): ?string => \App\Models\Product::getOptionLabelForId($value))
                                        ->required()
                                        ->live()
                                        ->placeholder('Tapez pour rechercher…')
                                        ->columnSpan(['default' => 12, 'md' => 5])
                                        ->afterStateUpdated(function ($state, $set, $get) {
                                            if ($state && $product = \App\Models\Product::query()->select(\App\Models\Product::getSelectSearchColumns())->find($state)) {
                                                $set('prix_unitaire', $product->getEffectiveUnitPrice());
                                            }
                                            self::recalculateTicketTotals($get, $set);
                                        }),
                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->default(1)
                                        ->minValue(0.001)
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(['default' => 4, 'md' => 2]),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U*')
                                        ->numeric()
                                        ->inputMode('decimal')
                                        ->default(0)
                                        ->suffix(' DT')
                                        ->extraInputAttributes(['class' => 'text-right tabular-nums min-w-[4.5rem]'])
                                        ->extraAttributes(['class' => 'fi-ticket-pu-field [&_.fi-input-suffix]:shrink-0 [&_.fi-input-suffix]:whitespace-nowrap [&_.fi-input-suffix]:pl-1'])
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(['default' => 4, 'md' => 3]),
                                    Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('Total ligne')
                                        ->content(fn ($get) => new \Illuminate\Support\HtmlString(
                                            '<div class="text-right whitespace-nowrap font-semibold text-gray-900 dark:text-white pt-2">' . number_format((float) ($get('qte') ?? 0) * (float) ($get('prix_unitaire') ?? 0), 3, ',', ' ') . ' DT</div>'
                                        ))
                                        ->columnSpan(['default' => 4, 'md' => 2]),
                                ])
                                ->columns(['default' => 12, 'md' => 12])
                                ->defaultItems(0)
                                ->addActionLabel('Ajouter une ligne')
                                ->columnSpanFull()
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::query()->select('id', 'designation_fr')->find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Ligne'),
                        ])
                        ->columnSpanFull(),
                ])->columnSpan(2),

                Section::make('Totaux')
                    ->schema([
                        Forms\Components\Placeholder::make('prix_ht_display')
                            ->label('Sous-total')
                            ->content(fn ($get) => 'DT ' . number_format((float) self::computeTicketTotals($get)[0], 3, ',', ' ')),
                        Forms\Components\TextInput::make('remise')
                            ->label('Remise')
                            ->numeric()
                            ->prefix('DT')
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(fn ($set, $get) => self::recalculateTicketTotals($get, $set)),
                        Forms\Components\TextInput::make('pourcentage_remise')
                            ->label('Remise %')
                            ->numeric()
                            ->suffix('%')
                            ->default(0)
                            ->live(debounce: 300)
                            ->afterStateUpdated(fn ($set, $get) => self::recalculateTicketTotals($get, $set)),
                        Forms\Components\ViewField::make('net_a_payer_display')
                            ->label('')
                            ->hiddenLabel()
                            ->view('filament.forms.components.ticket-net-a-payer-card'),
                        Forms\Components\Hidden::make('prix_ht')->default(0)->dehydrated(true),
                        Forms\Components\Hidden::make('prix_ttc')->default(0)->dehydrated(true),
                    ])
                    ->columns(1)
                    ->columnSpan(1)
                    ->extraAttributes(['class' => 'doc-totaux-sidebar']),
            ])->columnSpanFull(),

            Section::make('Fidélité')
                ->description('Carte et montants fidélité (saisis au POS ou ici si le client est renseigné).')
                ->schema([
                    Forms\Components\Select::make('loyalty_card_id')
                        ->label('Carte fidélité')
                        ->options(function ($get) {
                            $cid = $get('client_id');
                            if (! $cid) {
                                return [];
                            }

                            return LoyaltyCard::query()
                                ->where('client_id', (int) $cid)
                                ->where('status', '!=', LoyaltyCardStatus::Replaced->value)
                                ->orderByDesc('id')
                                ->pluck('card_number', 'id')
                                ->all();
                        })
                        ->searchable()
                        ->nullable(),
                    Forms\Components\TextInput::make('loyalty_points_redeemed')
                        ->label('Points utilisés')
                        ->numeric()
                        ->default(0)
                        ->minValue(0),
                    Forms\Components\TextInput::make('loyalty_discount_amount')
                        ->label('Remise fidélité')
                        ->numeric()
                        ->default(0)
                        ->minValue(0)
                        ->suffix('DT'),
                ])
                ->columns(3)
                ->visible(fn ($get) => (bool) $get('client_id'))
                ->collapsible()
                ->columnSpanFull(),

            Forms\Components\Hidden::make('numero'),
        ]);
    }

    /**
     * Compute totals from form state. Returns [total, remiseAmount, net].
     */
    public static function computeTicketTotals($get): array
    {
        $details = $get('details') ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) ($get('remise') ?? 0);
        $remisePct = (float) ($get('pourcentage_remise') ?? 0);
        if ($remisePct > 0 && $total > 0) {
            $remiseAmount = $total * $remisePct / 100;
        }
        $net = max(0, $total - $remiseAmount);
        return [$total, $remiseAmount, $net];
    }

    public static function recalculateTicketTotals($get, $set): void
    {
        [$total, $remiseAmount, $net] = self::computeTicketTotals($get);
        $set('prix_ht', $total);
        $set('remise', $remiseAmount);
        $set('prix_ttc', $net);
    }

    public static function table(Table $table): Table
    {
        return $table
            // PERF: Select only needed columns + eager load client
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->select(['tickets.id', 'tickets.numero', 'tickets.type', 'tickets.client_id', 'tickets.prix_ht', 'tickets.remise', 'tickets.prix_ttc', 'tickets.created_at'])
                ->with('client:id,name')
            )
            ->striped()
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(fn (?string $state) => $state === Ticket::TYPE_BON_LIVRAISON ? 'BL' : 'Caisse')
                    ->badge()
                    ->color(fn (?string $state) => $state === Ticket::TYPE_BON_LIVRAISON ? 'info' : 'success'),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ht')
                    ->label('Montant Total')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('remise')
                    ->label('Montant Remise')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Net à Payer')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->actions([
                Actions\EditAction::make()
                    ->url(fn (Ticket $record) => \App\Filament\Pages\TicketPosPage::getUrl(['ticketId' => $record->id])),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Ticket $record) => route('tickets.print', ['ticket' => $record->id]))
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
            'index'  => Pages\ListTickets::route('/'),
            'create' => Pages\CreateTicket::route('/create'),
            'edit'   => Pages\EditTicket::route('/{record}/edit'),
            'pos'    => \App\Filament\Pages\TicketPosPage::route('/pos/{ticketId?}'),
        ];
    }
}
