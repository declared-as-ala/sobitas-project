<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\ArticleType;
use App\Filament\Support\ArticleBodyDocumentNormalizer;
use App\Filament\Support\ArticleDescriptionHtml;
use App\Filament\Support\ImagePath;
use App\Filament\Support\RichEditor\TextDirectionToolPlugin;
use App\Models\Article;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema as DbSchema;
use Throwable;

class ArticleResource extends Resource
{
    /** Public blog base URL (frontend) — must match production routes. */
    public const BLOG_PUBLIC_BASE_URL = 'https://protein.tn/blog';

    protected static ?string $model = Article::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-newspaper';

    protected static string | \UnitEnum | null $navigationGroup = 'Blog';

    protected static ?string $navigationLabel = 'Blog';

    protected static ?string $modelLabel = 'Blog';

    protected static ?string $pluralModelLabel = 'Blogs';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    /** @var array<string, bool> */
    private static array $articleColumnsCache = [];

    private static function hasArticleColumn(string $column): bool
    {
        if (array_key_exists($column, self::$articleColumnsCache)) {
            return self::$articleColumnsCache[$column];
        }

        try {
            return self::$articleColumnsCache[$column] = DbSchema::hasColumn('articles', $column);
        } catch (\Throwable) {
            return self::$articleColumnsCache[$column] = false;
        }
    }

