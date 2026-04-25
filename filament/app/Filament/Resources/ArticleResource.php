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
use Filament\Forms\Form;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Grid;
use Filament\Forms\Components\Tabs;
use Filament\Forms\Components\Tabs\Tab;
use Filament\Forms\Set;
use Filament\Forms\Get;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema as DbSchema;

class ArticleResource extends Resource
{
    public const BLOG_PUBLIC_BASE_URL = 'https://protein.tn/blog';

    protected static ?string $model = Article::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-newspaper';
    protected static string | \UnitEnum | null $navigationGroup = 'Blog';
    protected static ?string $navigationLabel = 'Blog';
    protected static ?string $modelLabel = 'Article de Blog';
    protected static ?string $pluralModelLabel = 'Articles de Blog';
    protected static ?int $navigationSort = 1;
    protected static ?string $recordTitleAttribute = 'designation_fr';

    /**
     * Fusionne les données de l'éditeur (Visuel ou HTML) avant sauvegarde.
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
            
            // Détection automatique de la langue et direction
            if (blank($data['content_lang'] ?? null) && filled($normalized['lang'])) {
                $data['content_lang'] = Str::limit((string) $normalized['lang'], 16, '');
            }
            if (($data['content_text_direction'] ?? 'auto') === 'auto' && filled($normalized['dir'])) {
                $data['content_text_direction'] = strtolower($normalized['dir']);
            }
        }

        return $data;
    }

    public static function form(Form $form): Form
    {
        return $form
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
                                            ->label('Titre H1 (Français)')
                                            ->required()
                                            ->maxLength(255)
                                            ->live(onBlur: true)
                                            ->afterStateUpdated(fn (Set $set, $state) => $set('slug', Str::slug($state))),

                                        Forms\Components\TextInput::make('slug')
                                            ->label('URL Slug')
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->prefix('protein.tn/blog/'),
                                    ]),

                                Section::make('Éditeur Professionnel')
                                    ->description('Utilisez les titres H2-H4 pour structurer votre contenu pour le SEO.')
                                    ->schema([
                                        Forms\Components\ToggleButtons::make(ArticleDescriptionHtml::FIELD_EDITOR_MODE)
                                            ->label('Mode d\'édition')
                                            ->options([
                                                ArticleDescriptionHtml::MODE_VISUAL => 'Visuel',
                                                ArticleDescriptionHtml::MODE_HTML => 'Code HTML',
                                            ])
                                            ->icons([
                                                ArticleDescriptionHtml::MODE_VISUAL => 'heroicon-o-pencil',
                                                ArticleDescriptionHtml::MODE_HTML => 'heroicon-o-code-bracket',
                                            ])
                                            ->default(ArticleDescriptionHtml::MODE_VISUAL)
                                            ->live()
                                            ->inline(),

                                        Forms\Components\RichEditor::make('description')
                                            ->label('Corps de l\'article')
                                            ->visible(fn (Get $get) => ($get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) ?? ArticleDescriptionHtml::MODE_VISUAL) === ArticleDescriptionHtml::MODE_VISUAL)
                                            ->plugins([TextDirectionToolPlugin::make()])
                                            ->toolbarButtons([
                                                ['h2', 'h3', 'h4'],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                ['link', 'blockquote'],
                                                ['bulletList', 'orderedList', 'checkList'],
                                                ['table', 'attachFiles'],
                                                [TextDirectionToolPlugin::TOOL_AUTO, TextDirectionToolPlugin::TOOL_LTR, TextDirectionToolPlugin::TOOL_RTL],
                                                ['undo', 'redo'],
                                            ])
                                            ->fileAttachmentsDisk('public')
                                            ->fileAttachmentsDirectory('articles/content')
                                            ->columnSpanFull(),

                                        Forms\Components\Textarea::make(ArticleDescriptionHtml::FIELD_HTML_STAGING)
                                            ->label('Source HTML brute')
                                            ->visible(fn (Get $get) => $get(ArticleDescriptionHtml::FIELD_EDITOR_MODE) === ArticleDescriptionHtml::MODE_HTML)
                                            ->rows(20)
                                            ->extraInputAttributes(['class' => 'font-mono'])
                                            ->dehydrated(false) // Géré par mergeDescriptionEditorFormData
                                            ->columnSpanFull(),
                                    ]),
                            ]),

                        Tab::make('SEO & Médias')
                            ->icon('heroicon-o-magnifying-glass')
                            ->schema([
                                Grid::make(2)->schema([
                                    Section::make('Image de couverture')
                                        ->columnSpan(1)
                                        ->schema([
                                            Forms\Components\FileUpload::make('cover')
                                                ->image()
                                                ->directory('articles/covers')
                                                ->imageEditor()
                                                ->saveUploadedFileUsing(function ($file) {
                                                    $path = $file->store('articles/covers', 'public');
                                                    // Appel à votre service de conversion WebP
                                                    return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                                                }),
                                            Forms\Components\TextInput::make('alt_cover')
                                                ->label('Texte ALT (Image)')
                                                ->required(),
                                        ]),

                                    Section::make('Meta Tags')
                                        ->columnSpan(1)
                                        ->schema([
                                            Forms\Components\TextInput::make('meta_title')
                                                ->maxLength(60)
                                                ->hint(fn ($state) => strlen($state ?? '') . '/60'),
                                            Forms\Components\Textarea::make('meta_description_fr')
                                                ->maxLength(160)
                                                ->hint(fn ($state) => strlen($state ?? '') . '/160'),
                                        ]),
                                ]),
                            ]),

                        Tab::make('Paramètres')
                            ->icon('heroicon-o-cog-6-tooth')
                            ->schema([
                                Forms\Components\Select::make('blog_type')
                                    ->options(BlogArticleType::class)
                                    ->required(),
                                Forms\Components\Select::make('categories')
                                    ->relationship('categories', 'name')
                                    ->multiple()
                                    ->preload(),
                                Forms\Components\Toggle::make('publier')
                                    ->label('Publier immédiatement')
                                    ->default(false),
                            ]),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->disk('public')
                    ->circular(),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Titre')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Statut')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListArticles::route('/'),
            'create' => Pages\CreateArticle::route('/create'),
            'edit' => Pages\EditArticle::route('/{record}/edit'),
        ];
    }
}
