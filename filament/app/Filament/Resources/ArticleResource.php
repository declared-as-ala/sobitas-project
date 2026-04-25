<?php

namespace App\Filament\Resources;

use App\Enums\BlogArticleType;
use App\Filament\Resources\ArticleResource\Pages;
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
                        Tab::make('Contenu')
                            ->icon('heroicon-o-pencil-square')
                            ->schema([
                                Section::make()
                                    ->schema([
                                        Forms\Components\TextInput::make('designation_fr')
                                            ->label('Titre de l\'article (H1)')
                                            ->placeholder('Ex: Top 5 des meilleures protéines whey en 2026')
                                            ->required()
                                            ->maxLength(255)
                                            ->columnSpanFull()
                                            ->live(onBlur: true)
                                            ->hint(fn ($state): string => strlen($state ?? '') . ' / 255')
                                            ->afterStateUpdated(function (string $operation, $state, Set $set, Get $get): void {
                                                if ($operation === 'create' || ($operation === 'edit' && empty($get('slug')))) {
                                                    $set('slug', Str::slug($state));
                                                }
                                            }),

                                        Forms\Components\TextInput::make('slug')
                                            ->label('URL simplifiée (Slug)')
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->prefix('protein.tn/blog/')
                                            ->columnSpanFull(),
                                    ]),

                                Section::make('Éditeur Professionnel')
                                    ->description('Structurez votre article avec des H2/H3 et des tableaux pour un meilleur référencement.')
                                    ->schema([
                                        Forms\Components\ToggleButtons::make(ArticleDescriptionHtml::FIELD_EDITOR_MODE)
                                            ->label('Mode de rédaction')
                                            ->options([
                                                ArticleDescriptionHtml::MODE_VISUAL => 'Visuel (Expert)',
                                                ArticleDescriptionHtml::MODE_HTML => 'Source HTML',
                                            ])
                                            ->icons([
                                                ArticleDescriptionHtml::MODE_VISUAL => Heroicon::OutlinedPencil,
                                                ArticleDescriptionHtml::MODE_HTML => Heroicon::OutlinedCodeBracket,
                                            ])
                                            ->default(ArticleDescriptionHtml::MODE_VISUAL)
                                            ->live()
                                            ->inline(),

                                        Forms\Components\RichEditor::make('description')
                                            ->label('Corps de l\'article')
                                            ->visible(fn (Get $get): bool => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_VISUAL)
                                            ->plugins([TextDirectionToolPlugin::make()])
                                            ->toolbarButtons([
                                                ['h2', 'h3', 'h4'], // Structure sémantique
                                                ['bold', 'italic', 'underline', 'strike'],
                                                ['link', 'blockquote', 'codeBlock'],
                                                ['bulletList', 'orderedList', 'checkList'], // Checklists pour conseils nutrition
                                                ['table', 'attachFiles'], // Tableaux de comparaison
                                                [TextDirectionToolPlugin::TOOL_AUTO, TextDirectionToolPlugin::TOOL_LTR, TextDirectionToolPlugin::TOOL_RTL],
                                                ['horizontalRule', 'clearFormatting'],
                                                ['undo', 'redo'],
                                            ])
                                            ->fileAttachmentsDisk('public')
                                            ->fileAttachmentsDirectory('articles/content')
                                            ->columnSpanFull(),

                                        Forms\Components\Textarea::make(ArticleDescriptionHtml::FIELD_HTML_STAGING)
                                            ->label('Code Source HTML')
                                            ->visible(fn (Get $get): bool => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_HTML)
                                            ->rows(20)
                                            ->extraInputAttributes(['class' => 'font-mono text-sm'])
                                            ->columnSpanFull(),

                                        Forms\Components\ViewField::make('_description_seo_metrics')
                                            ->view('filament.forms.components.article-description-seo-metrics')
                                            ->columnSpanFull(),
                                    ]),
                                
                                Section::make('Localisation & Accessibilité')
                                    ->schema([
                                        Grid::make(2)
                                            ->schema([
                                                Forms\Components\Select::make('content_text_direction')
                                                    ->label('Direction du texte')
                                                    ->options(['auto' => 'Auto', 'ltr' => 'Français (LTR)', 'rtl' => 'Arabe (RTL)'])
                                                    ->default('auto'),
                                                Forms\Components\TextInput::make('content_lang')
                                                    ->label('Code Langue (ISO)')
                                                    ->placeholder('fr ou ar'),
                                            ]),
                                    ]),
                            ]),

                        Tab::make('Médias & Visuels')
                            ->icon('heroicon-o-photo')
                            ->schema([
                                Section::make('Couverture de l\'article')
                                    ->schema([
                                        Forms\Components\FileUpload::make('cover')
                                            ->label('Image principale (21:9 recommandé)')
                                            ->disk('public')
                                            ->directory('articles')
                                            ->image()
                                            ->imageEditor()
                                            ->imageEditorAspectRatios(['21:9', '16:9', '1:1'])
                                            ->saveUploadedFileUsing(function ($file): string {
                                                $path = $file->store('articles', 'public');
                                                return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                                            }),
                                        Forms\Components\TextInput::make('alt_cover')
                                            ->label('Texte alternatif (SEO Image)')
                                            ->required()
                                            ->placeholder('Décrivez l\'image pour Google...'),
                                    ]),
                            ]),

                        Tab::make('Optimisation SEO')
                            ->icon('heroicon-o-magnifying-glass')
                            ->schema([
                                Section::make('Balises Meta')
                                    ->description('Ces informations apparaissent directement dans les résultats Google.')
                                    ->schema([
                                        Forms\Components\TextInput::make('meta_title')
                                            ->label('Titre SEO (Meta Title)')
                                            ->maxLength(60)
                                            ->live(onBlur: true)
                                            ->hint(fn ($state) => strlen($state ?? '') . ' / 60'),
                                        Forms\Components\Textarea::make('meta_description_fr')
                                            ->label('Description SEO (Meta Description)')
                                            ->maxLength(160)
                                            ->rows(3)
                                            ->live(onBlur: true)
                                            ->hint(fn ($state) => strlen($state ?? '') . ' / 160'),
                                    ]),
                            ]),

                        Tab::make('Classification')
                            ->icon('heroicon-o-tag')
                            ->schema([
                                Section::make('Organisation')
                                    ->schema([
                                        Forms\Components\Select::make('blog_type')
                                            ->options(BlogArticleType::options())
                                            ->label('Type d\'article'),
                                        Forms\Components\Select::make('categories')
                                            ->relationship('categories', 'name')
                                            ->multiple()
                                            ->preload(),
                                        Forms\Components\Toggle::make('publier')
                                            ->label('Mettre en ligne')
                                            ->onColor('success'),
                                    ]),
                            ]),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->getStateUsing(fn ($record) => ImagePath::normalize($record->cover))
                    ->circular(),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Titre')
                    ->searchable()
                    ->limit(50),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Statut')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([Tables\Actions\EditAction::make()])
            ->bulkActions([Tables\Actions\DeleteBulkAction::make()]);
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
