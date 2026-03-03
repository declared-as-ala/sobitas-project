<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TicketResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
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
                    Section::make('Client / Commande')
                        ->schema([
                            Forms\Components\Select::make('type')
                                ->label('Type de ticket')
                                ->options(Ticket::typeOptions())
                                ->default(Ticket::TYPE_TICKET_CAISSE)
                                ->required()
                                ->live()
                                ->native(false),
                            Forms\Components\Select::make('commande_id')
                                ->label('Commande (BL)')
                                ->relationship('commande', 'numero', fn ($q) => $q->where('etat', '!=', 'annuler')->orderByDesc('created_at'))
                                ->getOptionLabelFromRecordUsing(fn ($r) => $r->numero . ' — ' . trim(($r->nom ?? '') . ' ' . ($r->prenom ?? '')) . ' — ' . number_format((float) ($r->prix_ttc ?? 0), 2, ',', ' ') . ' DT')
                                ->searchable()
                                ->preload()
                                ->required(fn ($get) => $get('type') === Ticket::TYPE_BON_LIVRAISON)
                                ->hidden(fn ($get) => $get('type') !== Ticket::TYPE_BON_LIVRAISON)
                                ->dehydrated(true),
                            Forms\Components\Select::make('client_id')
                                ->label('Client')
                                ->relationship('client', 'name')
                                ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? 'Client #' . $record->id))
                                ->searchable()
                                ->preload()
                                ->required(fn ($get) => $get('type') === Ticket::TYPE_TICKET_CAISSE)
                                ->hidden(fn ($get) => $get('type') !== Ticket::TYPE_TICKET_CAISSE)
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
                            Forms\Components\Placeholder::make('add_client_link')
                                ->label('')
                                ->content(fn () => new \Illuminate\Support\HtmlString(
                                    '<a href="' . e(ClientResource::getUrl('create')) . '" target="_blank" rel="noopener" class="fi-btn fi-size-sm fi-btn-color-primary">Ajouter Client</a>'
                                ))
                                ->visible(fn ($get) => $get('type') === Ticket::TYPE_TICKET_CAISSE),
                            Forms\Components\TextInput::make('client_adresse')->label('Adresse')->disabled()->dehydrated(false)->visible(fn ($get) => $get('type') === Ticket::TYPE_TICKET_CAISSE),
                            Forms\Components\TextInput::make('client_phone')->label('N° Tél')->disabled()->dehydrated(false)->visible(fn ($get) => $get('type') === Ticket::TYPE_TICKET_CAISSE),
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
                                    self::recalculateTicketTotals($get, $set);
                                })
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->options(fn () => \App\Models\Product::orderBy('designation_fr')->get()->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? '') . ($p->code_product ? ' (' . $p->code_product . ')' : '')])->all())
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
                                        ->minValue(0.001)
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(2),
                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('P.U')
                                        ->numeric()
                                        ->default(0)
                                        ->prefix('DT')
                                        ->required()
                                        ->live(debounce: 300)
                                        ->columnSpan(2),
                                    Forms\Components\Placeholder::make('prix_total_display')
                                        ->label('P.T')
                                        ->content(fn ($get) => number_format((float) ($get('qte') ?? 0) * (float) ($get('prix_unitaire') ?? 0), 3, '.', ' ') . ' DT')
                                        ->extraAttributes(['style' => 'text-align: right;'])
                                        ->columnSpan(1),
                                ])
                                ->columns(12)
                                ->defaultItems(0)
                                ->addActionLabel('Ajouter une ligne')
                                ->columnSpanFull()
                                ->itemLabel(fn (array $state) => isset($state['produit_id']) ? (\App\Models\Product::find($state['produit_id'])?->designation_fr ?? 'Ligne') : 'Ligne'),
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
                        Forms\Components\Placeholder::make('prix_ttc_display')
                            ->label('NET À PAYER')
                            ->content(fn ($get) => 'DT ' . number_format((float) self::computeTicketTotals($get)[2], 3, ',', ' ')),
                        Forms\Components\Hidden::make('prix_ht')->default(0)->dehydrated(true),
                        Forms\Components\Hidden::make('prix_ttc')->default(0)->dehydrated(true),
                    ])
                    ->columns(1)
                    ->columnSpan(1)
                    ->extraAttributes(['class' => 'doc-totaux-sidebar']),
            ])->columnSpanFull(),

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
            ->modifyQueryUsing(fn (Builder $query) => $query->with('client:id,name'))
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
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->money('TND')
                    ->sortable()
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
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
                    ->modalContent(fn (Ticket $record) => view('filament.components.print-modal', [
                        'printUrl' => route('tickets.print', ['ticket' => $record->id]),
                        'title' => 'Ticket ' . $record->numero,
                        'documentType' => 'ticket',
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
            'index'  => Pages\ListTickets::route('/'),
            'create' => Pages\CreateTicket::route('/create'),
            'edit'   => Pages\EditTicket::route('/{record}/edit'),
        ];
    }
}
