<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Filament\Support\ImagePath;
use App\Models\Product;
use App\Models\Review;
use App\Support\Gtin;
use App\Support\YouTubeId;
use Closure;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Schema as DbSchema;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

class ProductResource extends Resource
{
    /** Public shop product URL base (frontend). */
    public const SHOP_PUBLIC_BASE_URL = 'https://protein.tn/shop';

    /** @var array<string, bool> */
    private static array $productColumnsCache = [];

    protected static ?string $model = Product::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-cube';

    protected static ?string $navigationLabel = 'Produits';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    private static function hasProductColumn(string $column): bool
    {
        if (array_key_exists($column, self::$productColumnsCache)) {
            return self::$productColumnsCache[$column];
        }

        try {
            return self::$productColumnsCache[$column] = DbSchema::hasColumn('products', $column);
        } catch (\Throwable) {
            return self::$productColumnsCache[$column] = false;
        }
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tabs::make('Produit')
                ->tabs([
                    Tab::make('1. Général')
                        ->schema([
                            Forms\Components\Hidden::make('_slug_auto_source')
                                ->dehydrated(false),
                            Section::make('Identification')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('designation_fr')
                                            ->label('Désignation')
                                            ->required()
                                            ->maxLength(255)
                                            ->live(onBlur: true)
                                            ->afterStateUpdated(function ($state, callable $set, callable $get): void {
                                                $des = (string) ($state ?? '');
                                                $newSlug = Str::slug($des);
                                                $slug = (string) ($get('slug') ?? '');
                                                $syncFrom = (string) ($get('_slug_auto_source') ?? '');
                                                $expected = Str::slug($syncFrom);
                                                if ($slug === '' || $slug === $expected) {
                                                    $set('slug', $newSlug);
                                                }
                                                $set('_slug_auto_source', $des);
                                            }),
                                        Forms\Components\TextInput::make('slug')
                                            ->label('Slug')
                                            ->required()
                                            ->maxLength(255)
                                            ->unique(ignoreRecord: true)
                                            ->helperText('Généré automatiquement à partir de la désignation (modifiable).'),
                                        Forms\Components\TextInput::make('code_product')
                                            ->label('Code Produit')
                                            ->maxLength(255),
                                    ]),
                                    /**
                                     * Identifiants commerciaux — sku / gtin / mpn existent depuis avril
                                     * (migration 2026_04_21_120000) et sont déjà lus par ProductSchemaBuilder,
                                     * mais n'avaient aucun champ dans l'admin : personne ne pouvait les saisir.
                                     *
                                     * Le code-barres est la clé de toutes les sources externes (NIH DSLD,
                                     * Open Food Facts, USDA). Sans lui, `seo:enrich-nutrition` ne trouve
                                     * jamais un seul produit.
                                     */
                                    Section::make('Identifiants commerciaux')
                                        ->description('Le code-barres du pot. C’est lui qui permet de récupérer automatiquement les valeurs nutritionnelles et les ingrédients officiels.')
                                        ->collapsed(fn ($record): bool => filled($record?->gtin))
                                        ->visible(fn (): bool => self::hasProductColumn('gtin'))
                                        ->schema([
                                            Grid::make(3)->schema([
                                                Forms\Components\TextInput::make('gtin')
                                                    ->label('Code-barres (GTIN / EAN / UPC)')
                                                    ->dehydrated(fn (): bool => self::hasProductColumn('gtin'))
                                                    ->maxLength(64)
                                                    ->placeholder('5903246226645')
                                                    ->helperText('Scannez le code-barres imprimé sur le produit. 8, 12, 13 ou 14 chiffres.')
                                                    // Les séparateurs viennent des scanners et des tableurs ;
                                                    // les chiffres en dessous restent le code-barres.
                                                    ->dehydrateStateUsing(fn (?string $state): ?string => Gtin::normalize($state) ?? (filled($state) ? trim($state) : null))
                                                    ->rule(static function (): Closure {
                                                        return static function (string $attribute, $value, Closure $fail): void {
                                                            if (blank($value)) {
                                                                return;
                                                            }
                                                            if (! Gtin::isValid((string) $value)) {
                                                                // Un chiffre transposé passe inaperçu et enverrait une
                                                                // requête pour le produit de quelqu'un d'autre : on
                                                                // publierait alors ses valeurs nutritionnelles.
                                                                $fail('Ce code-barres est invalide (chiffre de contrôle incorrect). Vérifiez la saisie — un seul chiffre erroné pointerait vers un autre produit.');
                                                            }
                                                        };
                                                    })
                                                    ->unique(ignoreRecord: true, modifyRuleUsing: fn ($rule) => $rule->whereNotNull('gtin'))
                                                    ->validationMessages(['unique' => 'Ce code-barres est déjà attribué à un autre produit.']),
                                                Forms\Components\TextInput::make('sku')
                                                    ->label('SKU interne')
                                                    ->visible(fn (): bool => self::hasProductColumn('sku'))
                                                    ->dehydrated(fn (): bool => self::hasProductColumn('sku'))
                                                    ->maxLength(120)
                                                    ->helperText('Référence interne. À défaut, le Code Produit puis l’id sont utilisés.'),
                                                Forms\Components\TextInput::make('mpn')
                                                    ->label('Référence fabricant (MPN)')
                                                    ->visible(fn (): bool => self::hasProductColumn('mpn'))
                                                    ->dehydrated(fn (): bool => self::hasProductColumn('mpn'))
                                                    ->maxLength(120)
                                                    ->helperText('Telle quelle : ne jamais reformater (zéros initiaux et ponctuation compris).'),
                                            ]),
                                        ]),
                                    Grid::make(3)->schema([
                                        Forms\Components\Select::make('brand_id')
                                            ->label('Marque')
                                            ->relationship('brand', 'designation_fr')
                                            ->searchable()
                                            ->preload(),
                                        Forms\Components\Select::make('sous_categorie_id')
                                            ->label('Sous-catégorie (principale)')
                                            ->relationship('sousCategorie', 'designation_fr')
                                            ->searchable()
                                            ->preload()
                                            ->helperText('Sous-catégorie principale (pour compatibilité legacy)'),
                                        Forms\Components\Select::make('sous_categories')
                                            ->label('Sous-catégories (multiples)')
                                            ->relationship('sousCategories', 'designation_fr')
                                            ->multiple()
                                            ->searchable()
                                            ->preload()
                                            ->helperText('Sélectionnez une ou plusieurs sous-catégories pour ce produit')
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                // Sync legacy sous_categorie_id with first selected subcategory
                                                if (is_array($state) && count($state) > 0) {
                                                    $set('sous_categorie_id', $state[0]);
                                                } else {
                                                    $set('sous_categorie_id', null);
                                                }
                                            }),
                                    ]),
                                    Forms\Components\RichEditor::make('description_fr')
                                        ->label('Description')
                                        ->columnSpanFull(),
                                ]),
                            Section::make('Médias')
                                ->schema([
                                    FileUpload::make('cover')
                                        ->label('Couverture (image principale)')
                                        ->disk('public')
                                        ->directory('produits')
                                        ->image()
                                        ->imageEditor()
                                        ->maxSize(4096)
                                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                            $path = $file->store('produits', 'public');
                                            if (! $path) {
                                                $ext  = $file->getClientOriginalExtension() ?: 'jpg';
                                                $path = $file->storeAs('produits', \Illuminate\Support\Str::uuid() . '.' . $ext, 'public');
                                            }
                                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                                        }),
                                    FileUpload::make('images')
                                        ->label('Gallery (images secondaires)')
                                        ->disk('public')
                                        ->directory('produits')
                                        ->image()
                                        ->multiple()
                                        ->reorderable()
                                        ->maxSize(4096)
                                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                            $path = $file->store('produits', 'public');
                                            if (! $path) {
                                                $ext  = $file->getClientOriginalExtension() ?: 'jpg';
                                                $path = $file->storeAs('produits', \Illuminate\Support\Str::uuid() . '.' . $ext, 'public');
                                            }
                                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                                        }),
                                ]),
                            Section::make('Flags produit')
                                ->schema([
                                    Grid::make(4)->schema([
                                        Forms\Components\Toggle::make('pack')->label('Pack'),
                                        Forms\Components\Toggle::make('new_product')->label('New Product'),
                                        Forms\Components\Toggle::make('best_seller')->label('Meilleures ventes'),
                                        Forms\Components\Select::make('note')
                                            ->label('Note (étoiles)')
                                            ->options([
                                                1 => '★ 1',
                                                2 => '★★ 2',
                                                3 => '★★★ 3',
                                                4 => '★★★★ 4',
                                                5 => '★★★★★ 5',
                                            ])
                                            ->native(false)
                                            ->placeholder('—'),
                                    ]),
                                ]),
                        ]),

                    Tab::make('2. Stock & état')
                        ->schema([
                            Section::make('Stock')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('qte')
                                            ->label('Qte (quantité)')
                                            ->numeric()
                                            ->default(0)
                                            ->minValue(0)
                                            ->live(onBlur: true)
                                            ->disabled(fn (callable $get) => (int) $get('rupture') === 1)
                                            ->dehydrated(true)
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                $set('rupture', (int) $state <= 0 ? 1 : 0);
                                            }),
                                        Forms\Components\Select::make('rupture')
                                            ->label('Etat de stock')
                                            ->options([
                                                0 => 'En stock',
                                                1 => 'Rupture',
                                            ])
                                            // Qté = 0 ⇒ rupture (aligné avec le modèle)
                                            ->default(1)
                                            ->required()
                                            ->native(false)
                                            ->live()
                                            ->afterStateUpdated(function ($state, callable $set, callable $get): void {
                                                if ((int) $state === 1) {
                                                    $set('qte', 0);

                                                    return;
                                                }
                                                // En stock : éviter qté 0 (sinon le modèle remettrait en rupture au save)
                                                if ((int) $get('qte') <= 0) {
                                                    $set('qte', 1);
                                                }
                                            }),
                                        Forms\Components\Toggle::make('force_out_of_stock')
                                            ->label('Forcer la rupture (indisponible)')
                                            ->helperText("Rend le produit indisponible même si la quantité > 0. N'est PAS réinitialisé lors d'un enregistrement ou d'un import.")
                                            ->inline(false),
                                    ]),
                                ]),
                        ]),

                    Tab::make("3. Prix & Promotion")
                        ->icon('heroicon-o-currency-dollar')
                        ->schema([
                            Section::make("Prix de vente")
                                ->icon('heroicon-o-tag')
                                ->description('Définissez le prix de vente et le prix promotionnel du produit.')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\TextInput::make("prix")
                                            ->label("Prix")
                                            ->numeric()
                                            ->prefix("DT")
                                            ->placeholder("0.000")
                                            ->step(0.001)
                                            ->minValue(0)
                                            ->extraInputAttributes(['class' => 'text-lg font-semibold'])
                                            ->helperText('Prix de vente affiché sur le site.'),
                                        Forms\Components\TextInput::make("promo")
                                            ->label("Prix Promo")
                                            ->numeric()
                                            ->prefix("DT")
                                            ->placeholder("0.000")
                                            ->step(0.001)
                                            ->minValue(0)
                                            ->extraInputAttributes(['class' => 'text-lg font-semibold text-red-600'])
                                            ->helperText('Laissez vide si aucune promotion.'),
                                    ]),
                                    Forms\Components\DateTimePicker::make("promo_expiration_date")
                                        ->label("Date d'expiration de la promotion")
                                        ->prefixIcon('heroicon-o-clock')
                                        ->helperText("Après cette date, le produit n'apparaît plus dans les Ventes Flash.")
                                        ->columnSpanFull(),
                                ]),
                        ]),

                    Tab::make('4. Contenu produit')
                        ->icon('heroicon-o-chat-bubble-left-right')
                        ->schema([
                            Section::make('Questions fréquentes (FAQ)')
                                ->icon('heroicon-o-question-mark-circle')
                                ->description('Ajoutez les questions/réponses qui apparaîtront sur la page produit.')
                                ->schema([
                                    Forms\Components\Repeater::make('faq')
                                        ->label('')
                                        ->visible(fn (): bool => self::hasProductColumn('faq'))
                                        ->dehydrated(fn (): bool => self::hasProductColumn('faq'))
                                        ->schema([
                                            Forms\Components\TextInput::make('q')
                                                ->label('Question')
                                                ->placeholder('Ex : Quelle est la dose recommandée ?')
                                                ->prefixIcon('heroicon-o-question-mark-circle')
                                                ->required()
                                                ->columnSpanFull(),
                                            Forms\Components\Textarea::make('a')
                                                ->label('Réponse')
                                                ->placeholder('Rédigez une réponse claire et concise…')
                                                ->rows(3)
                                                ->required()
                                                ->columnSpanFull(),
                                        ])
                                        ->columns(1)
                                        ->default([])
                                        ->collapsible()
                                        ->collapsed()
                                        ->itemLabel(fn (array $state): ?string => $state['q'] ? '❓ ' . Str::limit($state['q'], 60) : 'Nouvelle question')
                                        ->addActionLabel('Ajouter une question')
                                        ->reorderable()
                                        ->cloneable()
                                        ->columnSpanFull(),
                                    /**
                                     * ── PANNEAU NUTRITIONNEL ──────────────────────────────
                                     *
                                     * Typed once from the tub, rendered everywhere: the French
                                     * panel below is GENERATED from these fields on save, in both
                                     * the customer page and the Googlebot view, with the American
                                     * %DV footnote, the two "no amount declared" markers and the
                                     * curated French nutrient names all applied automatically.
                                     *
                                     * This is the main path, not a fallback. Measured 07/08/2026:
                                     * the NIH label database matched 0 of our 12 barcoded products
                                     * (it transcribes US labels; our brands are Polish, Spanish and
                                     * Portuguese), Open Food Facts knew 2, and 3% of live product
                                     * pages carry any nutrition content. No external database
                                     * covers this catalogue. The tub does.
                                     */
                                    /**
                                     * ── VIDÉO OFFICIELLE ──────────────────────────────────
                                     *
                                     * The id, not an embed code. Whatever lands here is
                                     * concatenated into an `<iframe src>` on a page that takes
                                     * card payments, so it is validated against YouTube's exact
                                     * 11-character alphabet and REJECTED otherwise — never
                                     * sanitised into something plausible.
                                     *
                                     * "Officielle" is the point: a reviewer's video embedded on
                                     * our own product page hands our page to claims we have not
                                     * checked and cannot stand behind.
                                     */
                                    Section::make('Vidéo officielle de la marque')
                                        ->description('Uniquement une vidéo publiée par la marque elle-même — pas un test ni un avis de youtubeur.')
                                        ->icon('heroicon-o-play-circle')
                                        ->collapsible()
                                        ->collapsed()
                                        ->visible(fn (): bool => self::hasProductColumn('official_video'))
                                        ->schema([
                                            Grid::make(2)->schema([
                                                Forms\Components\TextInput::make('official_video.youtube_id')
                                                    ->label('Vidéo YouTube')
                                                    ->placeholder('dQw4w9WgXcQ ou l\'URL complète')
                                                    ->helperText('Collez l\'identifiant ou le lien : les deux fonctionnent.')
                                                    // Normalised on save so a pasted watch/share/embed URL is
                                                    // stored as the bare id — one shape in the database.
                                                    ->dehydrateStateUsing(fn (?string $state): ?string => YouTubeId::parse($state))
                                                    ->rule(static function (): Closure {
                                                        return static function (string $attribute, $value, Closure $fail): void {
                                                            if (filled($value) && ! YouTubeId::isValid((string) $value)) {
                                                                $fail('Identifiant YouTube invalide. Attendu : 11 caractères, ou une URL YouTube.');
                                                            }
                                                        };
                                                    }),
                                                Forms\Components\TextInput::make('official_video.channel')
                                                    ->label('Chaîne')
                                                    ->placeholder('Optimum Nutrition')
                                                    ->helperText('Le nom de la chaîne qui a publié la vidéo — c\'est ce qui rend « officielle » vérifiable plus tard.'),
                                            ]),
                                            Forms\Components\TextInput::make('official_video.title')
                                                ->label('Titre de la vidéo')
                                                ->columnSpanFull(),
                                        ])
                                        ->columnSpanFull(),

                                    Section::make('Panneau nutritionnel')
                                        ->description('Recopiez le tableau imprimé sur l\'emballage. Le panneau affiché sur le site est généré à partir de ces lignes — ne calculez rien, ne convertissez rien, recopiez.')
                                        ->icon('heroicon-o-table-cells')
                                        ->collapsible()
                                        ->collapsed()
                                        ->visible(fn (): bool => self::hasProductColumn('nutrition_facts'))
                                        ->schema([
                                            Grid::make(4)->schema([
                                                Forms\Components\TextInput::make('nutrition_facts.serving_quantity')
                                                    ->label('Portion')
                                                    ->numeric()
                                                    ->step(0.001)
                                                    ->placeholder('30'),
                                                Forms\Components\TextInput::make('nutrition_facts.serving_unit')
                                                    ->label('Unité')
                                                    ->placeholder('g')
                                                    ->datalist(['g', 'ml', 'gélule(s)', 'comprimé(s)', 'dose(s)', 'sachet(s)']),
                                                Forms\Components\TextInput::make('nutrition_facts.servings_per_container')
                                                    ->label('Portions par contenant')
                                                    ->placeholder('30'),
                                                Forms\Components\TextInput::make('nutrition_facts.serving_note')
                                                    ->label('Mesure du fabricant')
                                                    ->placeholder('1 dosette rase')
                                                    ->helperText('Tel qu\'écrit sur le pot.'),
                                            ]),
                                            Grid::make(4)->schema([
                                                Forms\Components\TextInput::make('nutrition_facts.net_quantity')
                                                    ->label('Contenu net')
                                                    ->numeric()
                                                    ->step(0.001)
                                                    ->placeholder('2.27'),
                                                Forms\Components\TextInput::make('nutrition_facts.net_unit')
                                                    ->label('Unité')
                                                    ->placeholder('kg')
                                                    ->datalist(['g', 'kg', 'ml', 'l', 'gélule(s)', 'comprimé(s)']),
                                                Forms\Components\TextInput::make('nutrition_facts.label_reference')
                                                    ->label('Lot / référence étiquette')
                                                    ->placeholder('facultatif')
                                                    ->helperText('Permet de retrouver l\'emballage exact qui a été recopié.'),
                                                // The percentages on an EU tub are apports de référence; on a US
                                                // tub they are FDA Daily Values. Vitamin D is 20 µg in the US and
                                                // 5 µg in the EU — the same capsule reads 100 % on one label and
                                                // 400 % on the other, so the page must say which it is.
                                                Forms\Components\Select::make('nutrition_facts.percent_basis')
                                                    ->label('Référence des pourcentages')
                                                    ->options([
                                                        'eu' => 'AR européens (règlement UE 1169/2011)',
                                                        'us' => 'VQ américaines (FDA)',
                                                    ])
                                                    ->default('eu')
                                                    ->helperText('Emballage européen ou américain ?'),
                                            ]),

                                            Forms\Components\Repeater::make('nutrition_facts.rows')
                                                ->label('Lignes du tableau')
                                                ->helperText('Dans l\'ordre de l\'étiquette. Utilisez « Niveau » pour les sous-lignes (ex. « dont sucres » sous « Glucides ») : une sous-ligne est un composant de la ligne au-dessus, pas une ligne à côté.')
                                                ->schema([
                                                    Grid::make(12)->schema([
                                                        Forms\Components\TextInput::make('name')
                                                            ->label('Nutriment')
                                                            ->required()
                                                            ->columnSpan(4)
                                                            ->placeholder('Protéines')
                                                            ->helperText('Les noms réglementés (Protein, Vitamin C…) sont traduits automatiquement.'),
                                                        Forms\Components\Select::make('kind')
                                                            ->label('Type')
                                                            ->options([
                                                                'value' => 'Quantité chiffrée',
                                                                'undeclared' => 'Quantité non indiquée (% seul)',
                                                                'blend' => 'Mélange breveté',
                                                            ])
                                                            ->default('value')
                                                            ->required()
                                                            ->live()
                                                            ->columnSpan(3),
                                                        Forms\Components\TextInput::make('quantity')
                                                            ->label('Quantité')
                                                            ->numeric()
                                                            ->step(0.0001)
                                                            ->columnSpan(2)
                                                            // Hidden rather than ignored: a number typed beside
                                                            // "quantité non indiquée" would be a contradiction,
                                                            // and TranscribedLabel drops it anyway.
                                                            ->visible(fn (Forms\Get $get): bool => ($get('kind') ?? 'value') === 'value'),
                                                        Forms\Components\TextInput::make('unit')
                                                            ->label('Unité')
                                                            ->columnSpan(1)
                                                            ->datalist(['g', 'mg', 'µg', 'kcal', 'kJ', 'ml', 'UI'])
                                                            ->visible(fn (Forms\Get $get): bool => ($get('kind') ?? 'value') === 'value'),
                                                        Forms\Components\TextInput::make('percent_dv')
                                                            ->label('% VQ')
                                                            ->numeric()
                                                            ->columnSpan(1)
                                                            ->helperText('Si imprimé'),
                                                        Forms\Components\Select::make('depth')
                                                            ->label('Niveau')
                                                            ->options([0 => 'Principal', 1 => '— dont', 2 => '—— dont'])
                                                            ->default(0)
                                                            ->columnSpan(1),
                                                    ]),
                                                ])
                                                ->addActionLabel('Ajouter une ligne')
                                                ->itemLabel(fn (array $state): ?string => filled($state['name'] ?? null)
                                                    ? trim(($state['name'] ?? '').' '.($state['quantity'] ?? '').' '.($state['unit'] ?? ''))
                                                    : 'Nouvelle ligne')
                                                ->reorderable()
                                                ->cloneable()
                                                ->collapsible()
                                                ->columnSpanFull(),

                                            Forms\Components\Textarea::make('nutrition_facts.other_ingredients')
                                                ->label('Autres ingrédients')
                                                ->rows(2)
                                                ->helperText('Séparés par des virgules, DANS L\'ORDRE de l\'étiquette — l\'ordre indique les quantités décroissantes.')
                                                ->columnSpanFull(),
                                            Forms\Components\Textarea::make('nutrition_facts.allergens')
                                                ->label('Allergènes')
                                                ->rows(2)
                                                ->helperText('Une déclaration par ligne, recopiée MOT POUR MOT. Ne reformulez jamais une mention d\'allergène.')
                                                ->columnSpanFull(),
                                            Forms\Components\Textarea::make('nutrition_facts.warnings')
                                                ->label('Précautions d\'emploi')
                                                ->rows(2)
                                                ->helperText('Une par ligne, mot pour mot.')
                                                ->columnSpanFull(),
                                            Forms\Components\Textarea::make('nutrition_facts.claims')
                                                ->label('Allégations du fabricant')
                                                ->rows(2)
                                                ->helperText('« Sans gluten », « sans substance dopante »… Affichées comme des déclarations du fabricant que Protein.tn n\'a pas vérifiées.')
                                                ->columnSpanFull(),
                                        ])
                                        ->columnSpanFull(),

                                    Forms\Components\Textarea::make('nutrition_values')
                                        ->label('Valeurs Nutritionnelles (texte/HTML)')
                                        ->visible(fn (): bool => self::hasProductColumn('nutrition_values'))
                                        ->dehydrated(fn (): bool => self::hasProductColumn('nutrition_values'))
                                        ->rows(6)
                                        ->helperText(fn ($record): string => filled($record?->nutrition_facts)
                                            ? 'Généré automatiquement depuis le panneau nutritionnel ci-dessus — toute modification ici sera écrasée au prochain enregistrement.'
                                            : 'Champ libre. Dès que le panneau nutritionnel ci-dessus est rempli, ce contenu est généré automatiquement.')
                                        ->columnSpanFull(),
                                    FileUpload::make('nutrition_images')
                                        ->label('Images Nutritionnelles')
                                        ->helperText('Uploadez une ou plusieurs images du tableau nutritionnel (JPG, PNG, WebP — max 4 Mo chacune).')
                                        ->visible(fn (): bool => self::hasProductColumn('nutrition_images'))
                                        ->dehydrated(fn (): bool => self::hasProductColumn('nutrition_images'))
                                        ->disk('public')
                                        ->directory('produits/nutrition')
                                        ->multiple()
                                        ->reorderable()
                                        ->image()
                                        ->imageEditor()
                                        ->maxSize(4096)
                                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                                        ->maxFiles(10)
                                        ->panelLayout('grid')
                                        ->columnSpanFull(),
                                ]),
                        ]),

                    Tab::make('5. SEO')
                        ->schema([
                            Section::make('SEO de base')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\TextInput::make('seo_title')
                                            ->label('SEO title')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_title'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_title'))
                                            ->maxLength(255)
                                            ->helperText('Titre prioritaire pour la balise <title>. Fallback: Meta title puis designation.'),
                                        Forms\Components\Textarea::make('seo_description')
                                            ->label('SEO description')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_description'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_description'))
                                            ->rows(3)
                                            ->maxLength(500)
                                            ->columnSpanFull(),
                                        Forms\Components\TextInput::make('meta_description')
                                            ->label('Meta Description')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('meta_title')
                                            ->label('Meta (name;content)')
                                            ->maxLength(255),
                                        Forms\Components\Textarea::make('seo_excerpt')
                                            ->label('Extrait SEO court')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_excerpt'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_excerpt'))
                                            ->rows(3)
                                            ->maxLength(1000)
                                            ->columnSpanFull(),
                                        Forms\Components\TextInput::make('seo_canonical_url')
                                            ->label('Canonical URL')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_canonical_url'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_canonical_url'))
                                            ->url()
                                            ->maxLength(1024)
                                            ->columnSpanFull(),
                                        Forms\Components\Toggle::make('seo_robots_index')
                                            ->label('Indexable')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_robots_index'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_robots_index'))
                                            ->default(true),
                                        Forms\Components\Toggle::make('seo_robots_follow')
                                            ->label('Liens suivis (follow)')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_robots_follow'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_robots_follow'))
                                            ->default(true),
                                    ]),
                                ]),
                            Section::make('Contenu & médias SEO')
                                ->description('SKU, GTIN, MPN, stock, prix et avis dans le JSON-LD sont calculés automatiquement depuis le produit et les avis publiés.')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\TextInput::make('seo_image_alt')
                                            ->label('Texte alternatif image SEO')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_image_alt'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_image_alt'))
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('alt_cover')
                                            ->label('Alt Cover (SEO)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('description_cover')
                                            ->label('Description Cover (SEO)')
                                            ->maxLength(500),
                                        Forms\Components\Textarea::make('seo_schema_description')
                                            ->label('Description schema (texte brut / court)')
                                            ->visible(fn (): bool => self::hasProductColumn('seo_schema_description'))
                                            ->dehydrated(fn (): bool => self::hasProductColumn('seo_schema_description'))
                                            ->helperText('Optionnel : prioritaire sur la description SEO pour le champ description du schema.org Product.')
                                            ->rows(3)
                                            ->columnSpanFull(),
                                    ]),
                                ]),
                            Section::make('Indicateurs schema (lecture seule)')
                                ->collapsed()
                                ->visible(fn ($record) => $record instanceof Product)
                                ->schema([
                                    Forms\Components\Placeholder::make('schema_sku')
                                        ->label('SKU / productID (effectif)')
                                        ->content(fn (?Product $record): string => $record ? e((string) $record->effective_sku) : '—'),
                                    Forms\Components\Placeholder::make('schema_price')
                                        ->label('Prix TTC affiché (schema Offer)')
                                        ->content(fn (?Product $record): string => $record ? e(number_format($record->getEffectiveUnitPrice(), 3, ',', ' ')) . ' DT' : '—'),
                                    Forms\Components\Placeholder::make('schema_availability')
                                        ->label('Disponibilité (schema.org)')
                                        ->content(fn (?Product $record): string => $record ? e($record->effective_availability_schema) : '—'),
                                    Forms\Components\Placeholder::make('schema_condition')
                                        ->label('État produit')
                                        ->content(fn (?Product $record): string => $record ? e($record->effective_item_condition_schema) : '—'),
                                    Forms\Components\Placeholder::make('schema_price_until')
                                        ->label('priceValidUntil (si promo / date)')
                                        ->content(function (?Product $record): string {
                                            if (! $record) {
                                                return '—';
                                            }
                                            $v = $record->effective_price_valid_until;

                                            return $v ? e((string) $v) : '— (non envoyé sans promo ni date)';
                                        }),
                                    Forms\Components\Placeholder::make('schema_reviews')
                                        ->label('Avis publiés (JSON-LD)')
                                        ->content(function (?Product $record): HtmlString|string {
                                            if (! $record?->id) {
                                                return '—';
                                            }
                                            $published = $record->reviews()->where('publier', 1)->get();
                                            $count = $published->count();
                                            if ($count === 0) {
                                                return new HtmlString('<span class="text-gray-500">Aucun avis publié — pas d’AggregateRating dans le schema.</span>');
                                            }
                                            $values = $published->map(function (Review $r): int {
                                                $n = (int) ($r->stars ?? $r->note ?? 0);

                                                return ($n >= 1 && $n <= 5) ? $n : 0;
                                            })->filter(fn (int $n) => $n > 0);
                                            $avg = $values->isNotEmpty() ? round($values->avg(), 1) : '—';

                                            return new HtmlString(
                                                '<strong>' . e((string) $count) . '</strong> avis — moyenne <strong>' . e((string) $avg) . '</strong> / 5'
                                            );
                                        }),
                                ]),
                        ]),

                    Tab::make('6. Classification')
                        ->schema([
                            Section::make('Classification')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\Select::make('tags')
                                            ->label('Tags')
                                            ->relationship('tags', 'designation_fr')
                                            ->multiple()
                                            ->searchable()
                                            ->preload(),
                                        Forms\Components\Select::make('aromes')
                                            ->label('Aromas')
                                            ->relationship('aromes', 'designation_fr')
                                            ->multiple()
                                            ->searchable()
                                            ->preload(),
                                    ]),
                                ]),
                        ]),

                    Tab::make('7. Publication')
                        ->schema([
                            Section::make('Publication')
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label('Publier')
                                        ->default(true),
                                ]),
                        ]),
                ])
                ->persistTabInQueryString()
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['sousCategorie:id,designation_fr', 'sousCategories:id,designation_fr', 'brand:id,designation_fr']))
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->cover))
                    ->disk('public')
                    ->circular()
                    ->size(48)
                    ->width(48)
                    ->height(48),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable()
                    ->limit(35)
                    ->wrap(false)
                    ->width('20%'),
                Tables\Columns\TextColumn::make('subCategoriesList')
                    ->label('Sous-catégories')
                    ->getStateUsing(function ($record): string {
                        // Try new many-to-many relationship first
                        $subCategories = $record->sousCategories;
                        if ($subCategories && $subCategories->count() > 0) {
                            return $subCategories->pluck('designation_fr')->join(', ');
                        }
                        // Fallback to legacy single subcategory
                        return $record->sousCategorie?->designation_fr ?? '—';
                    })
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query
                            ->leftJoin('product_sous_category', 'products.id', '=', 'product_sous_category.product_id')
                            ->leftJoin('sous_categories', 'product_sous_category.sous_category_id', '=', 'sous_categories.id')
                            ->orderBy('sous_categories.designation_fr', $direction)
                            ->groupBy('products.id');
                    })
                    ->limit(25)
                    ->wrap(false)
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->width('15%'),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->limit(20)
                    ->wrap(false)
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->width('12%'),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix')
                    ->money('TND', 0)
                    ->sortable()
                    ->numeric()
                    ->width('10%'),
                Tables\Columns\TextColumn::make('promo')
                    ->label('Promo')
                    ->money('TND', 0)
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->placeholder('—')
                    ->numeric()
                    ->width('10%'),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Stock')
                    ->sortable()
                    ->badge()
                    ->color(fn (int $state): string => $state > 10 ? 'success' : ($state > 0 ? 'warning' : 'danger'))
                    ->width('8%'),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Publié')
                    ->boolean()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\IconColumn::make('best_seller')
                    ->label('Best')
                    ->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->contentGrid([
                'md' => 1,
                'xl' => 1,
            ])
            ->paginated([25, 50, 100])
            ->filters([
                Tables\Filters\TernaryFilter::make('publier')
                    ->label('Publié'),
                Tables\Filters\TernaryFilter::make('best_seller')
                    ->label('Best-seller'),
                Tables\Filters\TernaryFilter::make('pack')
                    ->label('Pack'),
                Tables\Filters\TernaryFilter::make('new_product')
                    ->label('Nouveau'),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Marque')
                    ->relationship('brand', 'designation_fr')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('sous_categorie_id')
                    ->label('Sous-catégorie')
                    ->relationship('sousCategorie', 'designation_fr')
                    ->searchable()
                    ->preload(),
                // Find what `products:generate-content` drafted. Without this the pending drafts are
                // invisible and would simply never be reviewed.
                Tables\Filters\SelectFilter::make('ai_review_status')
                    ->label('Contenu IA')
                    ->options([
                        'pending'  => 'Brouillon en attente',
                        'approved' => 'Publié',
                        'rejected' => 'Rejeté',
                    ]),
            ])
            ->filtersFormColumns(3)
            ->actions([
                Actions\EditAction::make(),
                /**
                 * Duplicate a product.
                 *
                 * The fastest way to add the 908 g version of a 2,27 kg tub, or a second flavour:
                 * same brand, same category, same description, same Supplement Facts panel, and the
                 * new row opens straight in the editor for the handful of fields that differ.
                 *
                 * This was impossible until now for a reason worth recording. `products` is a legacy
                 * table with NOT NULL columns that have no DEFAULT, so under MySQL strict mode any
                 * programmatic create died with "SQLSTATE[HY000] 1364". The fix lived in one Filament
                 * page's mutateFormDataBeforeCreate, which made that page the ONLY thing that could
                 * create a product. It now lives in the Product model's creating hook, so this action
                 * — and importers, seeders and the enrichment pipeline — work at all.
                 */
                Actions\Action::make('duplicate')
                    ->label('Dupliquer')
                    ->icon('heroicon-o-document-duplicate')
                    ->color('gray')
                    ->requiresConfirmation()
                    ->modalHeading('Dupliquer ce produit')
                    ->modalDescription('Une copie non publiée est créée, avec « (copie) » dans le nom. Le stock est mis à zéro et les avis ne sont pas repris.')
                    ->modalSubmitActionLabel('Dupliquer')
                    ->action(function (Product $record) {
                        $copy = $record->replicate([
                            // Identifiers that must never be shared by two products. A duplicated
                            // barcode would send every future lookup — DSLD, Open Food Facts, the
                            // web enricher — to the wrong pack size and attach its panel to ours.
                            'gtin', 'sku', 'mpn', 'code_product', 'slug',
                            'created_at', 'updated_at',
                        ]);

                        $copy->designation_fr = Str::limit((string) $record->designation_fr, 180, '').' (copie)';
                        $copy->slug = Str::slug($copy->designation_fr).'-'.Str::lower(Str::random(4));
                        // Unpublished and out of stock: a copy is a draft until someone has set its
                        // price, its pack size and its quantity. Publishing it live by accident would
                        // put a duplicate page in front of both customers and Google.
                        $copy->publier = false;
                        $copy->qte = 0;
                        $copy->save();

                        // Many-to-many data does not travel with replicate().
                        //
                        // Plucked off the loaded relations rather than with a qualified column name:
                        // the `aromes()` relation maps to a table called `aromas`, so the obvious
                        // ->pluck('aromes.id') is an unknown-column error waiting for the first
                        // person to click this button.
                        $copy->tags()->sync($record->tags->pluck('id')->all());
                        $copy->aromes()->sync($record->aromes->pluck('id')->all());

                        \Filament\Notifications\Notification::make()
                            ->success()
                            ->title('Produit dupliqué')
                            ->body('Complétez le code-barres, le prix et le stock avant de publier.')
                            ->send();

                        return redirect(ProductResource::getUrl('edit', ['record' => $copy]));
                    }),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                // Publish AI-drafted copy. Drafts are written by `php artisan products:generate-content`
                // into ai_description_draft / ai_faq_draft and are invisible to customers and to
                // Google until this runs — that human gate is the quality control, and it is what
                // keeps a batch of generated pages away from Google's scaled-content-abuse policy.
                Actions\BulkAction::make('approveAiContent')
                    ->label('Publier le contenu IA')
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Publier le contenu rédigé par IA ?')
                    ->modalDescription('La description et la FAQ générées remplaceront le texte actuel des produits sélectionnés qui ont un brouillon en attente. Les autres seront ignorés.')
                    ->modalSubmitActionLabel('Publier')
                    ->action(function ($records) {
                        $published = 0;
                        $skipped = 0;

                        foreach ($records as $product) {
                            if ($product->ai_review_status !== 'pending' || blank($product->ai_description_draft)) {
                                $skipped++;
                                continue;
                            }

                            $product->forceFill([
                                'description_fr'   => $product->ai_description_draft,
                                'faq'              => $product->ai_faq_draft ?: $product->faq,
                                'ai_review_status' => 'approved',
                            ])->save();

                            $published++;
                        }

                        \Filament\Notifications\Notification::make()
                            ->title($published > 0 ? "{$published} fiche(s) publiée(s)" : 'Aucune fiche publiée')
                            ->body($skipped > 0 ? "{$skipped} produit(s) ignoré(s) (aucun brouillon en attente)." : null)
                            ->{$published > 0 ? 'success' : 'warning'}()
                            ->send();
                    })
                    ->deselectRecordsAfterCompletion(),

                Actions\BulkAction::make('rejectAiContent')
                    ->label('Rejeter le contenu IA')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(function ($records) {
                        $n = 0;
                        foreach ($records as $product) {
                            if ($product->ai_review_status === 'pending') {
                                $product->forceFill(['ai_review_status' => 'rejected'])->saveQuietly();
                                $n++;
                            }
                        }
                        \Filament\Notifications\Notification::make()
                            ->title("{$n} brouillon(s) rejeté(s)")
                            ->success()
                            ->send();
                    })
                    ->deselectRecordsAfterCompletion(),

                Actions\DeleteBulkAction::make()
                    ->label('Supprimer sélection'),
            ])
            ->extraAttributes([
                'class' => 'w-full overflow-x-hidden',
                'style' => 'table-layout: fixed;',
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['designation_fr', 'slug'];
    }
}
