<?php

namespace App\Filament\Affilie\Resources;

use App\Filament\Affilie\Resources\AffilieCommandeResource\Pages;
use App\Models\Affilie;
use App\Models\Commande;
use App\Models\Product;
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

/**
 * ── THE AFFILIATE'S OWN ORDER DESK ───────────────────────────────────────────────────────────
 * The owner's flow, verbatim: "He sells. Then he comes to our dashboard and creates a command.
 * That command will directly be confirmed. We get a notification that a new command needs
 * treatment. We treat it and ship it."
 *
 * ── WHY A SECOND RESOURCE AND NOT A CREATE PAGE ON AffilieSaleTicketResource ─────────────────
 * That resource is bound to `Ticket` — the boutique till receipt. A Filament CreateRecord page
 * instantiates `static::getModel()`, so a Create page hung off it would create a Ticket, and a
 * Ticket is not an order: different table, no `commande_details`, no Aramex shipment, no delivery
 * gate, and its commission settles the instant it confirms because the cash is already in the
 * drawer. An affiliate order is a `Commande` — cash on delivery, settled at `livree`. One model
 * per resource is not a style preference here; the two objects genuinely have different money
 * lifecycles and AffilieTransactionService keeps two separate code paths for exactly that reason.
 *
 * ── THE PRICING MODEL ────────────────────────────────────────────────────────────────────────
 * The affiliate is a RESELLER. `products.prix_affilie` is what the shop must receive; the
 * affiliate sells at or above it and keeps the difference:
 *
 *     earning = (unit selling price − prix_affilie) × quantity
 *
 * Every number on this form comes from Affilie::suggestedSellingPrice() /
 * Affilie::validateSellingPrice() / Product::affiliateBasePrice(). None of it is re-derived here,
 * so the form and the ledger cannot end up disagreeing about what a product costs.
 */
class AffilieCommandeResource extends Resource
{
    protected static ?string $model = Commande::class;

    protected static ?string $slug = 'mes-commandes';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-shopping-cart';

    protected static ?string $navigationLabel = 'Mes commandes';

    protected static ?string $modelLabel = 'Commande';

    protected static ?string $pluralModelLabel = 'Commandes';

    protected static ?int $navigationSort = 10;

    /**
     * The 24 canonical Tunisian governorates, spelled exactly as AramexService::normalizeCity()
     * spells them.
     *
     * That method maps whatever is stored on the order onto one of these before handing it to
     * Aramex, which rejects delegation-level names, and it falls back to 'Sousse' when it cannot
     * recognise the value. A free-text field here would let an affiliate type "Bizerte Nord" and
     * have the parcel silently routed to Sousse. Offering the list Aramex actually accepts removes
     * the failure instead of catching it downstream.
     */
    public const GOUVERNORATS = [
        'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
        'Kasserine', 'Kebili', 'Kef', 'Mahdia', 'Manouba', 'Medenine', 'Monastir', 'Nabeul',
        'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
    ];

    /** Per-request memo for base prices, so a repeater with N lines is not N queries per render. */
    protected static array $basePriceMemo = [];

    /**
     * THE ONE PLACE THIS PANEL ANSWERS "WHO IS LOOKING".
     *
     * Never a form field, never a route parameter, never a request value. Everything that scopes
     * — the list query, the create guard, the `affilie_id` written on the order, the suggested
     * prices — reads this and nothing else, so there is no input an affiliate could tamper with to
     * see or bill another affiliate's account.
     */
    public static function currentAffilie(): ?Affilie
    {
        return auth()->user()?->affilie;
    }

    public static function canCreate(): bool
    {
        return static::currentAffilie() !== null;
    }

