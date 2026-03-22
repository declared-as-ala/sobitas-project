<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\Article;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
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
        return $schema->schema([

            // ── Two-column grid: main content (left) + sidebar (right) ──
            Grid::make(['default' => 1, 'xl' => 3])
                ->schema([

                    // ══════════════════════════════════════════
                    // MAIN CONTENT — left, 2/3 width
                    // ══════════════════════════════════════════
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'xl' => 2])
                        ->schema([

                            // ── Titre & Slug ───────────────────────────
                            Section::make()
                                ->schema([
                                    Forms\Components\TextInput::make('designation_fr')
                                        ->label('Titre de l\'article')
                                        ->placeholder('Entrez le titre de votre article…')
                                        ->required()
                                        ->maxLength(255)
                                        ->columnSpanFull()
                                        ->live(onBlur: true)
                                        ->afterStateUpdated(function (string $operation, $state, Set $set, Get $get): void {
                                            if ($operation === 'create' || ($operation === 'edit' && empty($get('slug')))) {
                                                $set('slug', Str::slug($state));
                                            }
                                        }),

                                    Forms\Components\TextInput::make('slug')
                                        ->label('Slug (URL)')
                                        ->placeholder('titre-de-larticle')
                                        ->required()
                                        ->maxLength(255)
                                        ->unique(ignoreRecord: true)
                                        ->prefix('/')
                                        ->helperText('Généré automatiquement depuis le titre. Modifiable manuellement.')
                                        ->columnSpanFull(),
                                ]),

                            // ── Contenu principal ──────────────────────
                            Section::make('Contenu')
                                ->icon('heroicon-o-document-text')
                                ->schema([
                                    Forms\Components\RichEditor::make('description')
                                        ->label(false)
                                        ->columnSpanFull()
                                        // Filament v4: no "heading" button — use h2/h3; toolbar is grouped arrays
                                        ->toolbarButtons([
                                            ['bold', 'italic', 'underline', 'strike', 'link'],
                                            ['h2', 'h3'],
                                            ['bulletList', 'orderedList'],
                                            ['blockquote', 'codeBlock'],
                                            ['table', 'attachFiles'],
                                            ['undo', 'redo'],
                                        ])
                                        ->extraAttributes(['class' => 'article-editor']),
                                ]),

                            // ── SEO avancé ─────────────────────────────
                            Section::make('SEO avancé')
                                ->icon('heroicon-o-magnifying-glass')
                                ->collapsible()
                                ->collapsed()
                                ->schema([
                                    Forms\Components\TextInput::make('meta_description_fr')
                                        ->label('Meta Description')
                                        ->maxLength(500)
                                        ->placeholder('Description courte pour les moteurs de recherche…')
                                        ->helperText('Recommandé : 155–160 caractères.')
                                        ->columnSpanFull(),

                                    Forms\Components\Textarea::make('meta')
                                        ->label('Balises Meta (name;content/name;content/...)')
                                        ->rows(3)
                                        ->columnSpanFull()
                                        ->placeholder('keywords;seo,blog/author;sobitas')
                                        ->helperText('Chaque balise séparée par / — format: name;content'),

                                    Forms\Components\Textarea::make('content_seo')
                                        ->label('Schema JSON-LD (seo)')
                                        ->rows(5)
                                        ->columnSpanFull()
                                        ->placeholder('{"@context":"https://schema.org","@type":"Article","name":"…"}')
                                        ->helperText('Données structurées JSON-LD pour les moteurs de recherche.'),

                                    Forms\Components\TextInput::make('review')
                                        ->label('Review (seo)')
                                        ->maxLength(500)
                                        ->placeholder('Contenu de review structuré…'),

                                    Forms\Components\TextInput::make('aggregateRating')
                                        ->label('AggregateRating (seo)')
                                        ->maxLength(500)
                                        ->placeholder('{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"12"}'),
                                ])
                                ->columns(2),
                        ]),

                    // ══════════════════════════════════════════
                    // SIDEBAR — right, 1/3 width
                    // ══════════════════════════════════════════
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'xl' => 1])
                        ->schema([

                            // ── Publication ────────────────────────────
                            Section::make('Publication')
                                ->icon('heroicon-o-paper-airplane')
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label(fn (?bool $state): string => $state ? 'Publié' : 'Brouillon')
                                        ->live()
                                        ->helperText('Activez pour publier l\'article.')
                                        ->default(true)
                                        ->onColor('success')
                                        ->offColor('warning'),
                                ]),

                            // ── Image de couverture ────────────────────
                            Section::make('Image de couverture')
                                ->icon('heroicon-o-photo')
                                ->schema([
                                    Forms\Components\FileUpload::make('cover')
                                        ->label(false)
                                        ->disk('public')
                                        ->directory('articles')
                                        ->image()
                                        ->imageEditor()
                                        ->imageEditorAspectRatios([
                                            null,
                                            '16:9',
                                            '4:3',
                                            '1:1',
                                        ])
                                        ->maxSize(5120)
                                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                                        ->helperText('JPEG, PNG, WebP — max 5MB')
                                        ->columnSpanFull()
                                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                            $path = (string) $file->store('articles', 'public');
                                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                                        }),

                                    Forms\Components\TextInput::make('alt_cover')
                                        ->label('Texte alt (SEO)')
                                        ->maxLength(255)
                                        ->placeholder('Description de l\'image…'),

                                    Forms\Components\TextInput::make('description_cover')
                                        ->label('Légende')
                                        ->maxLength(255)
                                        ->placeholder('Légende de l\'image…'),
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
                    ->height(64)
                    ->width(64)
                    ->defaultImageUrl(function ($record) {
                        if (!$record->cover) {
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
                    ->limit(50),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Publié')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
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
