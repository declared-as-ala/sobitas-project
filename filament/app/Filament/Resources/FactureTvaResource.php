<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureTvaResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\FactureTva;
use App\Models\Product;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
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
                // LEFT
                Grid::make(1)->schema([
                    Section::make('Informations entreprise')
                        ->extraAttributes(['class' => 'ftva-card'])
                        ->schema([
                            Forms\Components\Placeholder::make('company_info')
                                ->label('')
                                ->content(fn () => new HtmlString(
                                    view('filament.facture-tva.company-card', [
                                        'coordinate' => $coordinate,
                                    ])->render()
                                )),
                        ]),

                    Section::make('Client')
                        ->extraAttributes(['class' => 'ftva-card'])
                        ->schema([
                            Grid::make(12)->schema([
                                Forms\Components\Select::make('client_id')
                                    ->label('Client *')
                                    ->relationship('client', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->required()
                                    ->live() // realtime
                                    ->columnSpan(12)
                                    ->afterStateHydrated(function ($state, $set) {
                                        // ensure address/phone loaded on edit
                                        if ($state) {
                                            $client = Client::find($state);
                                            $set('client_adresse', $client?->adresse ?? '');
                                            $set('client_phone', $client?->phone_1 ?? '');
                                        }
                                    })
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
                                    ->label('N° Tel')
                                    ->disabled()
                                    ->dehydrated(false)
                                    ->columnSpan(6),
                            ]),
                        ])
                        ->collapsible(),

                    Section::make('Produits')
                        ->extraAttributes(['class' => 'ftva-card'])
                        ->schema([
                            Forms\Components\Placeholder::make('barcode_box')
                                ->label('')
                                ->content(fn () => new HtmlString(view('filament.facture-tva.barcode-row')->render())),

                            Repeater::make('details')
                                ->label('')
                                ->addActionLabel('Ajouter un produit')
                                ->defaultItems(0)
                                ->reorderable(false)
                                ->collapsible(false)
                                ->live() // makes state updates propagate
                                ->extraAttributes(['class' => 'ftva-lines ftva-counter'])
                                ->deleteAction(fn (Forms\Components\Actions\Action $action) => $action
                                    ->icon('heroicon-o-trash')
                                    ->color('danger')
                                    ->iconButton()
                                    ->tooltip('Supprimer')
                                )
                                ->afterStateHydrated(function ($state, $set, $get) {
                                    // recalc on load
                                    self::recalculateFactureTvaTotals($get, $set);
                                })
                                ->afterStateUpdated(function ($state, $set, $get) {
                                    self::recalculateFactureTvaTotals($get, $set);
                                })
                                ->schema([
                                    Grid::make(12)->schema([
                                        // Header line: auto-number bubble (CSS) + product name
                                        Forms\Components\Placeholder::make('line_title')
                                            ->label('')
                                            ->content(function ($get) {
                                                $name = 'Nouvel article';
                                                if ($id = $get('produit_id')) {
                                                    $p = Product::find($id);
                                                    $name = $p?->designation_fr ?? $name;
                                                }
                                                return new HtmlString('<div class="ftva-line-head"><div class="ftva-line-title">' . e($name) . '</div></div>');
                                            })
                                            ->columnSpan(12),

                                        Forms\Components\Select::make('produit_id')
                                            ->label('Produit *')
                                            ->options(fn () => Product::query()
                                                ->orderBy('designation_fr')
                                                ->get()
                                                ->mapWithKeys(fn ($p) => [$p->id => ($p->designation_fr ?? ('Produit #' . $p->id))])
                                                ->all()
                                            )
                                            ->searchable()
                                            ->preload()
                                            ->required()
                                            ->live()
                                            ->columnSpan(7)
                                            ->afterStateUpdated(function ($state, $set, $get) {
                                                if ($state && ($p = Product::find($state))) {
                                                    $set('prix_unitaire', (float) ($p->prix ?? 0));
                                                }
                                                self::recalculateFactureTvaTotals($get, $set);
                                            }),

                                        Forms\Components\TextInput::make('qte')
                                            ->label('Qté')
                                            ->numeric()
                                            ->default(1)
                                            ->minValue(1)
                                            ->required()
                                            ->live(debounce: 200)
                                            ->columnSpan(1)
                                            ->afterStateUpdated(fn ($state, $set, $get) => self::recalculateFactureTvaTotals($get, $set)),

                                        Forms\Components\TextInput::make('prix_unitaire')
                                            ->label('P.U HT')
                                            ->numeric()
                                            ->default(0)
                                            ->suffix('DT')
                                            ->required()
                                            ->live(debounce: 200)
                                            ->columnSpan(2)
                                            ->afterStateUpdated(fn ($state, $set, $get) => self::recalculateFactureTvaTotals($get, $set)),

                                        Forms\Components\Placeholder::make('pt_ht')
                                            ->label('P.T HT')
                                            ->content(function ($get) {
                                                $ht = (float) ($get('qte') ?? 0) * (float) ($get('prix_unitaire') ?? 0);
                                                return number_format($ht, 3, '.', ' ') . ' DT';
                                            })
                                            ->extraAttributes(['class' => 'ftva-amount'])
                                            ->columnSpan(2),

                                        Forms\Components\TextInput::make('tva_pct')
                                            ->label('TVA')
                                            ->numeric()
                                            ->default($defaultTva)
                                            ->suffix('%')
                                            ->required()
                                            ->live(debounce: 200)
                                            ->columnSpan(2)
                                            ->afterStateUpdated(fn ($state, $set, $get) => self::recalculateFactureTvaTotals($get, $set)),

                                        Forms\Components\Placeholder::make('total_ttc')
                                            ->label('Total TTC')
                                            ->content(function ($get) use ($defaultTva) {
                                                $qte = (float) ($get('qte') ?? 0);
                                                $pu  = (float) ($get('prix_unitaire') ?? 0);
                                                $tva = (float) ($get('tva_pct') ?? $defaultTva);
                                                $ttc = ($qte * $pu) * (1 + $tva / 100);
                                                return number_format($ttc, 3, '.', ' ') . ' DT';
                                            })
                                            ->extraAttributes(['class' => 'ftva-amount'])
                                            ->columnSpan(10),

                                        Forms\Components\Placeholder::make('tva_line')
                                            ->label('')
                                            ->content(function ($get) use ($defaultTva) {
                                                $qte = (float) ($get('qte') ?? 0);
                                                $pu  = (float) ($get('prix_unitaire') ?? 0);
                                                $tva = (float) ($get('tva_pct') ?? $defaultTva);

                                                $ht = $qte * $pu;
                                                $tvaAmount = $ht * $tva / 100;

                                                return new HtmlString(
                                                    '<div class="ftva-line-sub">TVA ' . e((string)round($tva)) . '% : ' .
                                                    e(number_format($tvaAmount, 3, '.', ' ')) . ' DT</div>'
                                                );
                                            })
                                            ->columnSpan(12),
                                    ]),
                                ]),
                        ]),
                ])->columnSpan(8),

                // RIGHT (Recap)
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
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->live()
                            ->default(0),

                        Forms\Components\TextInput::make('remise')
                            ->label('Remise')
                            ->suffix('DT')
                            ->numeric()
                            ->default(0)
                            ->live(debounce: 200)
                            ->afterStateUpdated(fn ($state, $set, $get) => self::recalculateFactureTvaTotals($get, $set)),

                        Forms\Components\TextInput::make('pourcentage_remise')
                            ->label('Remise %')
                            ->suffix('%')
                            ->numeric()
                            ->default(0)
                            ->live(debounce: 200),

                        Forms\Components\TextInput::make('prix_ht_apres_remise')
                            ->label('HT après remise')
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->live()
                            ->default(0),

                        Forms\Components\TextInput::make('tva')
                            ->label('TVA')
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->live()
                            ->default(0),

                        Forms\Components\TextInput::make('timbre')
                            ->label('Timbre')
                            ->suffix('DT')
                            ->numeric()
                            ->default(1)
                            ->live(debounce: 200)
                            ->afterStateUpdated(fn ($state, $set, $get) => self::recalculateFactureTvaTotals($get, $set)),

                        Forms\Components\TextInput::make('prix_ttc')
                            ->label('Total TTC')
                            ->suffix('DT')
                            ->disabled()
                            ->dehydrated(false)
                            ->live()
                            ->default(0),

                        Forms\Components\Hidden::make('net_a_payer')->default(0),

                        Forms\Components\Placeholder::make('net_banner')
                            ->label('')
                            ->content(fn ($get) => new HtmlString(
                                '<div class="ftva-net">
                                    <div class="ftva-net-label">NET À PAYER</div>
                                    <div class="ftva-net-val">' . e(number_format((float)($get('net_a_payer') ?? 0), 3, '.', ' ')) . ' DT</div>
                                </div>'
                            )),

                        // Buttons inside recap like screenshot
                        Forms\Components\Placeholder::make('recap_buttons')
                            ->label('')
                            ->content(fn () => new HtmlString(view('filament.facture-tva.recap-actions')->render())),
                    ])
                    ->columnSpan(4),
            ])->columnSpanFull(),

            Forms\Components\Hidden::make('numero'),
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

        $tvaApresRemise = $totalHt > 0
            ? max(0, $totalTva - ($totalTva * $remise / $totalHt))
            : 0.0;

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