    /**
     * Merge HTML staging into `description` when the editor is in HTML mode, then drop auxiliary keys.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function mergeDescriptionEditorFormData(array $data): array
    {
        if (($data[ArticleDescriptionHtml::FIELD_EDITOR_MODE] ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_HTML) {
            $data['description'] = (string) ($data[ArticleDescriptionHtml::FIELD_HTML_STAGING] ?? '');
        }

        unset(
            $data[ArticleDescriptionHtml::FIELD_EDITOR_MODE],
            $data[ArticleDescriptionHtml::FIELD_HTML_STAGING],
            $data['_description_seo_metrics'],
        );

        if (isset($data['description']) && is_array($data['description'])) {
            $data['description'] = ArticleDescriptionHtml::toStoredHtml($data['description']);
        }

        if (isset($data['description']) && is_string($data['description']) && $data['description'] !== '') {
            $normalized = ArticleBodyDocumentNormalizer::normalize($data['description']);
            $data['description'] = ArticleDescriptionHtml::sanitizeStoredHtml($normalized['html']);
            self::mergeInferredDocumentLocale($data, $normalized);
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array{html: string, lang: ?string, dir: ?string}  $normalized
     */
    private static function mergeInferredDocumentLocale(array &$data, array $normalized): void
    {
        if (blank($data['content_lang'] ?? null) && filled($normalized['lang'])) {
            $data['content_lang'] = Str::limit((string) $normalized['lang'], 16, '');
        }

        $direction = $data['content_text_direction'] ?? 'auto';
        if (($direction === 'auto' || blank($direction)) && filled($normalized['dir'])) {
            $d = strtolower((string) $normalized['dir']);
            if ($d === 'rtl' || $d === 'ltr') {
                $data['content_text_direction'] = $d;
            }
        }
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->schema([
                Tabs::make('article_tabs')
                    ->persistTabInQueryString()
                    ->columnSpanFull()
                    ->tabs([

                        // ═══════════════════════════════════════════════════════
                        // TAB 1 — CONTENU
                        // ═══════════════════════════════════════════════════════
                        Tab::make('Contenu')
                            ->icon('heroicon-o-pencil-square')
                            ->schema([

                                Section::make()
                                    ->schema([
                                        Forms\Components\TextInput::make('designation_fr')
                                            ->label('Titre de l\'article')
                                            ->placeholder('Donnez un titre accrocheur à votre article…')
                                            ->required()
                                            ->maxLength(255)
                                            ->columnSpanFull()
                                            ->live(onBlur: true)
                                            ->hint(function ($state): string {
                                                $len = strlen($state ?? '');
                                                return $len . ' / 255 caractères';
                                            })
                                            ->hintColor(function ($state): string {
                                                $len = strlen($state ?? '');
                                                if ($len > 200) return 'danger';
                                                if ($len > 80) return 'success';
                                                return 'gray';
                                            })
                                            ->afterStateUpdated(function (string $operation, $state, Set $set, Get $get): void {
                                                if ($operation === 'create' || ($operation === 'edit' && empty($get('slug')))) {
                                                    $set('slug', Str::slug($state));
                                                }
                                            }),

                                        Forms\Components\TextInput::make('slug')
                                            ->label('Slug URL')
                                            ->placeholder('titre-de-larticle')
                                            ->required()
                                            ->maxLength(255)
                                            ->unique(ignoreRecord: true)
                                            ->prefix('votresite.com/blog/')
                                            ->prefixIcon('heroicon-o-globe-alt')
                                            ->helperText('Généré automatiquement depuis le titre. Modifiable manuellement.')
                                            ->rules(['regex:/^[a-z0-9\-]+$/'])
                                            ->validationMessages(['regex' => 'Lettres minuscules, chiffres et tirets uniquement.'])
                                            ->columnSpanFull(),
                                    ]),

                                Section::make('Rédaction')
                                    ->icon('heroicon-o-document-text')
                                    ->iconColor('primary')
                                    ->description('Rédigez le contenu complet de votre article. Passez en mode HTML pour coller du balisage ou ajuster la structure sémantique (titres, liens, tableaux). Si vous collez une page HTML complète (<!DOCTYPE>, <html>…), seul le contenu du <body> est conservé ; les balises <head> (meta, styles globaux) ne sont pas enregistrées — utilisez la section Affichage pour la langue / le sens du texte, et l’onglet SEO pour les meta.')
                                    ->extraAttributes(['class' => 'article-redaction-section'])
                                    ->schema([
                                        Forms\Components\ToggleButtons::make(ArticleDescriptionHtml::FIELD_EDITOR_MODE)
                                            ->label('Mode d\'édition')
                                            ->helperText('Visuel : éditeur riche · HTML : source complète (collage, balises avancées)')
                                            ->options([
                                                ArticleDescriptionHtml::MODE_VISUAL => 'Visuel',
                                                ArticleDescriptionHtml::MODE_HTML => 'HTML',
                                            ])
                                            ->icons([
                                                ArticleDescriptionHtml::MODE_VISUAL => Heroicon::OutlinedEye,
                                                ArticleDescriptionHtml::MODE_HTML => Heroicon::OutlinedCodeBracket,
                                            ])
                                            ->colors([
                                                ArticleDescriptionHtml::MODE_VISUAL => 'primary',
                                                ArticleDescriptionHtml::MODE_HTML => 'gray',
                                            ])
                                            ->grouped()
                                            ->inline()
                                            ->default(ArticleDescriptionHtml::MODE_VISUAL)
                                            ->live()
                                            ->columnSpanFull()
                                            ->afterStateUpdated(function (mixed $state, Set $set, Get $get, mixed $old = null): void {
                                                if ($state === ArticleDescriptionHtml::MODE_HTML) {
                                                    $set(
                                                        ArticleDescriptionHtml::FIELD_HTML_STAGING,
                                                        ArticleDescriptionHtml::toStoredHtml($get('description')),
                                                    );

                                                    return;
                                                }

                                                // Only merge staging → RichEditor when leaving HTML mode.
                                                // On first load, $old is null and staging may not be hydrated yet;
                                                // running this would wipe `description` with an empty doc.
                                                if ($state === ArticleDescriptionHtml::MODE_VISUAL && $old === ArticleDescriptionHtml::MODE_HTML) {
                                                    $html = (string) ($get(ArticleDescriptionHtml::FIELD_HTML_STAGING) ?? '');

                                                    try {
                                                        $set(
                                                            'description',
                                                            ArticleDescriptionHtml::tipTapDocumentFromHtml($html),
                                                        );
                                                    } catch (Throwable $e) {
                                                        $set(ArticleDescriptionHtml::FIELD_EDITOR_MODE, ArticleDescriptionHtml::MODE_HTML);
                                                        Notification::make()
                                                            ->title('HTML invalide')
                                                            ->body('Impossible de repasser en mode Visuel : corrigez le HTML ou annulez avec Annuler / recharger la page.')
                                                            ->danger()
                                                            ->send();
                                                    }
                                                }
                                            }),

                                        Forms\Components\RichEditor::make('description')
                                            ->hiddenLabel()
                                            ->columnSpanFull()
                                            ->extraFieldWrapperAttributes(['class' => 'article-redaction-rich-editor'])
                                            ->visible(fn (Get $get): bool => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_VISUAL)
                                            ->dehydrated(fn (Get $get): bool => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_VISUAL)
                                            ->plugins([TextDirectionToolPlugin::make()])
                                            ->toolbarButtons([
                                                ['bold', 'italic', 'underline', 'strike'],
                                                ['h2', 'h3'],
                                                ['link'],
                                                ['bulletList', 'orderedList'],
                                                ['blockquote', 'codeBlock'],
                                                ['table', 'attachFiles'],
                                                [TextDirectionToolPlugin::TOOL_AUTO, TextDirectionToolPlugin::TOOL_LTR, TextDirectionToolPlugin::TOOL_RTL],
                                                ['horizontalRule', 'clearFormatting'],
                                                ['undo', 'redo'],
                                            ]),

                                        Forms\Components\Textarea::make(ArticleDescriptionHtml::FIELD_HTML_STAGING)
                                            ->label('Source HTML')
                                            ->rows(22)
                                            ->columnSpanFull()
                                            ->dehydrated(false)
                                            ->visible(fn (Get $get): bool => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_HTML)
                                            ->live(debounce: 400)
                                            ->extraFieldWrapperAttributes(['class' => 'article-redaction-html-field'])
                                            ->extraInputAttributes([
                                                'class' => 'article-html-source-input font-mono text-sm',
                                                'spellcheck' => 'false',
                                            ])
                                            ->helperText(new HtmlString(
                                                '<strong>SEO</strong> : utilisez H2/H3 pour structurer (le titre de l’article sert de H1 sur le site). '
                                                . 'Rédigez des ancres de liens explicites, ajoutez <code>alt</code> sur les images inline. '
                                                . 'À l’enregistrement, le HTML est assaini (scripts / balises dangereuses retirés).'
                                            )),

                                        Forms\Components\ViewField::make('_description_seo_metrics')
                                            ->hiddenLabel()
                                            ->view('filament.forms.components.article-description-seo-metrics')
                                            ->extraFieldWrapperAttributes(['class' => 'article-redaction-seo-wrap'])
                                            ->columnSpanFull()
                                            ->dehydrated(false),
                                    ]),

                                Section::make('Affichage du texte (blog)')
                                    ->icon('heroicon-o-language')
                                    ->iconColor('gray')
                                    ->description('Contrôle la direction et la langue du corps de l’article sur le site public. « Automatique » : pour l’affichage, le sens peut être déduit de la langue (ex. ar → RTL) côté site.')
                                    ->schema([
                                        Grid::make(2)
                                            ->schema([
                                                Forms\Components\Select::make('content_text_direction')
                                                    ->label('Sens du texte')
                                                    ->options([
                                                        'auto' => 'Automatique',
                                                        'ltr' => 'Gauche à droite (LTR)',
                                                        'rtl' => 'Droite à gauche (RTL)',
                                                    ])
                                                    ->default('auto')
                                                    ->required()
                                                    ->native(false),

                                                Forms\Components\TextInput::make('content_lang')
                                                    ->label('Langue du contenu (ISO)')
                                                    ->placeholder('fr, ar, …')
                                                    ->maxLength(16)
                                                    ->helperText('Optionnel. Ex. fr, ar. Améliore l’accessibilité (attribut lang) et peut guider le sens en mode Automatique.'),
                                            ]),
                                    ]),
                            ]),

                        // ═══════════════════════════════════════════════════════
                        // TAB 2 — MÉDIAS
                        // ═══════════════════════════════════════════════════════
                        Tab::make('Médias')
                            ->icon('heroicon-o-photo')
                            ->schema([

                                Section::make('Image de couverture')
                                    ->icon('heroicon-o-photo')
                                    ->description('Format recommandé : 21:9  ·  JPEG, PNG ou WebP  ·  Max 5 Mo')
                                    ->schema([
                                        Forms\Components\FileUpload::make('cover')
                                            ->hiddenLabel()
                                            ->disk('public')
                                            ->directory('articles')
                                            ->image()
                                            ->imageEditor()
                                            ->imageEditorAspectRatios([null, '21:9', '16:9', '4:3', '1:1'])
                                            ->maxSize(5120)
                                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                                            ->columnSpanFull()
                                            ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                                $path = $file->store('articles', 'public');
                                                if (! $path) {
                                                    $ext  = $file->getClientOriginalExtension() ?: 'jpg';
                                                    $path = $file->storeAs('articles', \Illuminate\Support\Str::uuid() . '.' . $ext, 'public');
                                                }
                                                return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                                            }),

                                        Grid::make(2)
                                            ->schema([
                                                Forms\Components\TextInput::make('alt_cover')
                                                    ->label('Texte alternatif (alt)')
                                                    ->maxLength(255)
                                                    ->placeholder('Ex : Protéine whey chocolat 1 kg')
                                                    ->prefixIcon('heroicon-o-eye')
                                                    ->helperText('Obligatoire pour l\'accessibilité et le référencement des images.'),

                                                Forms\Components\TextInput::make('description_cover')
                                                    ->label('Légende de l\'image')
                                                    ->maxLength(255)
                                                    ->placeholder('Légende affichée sous l\'image (optionnel)')
                                                    ->prefixIcon('heroicon-o-chat-bubble-bottom-center-text'),
                                            ]),
                                    ]),
                            ]),

                        // ═══════════════════════════════════════════════════════
                        // TAB 3 — SEO
                        // ═══════════════════════════════════════════════════════
                        Tab::make('SEO')
                            ->icon('heroicon-o-magnifying-glass')
                            ->schema([
                                Section::make('Titre & Description')
                                    ->icon('heroicon-o-tag')
                                    ->schema([
                                        Forms\Components\TextInput::make('seo_title')
                                            ->label('SEO title (prioritaire)')
                                            ->visible(fn (): bool => self::hasArticleColumn('seo_title'))
                                            ->dehydrated(fn (): bool => self::hasArticleColumn('seo_title'))
                                            ->maxLength(255)
                                            ->columnSpanFull(),
                                        Forms\Components\Textarea::make('seo_description')
                                            ->label('SEO description (prioritaire)')
                                            ->visible(fn (): bool => self::hasArticleColumn('seo_description'))
                                            ->dehydrated(fn (): bool => self::hasArticleColumn('seo_description'))
                                            ->maxLength(500)
                                            ->rows(4)
                                            ->columnSpanFull(),
                                        Forms\Components\Textarea::make('seo_excerpt')
                                            ->label('Extrait SEO')
                                            ->visible(fn (): bool => self::hasArticleColumn('seo_excerpt'))
                                            ->dehydrated(fn (): bool => self::hasArticleColumn('seo_excerpt'))
                                            ->maxLength(1000)
                                            ->rows(3)
                                            ->columnSpanFull(),
                                        Forms\Components\TextInput::make('meta_title')
                                            ->label('Titre SEO (meta title)')
                                            ->maxLength(255)
                                            ->placeholder('Titre affiché dans les résultats Google…')
                                            ->live(onBlur: true)
                                            ->hint(function ($state): string {
                                                return strlen($state ?? '') . ' / 60 recommandés';
                                            })
                                            ->hintColor(function ($state): string {
                                                $len = strlen($state ?? '');
                                                if ($len > 60) return 'danger';
                                                if ($len >= 40) return 'success';
                                                return 'gray';
                                            })
                                            ->helperText('Entre 40 et 60 caractères pour un meilleur affichage.')
                                            ->columnSpanFull(),

                                        Forms\Components\Textarea::make('meta_description_fr')
                                            ->label('Meta description')
                                            ->maxLength(500)
                                            ->placeholder('Description visible dans les résultats de recherche Google…')
                                            ->rows(4)
                                            ->live(onBlur: true)
                                            ->hint(function ($state): string {
                                                return strlen($state ?? '') . ' / 160 recommandés';
                                            })
                                            ->hintColor(function ($state): string {
                                                $len = strlen($state ?? '');
                                                if ($len > 160) return 'danger';
                                                if ($len >= 120) return 'success';
                                                return 'gray';
                                            })
                                            ->helperText('Entre 120 et 160 caractères recommandés.')
                                            ->columnSpanFull(),
                                    ]),

                                Section::make('Maillage boutique')
                                    ->description('Liens vers les pages catégories du site (slugs /category/…).')
                                    ->icon('heroicon-o-link')
                                    ->schema([
                                        Forms\Components\Repeater::make('related_shop_slugs_repeater')
                                            ->label('Catégories boutique liées')
                                            ->visible(fn (): bool => self::hasArticleColumn('related_shop_category_slugs'))
                                            ->dehydrated(false)
                                            ->schema([
                                                Forms\Components\TextInput::make('slug')
                                                    ->label('Slug catégorie')
                                                    ->placeholder('ex. creatine, proteine-whey')
                                                    ->maxLength(255)
                                                    ->required(),
                                            ])
                                            ->default([])
                                            ->columnSpanFull(),
                                    ]),
                            ]),

                        // ═══════════════════════════════════════════════════════
                        // TAB 4 — PARAMÈTRES
                        // ═══════════════════════════════════════════════════════
                        Tab::make('Paramètres')
                            ->icon('heroicon-o-cog-6-tooth')
                            ->schema([

                                Section::make('Statut de publication')
                                    ->icon('heroicon-o-signal')
                                    ->description('Contrôlez la visibilité de cet article sur votre site.')
                                    ->schema([
                                        Forms\Components\Select::make('article_type_id')
                                            ->label('Type d\'article')
                                            ->relationship('articleType', 'name')
                                            ->options(fn () => ArticleType::orderBy('sort_order')->pluck('name', 'id'))
                                            ->placeholder('— Non défini —')
                                            ->nullable()
                                            ->native(false)
                                            ->searchable()
                                            ->preload()
                                            ->helperText('Gérez les types disponibles dans Blog → Types d\'articles.')
                                            ->columnSpanFull(),
                                        Forms\Components\Select::make('tags')
                                            ->label('Tags blog')
                                            ->relationship('tags', 'name')
                                            ->multiple()
                                            ->searchable()
                                            ->preload()
                                            ->columnSpanFull(),

                                        Forms\Components\Toggle::make('publier')
                                            ->label('Publier cet article')
                                            ->default(false)
                                            ->onColor('success')
                                            ->offColor('gray')
                                            ->helperText('Désactivez pour enregistrer en tant que brouillon — l\'article ne sera pas visible sur le site.'),
                                    ]),

                            ]),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        $selectCols = ['id', 'designation_fr', 'slug', 'cover', 'publier', 'article_type_id', 'created_at'];

        $columns = [
            Tables\Columns\ImageColumn::make('cover')
                ->label('Image')
                ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->cover))
                ->disk('public')
                ->circular()
                ->height(48)
                ->width(48),

            Tables\Columns\TextColumn::make('designation_fr')
                ->label('Titre')
                ->searchable()
                ->sortable()
                ->limit(70)
                ->description(fn ($record) => $record->slug),
        ];

        $columns[] = Tables\Columns\TextColumn::make('articleType.name')
            ->label('Type')
            ->badge()
            ->color(fn ($state): string => $state ? 'info' : 'gray')
            ->default('—')
            ->toggleable()
            ->sortable();

        $columns[] = Tables\Columns\IconColumn::make('publier')
            ->label('Publié')
            ->boolean();

        $columns[] = Tables\Columns\TextColumn::make('created_at')
            ->label('Date de création')
            ->dateTime('d/m/Y')
            ->sortable();

        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->select($selectCols)->with('articleType'))
            ->columns($columns)
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListArticles::route('/'),
            'create' => Pages\CreateArticle::route('/create'),
            'edit'   => Pages\EditArticle::route('/{record}/edit'),
        ];
    }
}
