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

            // ═══════════════════════════════════════════════════════════════
            // 5-column grid: main = 3 cols, sidebar = 2 cols
            // Gives sidebar enough room for image upload and fields
            // ═══════════════════════════════════════════════════════════════
            Grid::make(['default' => 1, 'lg' => 5])
                ->schema([

                    // ───────────────────────────────────────────────────────
                    // MAIN CONTENT — left 3 columns
                    // ───────────────────────────────────────────────────────
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'lg' => 3])
                        ->schema([

                            // ── Titre & Slug ──────────────────────────────
                            Section::make()
                                ->schema([
                                    Forms\Components\TextInput::make('designation_fr')
                                        ->label('Titre')
                                        ->placeholder('Donnez un titre accrocheur à votre article…')
                                        ->required()
                                        ->maxLength(255)
                                        ->columnSpanFull()
                                        ->extraInputAttributes([
                                            'style' => 'font-size: 1.25rem; font-weight: 600; padding: 0.75rem 1rem;',
                                        ])
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
                                        ->helperText('Généré depuis le titre · Modifiable manuellement')
                                        ->columnSpanFull(),
                                ])
                                ->extraAttributes(['style' => 'padding-bottom: 0;']),

                            // ── Éditeur de contenu ────────────────────────
                            Section::make('Contenu de l\'article')
                                ->icon('heroicon-o-document-text')
                                ->description('Rédigez le contenu principal de votre article.')
                                ->schema([
                                    Forms\Components\RichEditor::make('description')
                                        ->label(false)
                                        ->columnSpanFull()
                                        ->toolbarButtons([
                                            ['bold', 'italic', 'underline', 'strike', 'link'],
                                            ['h2', 'h3'],
                                            ['bulletList', 'orderedList'],
                                            ['blockquote', 'codeBlock'],
                                            ['table', 'attachFiles'],
                                            ['undo', 'redo'],
                                        ])
                                        ->extraInputAttributes([
                                            'style' => 'min-height: 420px; font-size: 0.95rem; line-height: 1.7;',
                                        ]),
                                ]),

                            // ── SEO avancé ────────────────────────────────
                            Section::make('SEO & Référencement')
                                ->icon('heroicon-o-magnifying-glass')
                                ->description('Métadonnées et données structurées pour les moteurs de recherche.')
                                ->collapsible()
                                ->collapsed()
                                ->schema([
                                    Forms\Components\TextInput::make('meta_description_fr')
                                        ->label('Meta description')
                                        ->maxLength(500)
                                        ->placeholder('Courte description affichée dans les résultats Google…')
                                        ->helperText('Idéalement 155–160 caractères.')
                                        ->columnSpanFull(),

                                    Forms\Components\Textarea::make('meta')
                                        ->label('Balises meta personnalisées')
                                        ->rows(3)
                                        ->columnSpanFull()
                                        ->placeholder('keywords;sport,nutrition/author;Sobitas')
                                        ->helperText('Format : name;content — une balise par ligne, séparées par /'),

                                    Forms\Components\Textarea::make('content_seo')
                                        ->label('Schema JSON-LD')
                                        ->rows(6)
                                        ->columnSpanFull()
                                        ->placeholder('{"@context":"https://schema.org","@type":"Article","name":"…"}')
                                        ->helperText('Données structurées injectées dans <head> pour Google Rich Results.'),

                                    Forms\Components\TextInput::make('review')
                                        ->label('Review (seo)')
                                        ->maxLength(500)
                                        ->placeholder('Texte de review structuré…'),

                                    Forms\Components\TextInput::make('aggregateRating')
                                        ->label('AggregateRating (seo)')
                                        ->maxLength(500)
                                        ->placeholder('{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"24"}'),
                                ])
                                ->columns(2),
                        ]),

                    // ───────────────────────────────────────────────────────
                    // SIDEBAR — right 2 columns
                    // ───────────────────────────────────────────────────────
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'lg' => 2])
                        ->schema([

                            // ── Statut de publication ─────────────────────
                            Section::make('Statut')
                                ->icon('heroicon-o-signal')
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label(fn (?bool $state): string => $state ? 'Publié — visible sur le site' : 'Brouillon — non visible')
                                        ->live()
                                        ->default(true)
                                        ->onColor('success')
                                        ->offColor('gray'),
                                ]),

                            // ── Image de couverture ───────────────────────
                            Section::make('Image de couverture')
                                ->icon('heroicon-o-photo')
                                ->description('Image principale affichée en haut de l\'article.')
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
                                        ->helperText('JPEG · PNG · WebP — max 5 MB')
                                        ->columnSpanFull()
                                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                            $path = (string) $file->store('articles', 'public');
                                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                                        }),

                                    Forms\Components\TextInput::make('alt_cover')
                                        ->label('Texte alternatif (alt)')
                                        ->maxLength(255)
                                        ->placeholder('Ex: Protéine whey chocolat 1kg')
                                        ->helperText('Décrit l\'image pour l\'accessibilité et le SEO.'),

                                    Forms\Components\TextInput::make('description_cover')
                                        ->label('Légende de l\'image')
                                        ->maxLength(255)
                                        ->placeholder('Ex: Photo du produit phare…')
                                        ->helperText('Légende affichée sous l\'image sur le site.'),
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