    /**
     * No edit, no delete, ever.
     *
     * An order is a financial document the moment it exists: it has decremented stock, notified an
     * administrator, and (below) written a pending commission row that fixes the amount the
     * affiliate was promised. Letting the affiliate reprice a line afterwards would let them raise
     * their own spread on an order the shop has already picked, and letting them delete one would
     * restore stock through Commande::deleting() for goods that may already be in a van.
     * Corrections go through an administrator, who leaves a named audit trail.
     */
    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    /**
     * SCOPING. Same shape as AffilieLedgerReadResource / AffilieSaleTicketResource, deliberately:
     * no affiliate on the account means `1 = 0`, an empty list — never an unscoped one. A missing
     * relation must fail closed, because the failure mode of the alternative is one affiliate
     * reading every other affiliate's customers, addresses and phone numbers.
     */
    public static function getEloquentQuery(): Builder
    {
        $affilieId = static::currentAffilie()?->id;

        $query = parent::getEloquentQuery()->with(['affilieTransactions']);

        return $affilieId
            ? $query->where('affilie_id', $affilieId)
            : $query->whereRaw('1 = 0');
    }

    /**
     * ── THE PRODUCT PICKER'S QUERY, AND WHY IT DOES NOT USE getSelectSearchColumns() ─────────
     * `Product::getSelectSearchColumns()` does not list `prix_affilie`. Product::affiliateBasePrice()
     * treats an ABSENT attribute exactly as it treats a null one — it returns null rather than read
     * a column that was never loaded — so a picker hydrated through that path would find every
     * product in the catalogue unsellable, and the affiliate would face an empty dropdown with no
     * error to explain it.
     *
     * The column is therefore selected explicitly here, and the WHERE mirrors what
     * affiliateBasePrice() considers priced: NOT NULL and strictly positive. Zero is refused for
     * the same reason null is — it is what an empty cell in a bulk import produces, and it would
     * hand the shop nothing for stock it has already shipped.
     */
    public static function affiliateProductQuery(): Builder
    {
        return Product::query()
            ->select(['id', 'designation_fr', 'code_product', 'qte', 'prix', 'promo', 'prix_affilie'])
            ->whereNotNull('prix_affilie')
            ->where('prix_affilie', '>', 0);
    }

    /** @return array<int, string> */
    public static function productSearchOptions(string $search = '', int $limit = 30): array
    {
        $query = static::affiliateProductQuery()->orderBy('designation_fr')->limit($limit);

        if ($search !== '') {
            $term = '%'.$search.'%';
            $query->where(function (Builder $q) use ($term): void {
                $q->where('designation_fr', 'like', $term)
                    ->orWhere('code_product', 'like', $term);
            });
        }

        return $query->get()
            ->mapWithKeys(fn (Product $p): array => [$p->id => static::productLabel($p)])
            ->all();
    }

    public static function productLabel(Product $product): string
    {
        $base = $product->affiliateBasePrice();

        return trim((string) ($product->designation_fr ?? ('Produit #'.$product->getKey())))
            .' — base '.number_format((float) $base, 3, ',', ' ').' DT'
            .' — '.(int) ($product->qte ?? 0).' en stock';
    }

    public static function productOptionLabel(mixed $id): ?string
    {
        $id = $id ? (int) $id : null;
        if (! $id) {
            return null;
        }

        $product = static::affiliateProductQuery()->find($id);

        return $product ? static::productLabel($product) : null;
    }

    /**
     * The shop's base price for a product, or null when it is not affiliate-sellable.
     *
     * Always resolved through Product::affiliateBasePrice(); this method only adds the per-request
     * memo and the explicit column select. It must never grow its own idea of what "priced" means.
     */
    public static function basePriceFor(mixed $productId): ?float
    {
        $id = $productId ? (int) $productId : 0;
        if ($id <= 0) {
            return null;
        }

        if (! array_key_exists($id, static::$basePriceMemo)) {
            static::$basePriceMemo[$id] = static::affiliateProductQuery()->find($id)?->affiliateBasePrice();
        }

        return static::$basePriceMemo[$id];
    }

    /** The affiliate's earning on one line: (selling − base) × qty, floored at 0, TND-rounded. */
    public static function lineEarning(mixed $productId, mixed $qte, mixed $prixUnitaire): float
    {
        $base = static::basePriceFor($productId);
        if ($base === null) {
            return 0.0;
        }

        $spread = (float) $prixUnitaire - $base;

        return round(max(0.0, $spread) * max(0.0, (float) $qte), 3);
    }

