<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\FactureTva;
use App\Models\Product;
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
use Illuminate\Support\HtmlString;

class FactureTvaResource extends Resource
{
    protected static ?string $model = FactureTva::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-document-duplicate';
    protected static string|\UnitEnum|null $navigationGroup = 'Facturation & Tickets';
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
            Grid::make(12)->schema([
                // LEFT (8/12)
                Grid::make(1)
                    ->schema([
                        // Company card (logo + name + address)
                        Forms\Components\Placeholder::make('company_card')
                            ->label('')
                            ->content(fn () => new HtmlString(
                                view('filament.components.facture-tva.company-card', [
                                    'coordinate' => $coordinate,
                                ])->render()
                            )),

                        // Client section
                        Section::make('Client')
                            ->extraAttributes(['class' => 'ftva-card'])
                            ->schema([
                                Grid::make(12)->schema([
                                    Forms\Components\Select::make('client_id')
                                        ->label('Client *')
                                        ->relationship('client', 'name')
                                        ->getOptionLabelFromRecordUsing(fn ($record) => (string) ($record->name ?? ('Client #' . $record->id)))
                                        ->searchable()
                                        ->preload()
                                        ->required()
                                        ->live()
                                        ->columnSpan(12)
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

                                    Forms\Components\TextInput::make('client_adresse')
                                        ->label('Adresse')
                                        ->disabled()
                                        ->dehydrated(false)
                                        ->columnSpan(6),

                                    Forms\Components\TextInput::make('client_phone')
                                        ->label('N° Tél')
                                        ->disabled()
                                        ->dehydrated(false)
                                        ->columnSpan(6),
                                ]),
                            ])
                            ->collapsible(),

                        // Products section
                        Section::make('Produits')
                            ->extraAttributes(['class' => 'ftva-card'])
                            ->schema([
                                // barcode row (UI only like screenshot)
                                Forms\Components\Placeholder::make('barcode_row')
                                    ->label('')
                                    ->content(fn () => new HtmlString(
                                        view('filament.components.facture-tva.barcode-row')->render()
                                    )),

                                Repeater::make('details')
                                    ->label('')
                                    ->defaultItems(1)
                                    ->live()
                                    ->reorderable(false)
                                    ->addActionLabel('Ajouter un produit')
                                    ->extraAttributes(['class' => 'ftva-lines'])
                                    ->afterStateUpdated(function ($state, $set, $get) {
                                        self::recalculateFactureTvaTotals($get, $set);
                                    })
                                    ->schema([
                                        Grid::make(12)->schema([
                                            // Left: number bubble + title
                                            Forms\Components\Placeholder::make('line_header')
                                                ->label('')
                                                ->content(function ($get, $state, $livewire) {
                                                    $items = $livewire->data['details'] ?? [];
                                                    $index = 1;
                                                    // compute index from current state pointer (best-effort)
                                                    // Filament doesn't give direct index here reliably, so we show bullet style anyway.
                                                    $name = 'Nouvel article';
                                                    if ($id = $get('produit_id')) {
                                                        $p = Product::find($id);
                                                        $name = $p?->designation_fr ?? $name;
                                                    }

                                                    return new HtmlString(
                                                        '<div class="ftva-line-head">
                                                            <div class="ftva-line-num">' . e((string)$index) . '</div>
                                                            <div class="ftva-line-title">' . e($name) . '</div>
                                                        </div>'
                                                    );
                                                })
                                                ->columnSpan(12),

                                            Forms\Components\Select::make('produit_id')
                                                ->label('Produit *')
                                                ->options(fn () => Product::query()
                                                    ->orderBy('designation_fr')
                                                    ->get()
                                                    ->mapWithKeys(fn ($p) => [
                                                        $p->id => trim(($p->designation_fr ?? '') . ' [' . ($p->code ?? $p->id) . ']'),
                                                    ])
                                                    ->all()
                                                )
                                                ->searchable()
                                                ->preload()
                                                ->required()
                                                ->live()
                                                ->columnSpan(7)
                                                ->afterStateUpdated(function ($state, $set) {
                                                    if ($state && $product = Product::find($state)) {
                                                        $set('prix_unitaire', (float) ($product->prix ?? 0));
                                                    }
                                                }),

                                            Forms\Components\TextInput::make('qte')
                                                ->label('Qté')
                                                ->numeric()
                                                ->default(1)
                                                ->minValue(1)
                                                ->required()
                                                ->live(debounce: 250)
                                                ->columnSpan(1),

                                            Forms\Components\TextInput::make('prix_unitaire')
                                                ->label('P.U HT')
                                                ->numeric()
                                                ->default(0)
                                                ->suffix('DT')
                                                ->required()
                                                ->live(debounce: 250)
                                                ->columnSpan(2),

                                            Forms\Components\Placeholder::make('pt_ht')
                                                ->label('P.T HT')
                                                ->content(fn ($get) => number_format(((float)($get('qte') ?? 0) * (float)($get('prix_unitaire') ?? 0)), 3, '.', ' ') . ' DT')
                                                ->extraAttributes(['class' => 'ftva-right-amount'])
                                                ->columnSpan(2),

                                            Forms\Components\TextInput::make('tva_pct')
                                                ->label('TVA %')
                                                ->numeric()
                                                ->default($defaultTva)
                                                ->suffix('%')
                                                ->required()
                                                ->live(debounce: 250)
                                                ->columnSpan(2),

                                            Forms\Components\Placeholder::make('pt_ttc')
                                                ->label('Total TTC')
                                                ->content(function ($get) use ($defaultTva) {
                                                    $qte = (float) ($get('qte') ?? 0);
                                                    $pu  = (float) ($get('prix_unitaire') ?? 0);
                                                    $tva = (float) ($get('tva_pct') ?? $defaultTva);
                                                    $ttc = $qte * $pu * (1 + $tva / 100);
                                                    return number_format($ttc, 3, '.', ' ') . ' DT';
                                                })
                                                ->extraAttributes(['class' => 'ftva-right-amount'])
                                                ->columnSpan(10),

                                            Forms\Components\Placeholder::make('tva_line')
                                                ->label('')
                                                ->content(function ($get) use ($defaultTva) {
                                                    $qte = (float) ($get('qte') ?? 0);
                                                    $pu  = (float) ($get('prix_unitaire') ?? 0);
                                                    $tva = (float) ($get('tva_pct') ?? $defaultTva);
                                                    $ht  = $qte * $pu;
                                                    $tvaAmount = $ht * $tva / 100;

                                                    $text = 'TVA ' . number_format($tva, 0) . '% : ' . number_format($tvaAmount, 3, '.', ' ') . ' DT';
                                                    return new HtmlString('<div class="ftva-line-sub">' . e($text) . '</div>');
                                                })
                                                ->columnSpan(12),
                                        ]),
                                    ]),
                            ]),
                    ])
                    ->columnSpan(8),

                // RIGHT (4/12)
                Section::make('Récapitulatif')
                    ->extraAttributes(['class' => 'ftva-recap ftva-sticky'])
                    ->schema([
                        Forms\Components\Placeholder::make('recap_header')
                            ->label('')
                            ->content(fn ($get) => new HtmlString(
                                '<div class="ftva-recap-head">
                                    <div class="ftva-recap-title">Récapitulatif</div>
                                    <div class="ftva-recap-sub">Facture <span>#' . e((string)($get('numero') ?? '—')) . '</span></div>
                                </div>'
                            )),

                        Forms\Components\TextInput::make('prix_ht')
                            ->label('Sous-total HT')
                            ->numeric()
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->default(0),

                        Forms\Components\TextInput::make('remise')
                            ->label('Remise')
                            ->numeric()
                            ->suffix('DT')
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),

                        Forms\Components\TextInput::make('pourcentage_remise')
                            ->label('Remise %')
                            ->numeric()
                            ->suffix('%')
                            ->default(0)
                            ->live(),

                        Forms\Components\TextInput::make('prix_ht_apres_remise')
                            ->label('HT après remise')
                            ->numeric()
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->default(0),

                        Forms\Components\TextInput::make('tva')
                            ->label('TVA')
                            ->numeric()
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->default(0),

                        Forms\Components\TextInput::make('timbre')
                            ->label('Timbre')
                            ->numeric()
                            ->suffix('DT')
                            ->default(1)
                            ->live()
                            ->afterStateUpdated(fn ($state, $get, $set) => self::recalculateFactureTvaTotals($get, $set)),

                        Forms\Components\TextInput::make('prix_ttc')
                            ->label('Total TTC')
                            ->numeric()
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->default(0),

                        Forms\Components\Placeholder::make('net_banner')
                            ->label('')
                            ->content(fn ($get) => new HtmlString(
                                '<div class="ftva-net">
                                    <div class="ftva-net-label">NET À PAYER</div>
                                    <div class="ftva-net-val">' . e(number_format((float)($get('net_a_payer') ?? 0), 3, '.', ' ')) . ' DT</div>
                                </div>'
                            )),

                        Forms\Components\Hidden::make('net_a_payer')->default(0),
                    ])
                    ->columnSpan(4),
            ])->columnSpanFull(),

            Forms\Components\Hidden::make('numero'),
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
                        'issued' => 'info',
                        'paid' => 'success',
                        'partially_paid' => 'warning',
                        'canceled' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('client.name')->label('Client')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')->label('Total TTC')->money('TND')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (FactureTva $record) => route('facture-tvas.print', ['factureTva' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\DeleteAction::make(),
            ]);
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
        $htApresRemise = max(0, $totalHt - $remise);
        $tvaApresRemise = $totalHt > 0 ? max(0, $totalTva - ($totalTva * $remise / $totalHt)) : 0.0;

        $timbre = (float) ($get('timbre') ?? 1);
        $prixTtc = $htApresRemise + $tvaApresRemise;
        $net = $prixTtc + $timbre;

        $set('prix_ht', $totalHt);
        $set('prix_ht_apres_remise', $htApresRemise);
        $set('tva', $tvaApresRemise);
        $set('prix_ttc', $prixTtc);
        $set('net_a_payer', $net);
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