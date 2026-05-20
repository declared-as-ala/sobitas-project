<?php

namespace App\Filament\Support;

use App\Services\Media\ConvertUploadedImageToWebp;
use Filament\Forms;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

final class CategorySeoForm
{
    /**
     * Coerce any legacy stored value into an array of rows shaped for a Repeater.
     * Handles: null, JSON-encoded scalar/string, comma-separated string,
     * flat list of scalars (e.g. ['whey','creatine']), and already-correct rows.
     *
     * @param  mixed  $state  value coming from the cast attribute
     * @param  string  $rowKey  field name used inside the Repeater item (e.g. 'term', 'slug', 'tag')
     */
    public static function normalizeRepeaterRows(mixed $state, string $rowKey): array
    {
        if ($state === null || $state === '') {
            return [];
        }
        if (is_string($state)) {
            $decoded = json_decode($state, true);
            if (is_array($decoded)) {
                $state = $decoded;
            } elseif (is_string($decoded) && trim($decoded, " \t\n\r\0\x0B\"'") === '[]') {
                return [];
            } elseif (trim($state, " \t\n\r\0\x0B\"'") === '[]') {
                return [];
            } else {
                // Comma/semicolon separated legacy string
                $state = array_values(array_filter(array_map('trim', preg_split('/[,;]/', $state) ?: [])));
            }
        }
        if (! is_array($state)) {
            return [];
        }

        $rows = [];
        foreach ($state as $item) {
            if (is_array($item) || is_object($item)) {
                $rows[] = (array) $item;
                continue;
            }
            if (is_scalar($item) && (string) $item !== '') {
                $rows[] = [$rowKey => (string) $item];
            }
        }

        return $rows;
    }

    /**
     * Coerce a FAQ stored value into the [{q,a}, …] shape expected by the Repeater.
     * Accepts legacy {question,answer} keys.
     */
    public static function normalizeFaqRows(mixed $state): array
    {
        if ($state === null || $state === '') {
            return [];
        }
        if (is_string($state)) {
            $decoded = json_decode($state, true);
            $state = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($state)) {
            return [];
        }

        $rows = [];
        foreach ($state as $item) {
            if (! is_array($item) && ! is_object($item)) {
                continue;
            }
            $item = (array) $item;
            $q = trim((string) ($item['q'] ?? $item['question'] ?? ''));
            $a = trim((string) ($item['a'] ?? $item['answer'] ?? $item['reponse'] ?? ''));
            if ($q !== '' || $a !== '') {
                $rows[] = ['q' => $q, 'a' => $a];
            }
        }

        return $rows;
    }