    /**
     * Live totals from raw form state.
     *
     * @return array{subtotal: float, earning: float, shipping: float, total: float}
     */
    public static function totalsFromState(?array $details, mixed $fraisLivraison = 0): array
    {
        $subtotal = 0.0;
        $earning = 0.0;

        foreach ((array) $details as $line) {
            if (empty($line['produit_id'])) {
                continue;
            }

            $qte = max(0.0, (float) ($line['qte'] ?? 0));
            $pu = max(0.0, (float) ($line['prix_unitaire'] ?? 0));

            $subtotal += $qte * $pu;
            $earning += static::lineEarning($line['produit_id'], $qte, $pu);
        }

        $shipping = max(0.0, (float) ($fraisLivraison ?? 0));

        return [
            'subtotal' => round($subtotal, 3),
            'earning' => round($earning, 3),
            'shipping' => round($shipping, 3),
            'total' => round($subtotal + $shipping, 3),
        ];
    }

    private static function money(float $amount): string
    {
        return number_format($amount, 3, ',', ' ').' DT';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Grid::make(3)->schema([
                Grid::make(1)->schema([

                    Section::make('Client final')
                        ->description('La personne qui reçoit le colis — pas vous. C’est ce numéro que le livreur appelle et sur lequel il encaisse.')
                        ->schema([
                            Forms\Components\TextInput::make('livraison_nom')
                                ->label('Nom et prénom')
                                ->required()
                                ->maxLength(255)
                                ->columnSpan(['default' => 12, 'md' => 6]),
                            Forms\Components\TextInput::make('livraison_phone')
                                ->label('Téléphone')
                                ->tel()
                                ->required()
                                ->maxLength(20)
                                // Same expression the storefront checkout validates against
                                // (CommandeController::storeCommandeApi). One definition of a valid
                                // Tunisian mobile, so an order typed here cannot be one Aramex
                                // would refuse while the same number typed on the site is accepted.
                                ->rule('regex:/^(?:(?:\+|00)216[\s-]?)?[2-9](?:[\s-]?\d){7}$/')
                                ->validationMessages([
                                    'regex' => 'Numéro de téléphone tunisien invalide (ex. 27 123 456).',
                                ])
                                ->columnSpan(['default' => 12, 'md' => 6]),
                            Forms\Components\Select::make('livraison_region')
                                ->label('Gouvernorat')
                                ->options(array_combine(self::GOUVERNORATS, self::GOUVERNORATS))
                                ->searchable()
                                ->required()
                                ->columnSpan(['default' => 12, 'md' => 6]),
                            Forms\Components\TextInput::make('livraison_ville')
                                ->label('Ville / délégation')
                                ->maxLength(255)
                                ->columnSpan(['default' => 12, 'md' => 6]),
                            Forms\Components\TextInput::make('livraison_adresse1')
                                ->label('Adresse')
                                ->required()
                                ->maxLength(255)
                                ->columnSpan(['default' => 12, 'md' => 8]),
                            Forms\Components\TextInput::make('livraison_code_postale')
                                ->label('Code postal')
                                ->maxLength(10)
                                ->columnSpan(['default' => 12, 'md' => 4]),
                            Forms\Components\TextInput::make('livraison_email')
                                ->label('Email (optionnel)')
                                ->email()
                                ->maxLength(255)
                                ->columnSpan(['default' => 12, 'md' => 6]),
                            Forms\Components\Textarea::make('note')
                                ->label('Note pour la préparation')
                                ->rows(2)
                                ->columnSpanFull(),
                        ])
                        ->columns(12),

                    Section::make('Produits')
                        ->description('Seuls les produits avec un prix affilié apparaissent ici. Le prix de vente est pré-rempli avec votre marge par défaut — vous pouvez le modifier ligne par ligne.')
                        ->schema([
                            Repeater::make('details')
                                ->label('Lignes')
                                ->live()
                                ->minItems(1)
                                ->defaultItems(1)
                                ->addActionLabel('Ajouter un produit')
                                ->schema([
                                    Forms\Components\Select::make('produit_id')
                                        ->label('Produit')
                                        ->required()
                                        ->searchable()
                                        ->live()
                                        ->placeholder('Tapez pour rechercher…')
                                        ->getSearchResultsUsing(fn (string $search): array => static::productSearchOptions($search, 30))
                                        ->getOptionLabelUsing(fn ($value): ?string => static::productOptionLabel($value))
                                        // Pre-fill the selling price so an affiliate can submit an
                                        // order without typing a single price: base + their default
                                        // markup, straight from Affilie::suggestedSellingPrice().
                                        ->afterStateUpdated(function ($state, $set): void {
                                            if (blank($state)) {
                                                $set('prix_unitaire', null);

                                                return;
                                            }

                                            $affilie = static::currentAffilie();
                                            $product = static::affiliateProductQuery()->find((int) $state);

                                            if (! $affilie || ! $product) {
                                                $set('prix_unitaire', null);

                                                return;
                                            }

                                            $set('prix_unitaire', $affilie->suggestedSellingPrice($product));
                                        })
                                        ->columnSpan(['default' => 12, 'md' => 5]),

                                    Forms\Components\TextInput::make('qte')
                                        ->label('Qté')
                                        ->numeric()
                                        ->integer()
                                        ->default(1)
                                        ->minValue(1)
                                        ->required()
                                        ->live(debounce: 400)
                                        ->columnSpan(['default' => 4, 'md' => 2]),

                                    Forms\Components\TextInput::make('prix_unitaire')
                                        ->label('Prix de vente')
                                        ->numeric()
                                        ->inputMode('decimal')
                                        ->suffix(' DT')
                                        ->required()
                                        ->live(debounce: 400)
                                        ->helperText(function ($get): ?string {
                                            $base = static::basePriceFor($get('produit_id'));

                                            return $base === null ? null : 'Prix affilié : '.static::money($base);
                                        })
                                        /*
                                         * THE GUARD RAIL, AT THE EDGE.
                                         *
                                         * The message is never written here — it is whatever
                                         * Affilie::validateSellingPrice() throws, so the form and
                                         * the ledger quote the same French sentence. Re-stating the
                                         * rule as `->minValue($base)` would be a second copy of it,
                                         * with its own epsilon and its own wording, free to drift.
                                         *
                                         * This is the affiliate-facing half only. CreateAffilieCommande
                                         * runs the same validation again server-side before it writes
                                         * anything, because live form state is client-driven.
                                         */
                                        ->rules([
                                            fn ($get): \Closure => function (string $attribute, $value, \Closure $fail) use ($get): void {
                                                $productId = $get('produit_id');
                                                if (blank($productId) || blank($value)) {
                                                    return;
                                                }

                                                $affilie = static::currentAffilie();
                                                $product = static::affiliateProductQuery()->find((int) $productId);

                                                if (! $affilie || ! $product) {
                                                    $fail(__('Ce produit n’est pas disponible à la vente affiliée.'));

                                                    return;
                                                }

                                                try {
                                                    $affilie->validateSellingPrice($product, (float) $value);
                                                } catch (\InvalidArgumentException $e) {
                                                    $fail($e->getMessage());
                                                }
                                            },
                                        ])
                                        ->columnSpan(['default' => 4, 'md' => 3]),

                                    Forms\Components\Placeholder::make('gain_ligne')
                                        ->label('Votre gain')
                                        ->content(function ($get): HtmlString {
                                            $earning = static::lineEarning(
                                                $get('produit_id'),
                                                $get('qte'),
                                                $get('prix_unitaire'),
                                            );

                                            return new HtmlString(
                                                '<div class="pt-2 text-right font-semibold tabular-nums text-success-600 dark:text-success-400">'
                                                .e(static::money($earning))
                                                .'</div>'
                                            );
                                        })
                                        ->columnSpan(['default' => 4, 'md' => 2]),
                                ])
                                ->columns(['default' => 12, 'md' => 12])
                                ->columnSpanFull()
                                /*
                                 * `?array` — Filament hands null for an item that has just been
                                 * added; a non-nullable hint turns that into a TypeError instead of
                                 * a label. Same defect noted on TicketResource's repeater.
                                 */
                                ->itemLabel(function (?array $state): string {
                                    $id = $state['produit_id'] ?? null;

                                    if (blank($id)) {
                                        return 'Nouvelle ligne';
                                    }

                                    return Product::query()
                                        ->select('id', 'designation_fr')
                                        ->find((int) $id)?->designation_fr ?? 'Ligne';
                                }),
                        ])
                        ->columnSpanFull(),

                ])->columnSpan(2),

                Section::make('Récapitulatif')
                    ->schema([
                        Forms\Components\Placeholder::make('sous_total_display')
                            ->label('Total client (produits)')
                            ->content(fn ($get) => static::money(
                                static::totalsFromState($get('details'), 0)['subtotal']
                            )),

                        Forms\Components\TextInput::make('frais_livraison')
                            ->label('Frais de livraison')
                            ->numeric()
                            ->minValue(0)
                            ->default(0)
                            ->suffix(' DT')
                            ->live(debounce: 400)
                            /*
                             * Facturés au client, encaissés par le livreur, reversés au
                             * transporteur. Excluded from the affiliate's earning on purpose:
                             * `AffilieTransactionService::orderCommissionBase()` subtracts
                             * `frais_livraison` from `prix_ttc` because delivery is a pass-through
                             * cost, not margin. A fee entered here therefore raises what the
                             * customer pays and changes the affiliate's earning by nothing.
                             */
                            ->helperText('Encaissés par le livreur. N’entrent pas dans votre gain.'),

                        Forms\Components\Placeholder::make('total_display')
                            ->label('À encaisser à la livraison')
                            ->content(function ($get): HtmlString {
                                $totals = static::totalsFromState($get('details'), $get('frais_livraison'));

                                return new HtmlString(
                                    '<div class="text-lg font-bold tabular-nums">'
                                    .e(static::money($totals['total']))
                                    .'</div>'
                                );
                            }),

                        Forms\Components\Placeholder::make('gain_display')
                            ->label('Votre gain sur cette commande')
                            ->content(function ($get): HtmlString {
                                $totals = static::totalsFromState($get('details'), $get('frais_livraison'));

                                return new HtmlString(
                                    '<div class="text-lg font-bold tabular-nums text-success-600 dark:text-success-400">'
                                    .e(static::money($totals['earning']))
                                    .'</div>'
                                    .'<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">'
                                    .'Crédité seulement quand la commande passe en « Livrée ».'
                                    .'</div>'
                                );
                            }),
                    ])
                    ->columns(1)
                    ->columnSpan(1),
            ])->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('livraison_nom')->label('Client')->searchable()->placeholder('—'),
                Tables\Columns\TextColumn::make('livraison_phone')->label('Téléphone')->searchable()->placeholder('—'),
                Tables\Columns\TextColumn::make('livraison_region')->label('Gouvernorat')->placeholder('—'),
                Tables\Columns\TextColumn::make('etat')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => Commande::getStatusLabel((string) $state))
                    ->color(fn ($state): string => Commande::getStatusColor((string) $state)),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total client')
                    ->numeric(decimalPlaces: 3)
                    ->alignEnd(),
                /*
                 * The earning shown here is the LEDGER's number, not a recomputation from the
                 * lines. A recomputation would keep answering with today's `prix_affilie` after an
                 * administrator changed it, quietly rewriting history on an order that already
                 * settled. The row that actually moved (or will move) the balance is the truth.
                 */
                Tables\Columns\TextColumn::make('gain')
                    ->label('Votre gain')
                    ->alignEnd()
                    ->getStateUsing(function (Commande $record): string {
                        $row = $record->affilieTransactions
                            ->firstWhere('type', \App\Enums\AffilieTransactionType::Commission);

                        if (! $row) {
                            return '—';
                        }

                        $suffix = $row->status === \App\Enums\AffilieTransactionStatus::Pending
                            ? ' (en attente)'
                            : '';

                        return number_format((float) $row->amount, 3, ',', ' ').' DT'.$suffix;
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->recordActions([])
            ->toolbarActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAffilieCommandes::route('/'),
            'create' => Pages\CreateAffilieCommande::route('/create'),
        ];
    }
}
