<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
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
use Filament\Tables\Table;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

class ArticleResource extends Resource
{
    protected static ?string $model = Article::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-newspaper';

    protected static string | \UnitEnum | null $navigationGroup = 'Blog';

    protected static ?string $navigationLabel = 'Blog';

    protected static ?string $modelLabel = 'Blog';

    protected static ?string $pluralModelLabel = 'Blogs';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->schema([
                Tabs::make('article_tabs')
                    ->persistTabInQueryString()
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
                                    ->description('Rédigez le contenu complet de votre article.')
                                    ->schema([
                                        Forms\Components\RichEditor::make('description')
                                            ->label(false)
                                            ->columnSpanFull()
                                            ->toolbarButtons([
                                                ['bold', 'italic', 'underline', 'strike'],
                                                ['h2', 'h3'],
                                                ['link'],
                                                ['bulletList', 'orderedList'],
                                                ['blockquote', 'codeBlock'],
                                                ['table', 'attachFiles'],
                                                ['undo', 'redo'],
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
                                            ->label(false)
                                            ->disk('public')
                                            ->directory('articles')
                                            ->image()
                                            ->imageEditor()
                                            ->imageEditorAspectRatios([null, '21:9', '16:9', '4:3', '1:1'])
                                            ->maxSize(5120)
                                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                                            ->columnSpanFull()
                                            ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                                $path = (string) $file->store('articles', 'public');
                                                return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
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

                                Grid::make(2)
                                    ->schema([
                                        // Left: Titre & Description fields
                                        Section::make('Titre & Description')
                                            ->icon('heroicon-o-tag')
                                            ->schema([
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

                                        // Right: Live SERP Preview
                                        Section::make('Aperçu dans Google')
                                            ->icon('heroicon-o-eye')
                                            ->description('Prévisualisation dans les résultats de recherche.')
                                            ->schema([
                                                Forms\Components\Placeholder::make('serp_preview')
                                                    ->label(false)
                                                    ->content(function (Get $get): HtmlString {
                                                        $rawTitle = $get('meta_title') ?: ($get('designation_fr') ?: 'Titre de votre article');
                                                        $rawDesc  = $get('meta_description_fr') ?: 'Renseignez une meta description pour voir comment votre article apparaîtra dans les résultats de recherche Google.';
                                                        $slug     = $get('slug') ?: 'votre-article';

                                                        $title = htmlspecialchars($rawTitle, ENT_QUOTES, 'UTF-8');
                                                        $desc  = htmlspecialchars($rawDesc,  ENT_QUOTES, 'UTF-8');
                                                        $url   = htmlspecialchars('votresite.com/blog/' . $slug, ENT_QUOTES, 'UTF-8');

                                                        return new HtmlString(
                                                            '<div style="font-family:arial,sans-serif;padding:14px 16px;border:1px solid #dadce0;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);">'
                                                            . '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'
                                                            .   '<div style="width:26px;height:26px;background:#e8eaed;border-radius:50%;"></div>'
                                                            .   '<div>'
                                                            .     '<div style="font-size:13px;color:#202124;font-weight:500;line-height:1.2;">Votre site</div>'
                                                            .     '<div style="font-size:11px;color:#4d5156;line-height:1.2;">' . $url . '</div>'
                                                            .   '</div>'
                                                            . '</div>'
                                                            . '<div style="font-size:19px;color:#1a0dab;line-height:1.3;margin-bottom:4px;font-weight:400;">' . $title . '</div>'
                                                            . '<div style="font-size:13px;color:#4d5156;line-height:1.58;">' . $desc . '</div>'
                                                            . '</div>'
                                                        );
                                                    }),
                                            ]),
                                    ]),

                                // Données structurées (collapsible)
                                Section::make('Données structurées (JSON-LD)')
                                    ->icon('heroicon-o-code-bracket')
                                    ->collapsible()
                                    ->collapsed()
                                    ->description('Balises avancées pour les moteurs de recherche.')
                                    ->schema([
                                        Forms\Components\Textarea::make('meta')
                                            ->label('Balises meta personnalisées')
                                            ->placeholder('keywords;nutrition,sport / author;Sobitas / robots;index,follow')
                                            ->rows(3)
                                            ->helperText('Format : nom;valeur — séparez plusieurs balises par des slashs ( / ).')
                                            ->columnSpanFull(),

                                        Forms\Components\Textarea::make('content_seo')
                                            ->label('Schema JSON-LD')
                                            ->placeholder('{"@context":"https://schema.org","@type":"Article","name":"…"}')
                                            ->rows(7)
                                            ->columnSpanFull(),

                                        Grid::make(2)
                                            ->schema([
                                                Forms\Components\TextInput::make('review')
                                                    ->label('Review (SEO)')
                                                    ->maxLength(500),

                                                Forms\Components\TextInput::make('aggregateRating')
                                                    ->label('AggregateRating (SEO)')
                                                    ->maxLength(500)
                                                    ->placeholder('{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"12"}'),
                                            ]),
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
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query
                ->select(['id', 'designation_fr', 'slug', 'cover', 'publier', 'created_at'])
            )
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->circular()
                    ->height(48)
                    ->width(48)
                    ->defaultImageUrl(function ($record) {
                        if (! $record->cover) {
                            return null;
                        }
                        if (str_starts_with($record->cover, 'http://') || str_starts_with($record->cover, 'https://')) {
                            return $record->cover;
                        }

                        return asset('storage/' . ltrim($record->cover, '/'));
                    }),

                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Titre')
                    ->searchable()
                    ->sortable()
                    ->limit(70)
                    ->description(fn ($record) => $record->slug),

                Tables\Columns\IconColumn::make('publier')
                    ->label('Publié')
                    ->boolean(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date de création')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
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