    /**
     * @return array<int, \Filament\Schemas\Components\Component>
     */
    public static function seoSections(bool $forSubCategory): array
    {
        $sections = [
            Section::make('Référencement — aperçu')
                ->description('Les champs structurés alimentent protein.tn (meta, Open Graph, Twitter, JSON-LD). Titre SEO ≤ 60 car. recommandé.')
                ->schema([
                    Forms\Components\Toggle::make('seo_enabled')
                        ->label('SEO activé')
                        ->helperText('Si désactivé, le front peut ignorer ces champs et utiliser le JSON de secours.')
                        ->default(true),
                    Forms\Components\TextInput::make('meta_title')
                        ->label('Titre SEO (balise title)')
                        ->maxLength(255)
                        ->live(debounce: 400)
                        ->helperText(fn (?string $state): string => 'Longueur : '.mb_strlen((string) ($state ?? '')).' car.'),
                    Forms\Components\Textarea::make('meta_description')
                        ->label('Meta description')
                        ->rows(3)
                        ->maxLength(500)
                        ->live(debounce: 400)
                        ->helperText(fn (?string $state): string => 'Longueur : '.mb_strlen((string) ($state ?? '')).' car. — idéal 150–160.'),
                    Forms\Components\TextInput::make('meta_keywords')
                        ->label('Meta keywords (liste courte)')
                        ->maxLength(500)
                        ->helperText('Séparateurs conseillés : virgules. Utilisé dans meta keywords côté front.'),
                    Forms\Components\TextInput::make('h1_title')
                        ->label('Titre H1 sur la page (optionnel)')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('breadcrumb_label')
                        ->label('Libellé fil d’Ariane (optionnel)')
                        ->maxLength(255),
                    Forms\Components\ViewField::make('_seo_preview')
                        ->hiddenLabel()
                        ->view('filament.forms.components.sous-category-seo-preview')
                        ->dehydrated(false)
                        ->columnSpanFull(),
                    Forms\Components\ViewField::make('_seo_warnings')
                        ->hiddenLabel()
                        ->view('filament.forms.components.category-seo-warnings')
                        ->dehydrated(false)
                        ->columnSpanFull(),
                ]),

            Section::make('Contenu visible (page catégorie)')
                ->description('Texte affiché sur le site — introduction au-dessus des produits, guide en bas.')
                ->schema([
                    Forms\Components\RichEditor::make('short_intro')
                        ->label('Introduction (au-dessus de la grille produits)')
                        ->toolbarButtons([
                            'bold', 'italic', 'underline', 'strike', 'link',
                            'h2', 'h3', 'bulletList', 'orderedList', 'blockquote',
                        ])
                        ->columnSpanFull(),
                    Forms\Components\RichEditor::make('long_bottom_content')
                        ->label('Bloc bas de page (contenu SEO long)')
                        ->toolbarButtons([
                            'bold', 'italic', 'underline', 'strike', 'link',
                            'h2', 'h3', 'bulletList', 'orderedList', 'blockquote',
                        ])
                        ->columnSpanFull(),
                    Forms\Components\Repeater::make('faq')
                        ->label('FAQ (page + JSON-LD FAQPage)')
                        ->schema([
                            Forms\Components\TextInput::make('q')
                                ->label('Question')
                                ->required(),
                            Forms\Components\Textarea::make('a')
                                ->label('Réponse')
                                ->rows(3)
                                ->required(),
                        ])
                        ->default([])
                        ->formatStateUsing(fn ($state) => self::normalizeFaqRows($state))
                        ->collapsible()
                        ->columnSpanFull(),
                ]),

            Section::make('Open Graph')
                ->schema([
                    Forms\Components\TextInput::make('og_title')
                        ->label('og:title')
                        ->maxLength(255),
                    Forms\Components\Textarea::make('og_description')
                        ->label('og:description')
                        ->rows(2)
                        ->maxLength(500),
                    Forms\Components\TextInput::make('og_image')
                        ->label('og:image (chemin storage ou URL)')
                        ->maxLength(512),
                    Forms\Components\TextInput::make('og_image_alt')
                        ->label('Texte alternatif og:image')
                        ->maxLength(255),
                ]),

            Section::make('Twitter / X')
                ->schema([
                    Forms\Components\TextInput::make('twitter_title')
                        ->label('twitter:title')
                        ->maxLength(255),
                    Forms\Components\Textarea::make('twitter_description')
                        ->label('twitter:description')
                        ->rows(2)
                        ->maxLength(500),
                    Forms\Components\TextInput::make('twitter_image')
                        ->label('twitter:image (chemin ou URL)')
                        ->maxLength(512),
                ]),

            Section::make('Mots-clés, canonique, robots')
                ->schema([
                    Forms\Components\TextInput::make('primary_keyword')
                        ->label('Mot-clé principal (focus)')
                        ->maxLength(255),
                    Forms\Components\Repeater::make('secondary_keywords')
                        ->label('Mots-clés secondaires')
                        ->schema([
                            Forms\Components\TextInput::make('term')
                                ->label('Mot-clé')
                                ->maxLength(80)
                                ->required(),
                        ])
                        ->default([])
                        ->formatStateUsing(fn ($state) => self::normalizeRepeaterRows($state, 'term'))
                        ->reorderable(false)
                        ->columnSpanFull(),
                    Forms\Components\Repeater::make('seo_tags')
                        ->label('Tags SEO (libres)')
                        ->schema([
                            Forms\Components\TextInput::make('tag')
                                ->label('Tag')
                                ->maxLength(64)
                                ->required(),
                        ])
                        ->default([])
                        ->formatStateUsing(fn ($state) => self::normalizeRepeaterRows($state, 'tag'))
                        ->columnSpanFull(),
                    Forms\Components\Repeater::make('related_category_slugs')
                        ->label('Slugs catégories associées (interne)')
                        ->helperText('Slugs exacts de catégories ou sous-catégories existantes (ex. creatine, proteine-whey).')
                        ->schema([
                            Forms\Components\TextInput::make('slug')
                                ->label('Slug')
                                ->maxLength(255)
                                ->required(),
                        ])
                        ->default([])
                        ->formatStateUsing(fn ($state) => self::normalizeRepeaterRows($state, 'slug'))
                        ->columnSpanFull(),
                    Forms\Components\TextInput::make('canonical_url')
                        ->label('URL canonique (optionnel)')
                        ->maxLength(512),
                    Grid::make(2)->schema([
                        Forms\Components\Toggle::make('robots_index')
                            ->label('Indexation (index)')
                            ->default(true),
                        Forms\Components\Toggle::make('robots_follow')
                            ->label('Suivi des liens (follow)')
                            ->default(true),
                    ]),
                ]),

            Section::make('Bannières SEO')
                ->description('Images hero optionnelles sur la page catégorie (desktop / mobile).')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\FileUpload::make('seo_banner_desktop')
                            ->label('Bannière desktop')
                            ->disk('public')
                            ->directory('categories/banners')
                            ->image()
                            ->imageEditor()
                            ->visibility('public')
                            ->maxSize(4096)
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                            ->saveUploadedFileUsing(self::webpConverter('categories/banners')),
                        Forms\Components\FileUpload::make('seo_banner_mobile')
                            ->label('Bannière mobile')
                            ->disk('public')
                            ->directory('categories/banners')
                            ->image()
                            ->imageEditor()
                            ->visibility('public')
                            ->maxSize(3072)
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                            ->saveUploadedFileUsing(self::webpConverter('categories/banners')),
                    ]),
                ]),

            Section::make('Sitemap & JSON-LD supplémentaire')
                ->schema([
                    Forms\Components\Toggle::make('sitemap_include')
                        ->label('Inclure dans le sitemap XML')
                        ->default(true),
                    Forms\Components\TextInput::make('sitemap_priority')
                        ->label('Priorité sitemap (0.00 – 1.00)')
                        ->numeric()
                        ->step(0.01)
                        ->minValue(0)
                        ->maxValue(1)
                        ->helperText('Vide = valeur par défaut côté front.'),
                    Forms\Components\Select::make('sitemap_changefreq')
                        ->label('Fréquence de changement')
                        ->options([
                            'always' => 'always',
                            'hourly' => 'hourly',
                            'daily' => 'daily',
                            'weekly' => 'weekly',
                            'monthly' => 'monthly',
                            'yearly' => 'yearly',
                            'never' => 'never',
                        ])
                        ->native(false),
                    Forms\Components\Textarea::make('_extra_json_ld_editor')
                        ->label('JSON-LD supplémentaire (tableau JSON)')
                        ->helperText('Tableau d’objets avec @context et @type — fusionné avec les schémas auto (CollectionPage, FAQ…). Laisser vide si inutile.')
                        ->rows(8)
                        ->columnSpanFull()
                        ->dehydrated(false),
                ]),
        ];

        if ($forSubCategory) {
            $sections = array_merge($sections, [
                Section::make('Couverture produit (sous-catégorie)')
                    ->schema([
                        Grid::make(2)->schema([
                            Forms\Components\TextInput::make('alt_cover')
                                ->label('Alt image couverture')
                                ->maxLength(255),
                            Forms\Components\TextInput::make('description_cover')
                                ->label('Description cover (court)')
                                ->maxLength(500),
                        ]),
                    ]),
                Section::make('Legacy')
                    ->collapsed()
                    ->schema([
                        Forms\Components\Textarea::make('seo_schema_description')
                            ->label('Schema description (legacy)')
                            ->rows(4)
                            ->columnSpanFull(),
                        Forms\Components\Textarea::make('meta')
                            ->label('Meta brute (legacy)')
                            ->visible(fn ($record): bool => filled($record?->meta ?? null))
                            ->rows(4),
                    ]),
                Section::make('Avertissement — avis / AggregateRating')
                    ->icon('heroicon-o-exclamation-triangle')
                    ->iconColor('danger')
                    ->description(new \Illuminate\Support\HtmlString(
                        '<strong>Ne pas utiliser</strong> pour des pages catégorie sauf si des avis <em>réels et visibles</em> sont affichés sur la page.'
                    ))
                    ->collapsed()
                    ->schema([
                        Forms\Components\Textarea::make('review_seo')
                            ->label('Review (legacy)')
                            ->rows(2)
                            ->maxLength(255),
                        Forms\Components\TextInput::make('aggregate_rating_seo')
                            ->label('AggregateRating (legacy)')
                            ->maxLength(255),
                    ]),
            ]);
        }

        return $sections;
    }

    private static function webpConverter(string $directory): \Closure
    {
        return function (TemporaryUploadedFile $file) use ($directory): string {
            $path = $file->store($directory, 'public');
            if (! $path) {
                $ext = $file->getClientOriginalExtension() ?: 'jpg';
                $path = $file->storeAs($directory, \Illuminate\Support\Str::uuid().'.'.$ext, 'public');
            }

            return (new ConvertUploadedImageToWebp)->convertStoredPathToWebp((string) $path) ?? (string) $path;
        };
    }
}
