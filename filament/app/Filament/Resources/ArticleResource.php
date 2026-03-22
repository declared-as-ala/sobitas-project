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

            // ═══════════════════════════════════════════════════════════════════
            // Editorial layout — 3-column grid: main (2) + sidebar (1)
            // Main gets 66% of the page — editor dominates the workspace
            // Sidebar gets 33% — settings compact and out of the way
            // ═══════════════════════════════════════════════════════════════════
            Grid::make(['default' => 1, 'lg' => 3])
                ->schema([

                    // ══════════════════════════════════════════════════════════
                    // MAIN CONTENT — 2/3 width — the editorial workspace
                    // ══════════════════════════════════════════════════════════
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'lg' => 2])
                        ->schema([

                            // ── 1. Titre & Slug ───────────────────────────────
                            Section::make()
                                ->schema([
                                    Forms\Components\TextInput::make('designation_fr')
                                        ->label('Titre de l\'article')
                                        ->placeholder('Donnez un titre accrocheur à votre article…')
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
                                        ->label('Slug')
                                        ->placeholder('mon-article-de-blog')
                                        ->required()
                                        ->maxLength(255)
                                        ->unique(ignoreRecord: true)
                                        ->prefix('/')
                                        ->helperText('Auto-généré depuis le titre — modifiable manuellement')
                                        ->columnSpanFull(),
                                ]),

                            // ── 2. Éditeur de contenu ─────────────────────────
                            Section::make('Contenu')
                                ->icon('heroicon-o-pencil-square')
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

                            // ── 3. SEO (collapsed — non-blocking) ─────────────
                            Section::make('SEO & Référencement')
                                ->icon('heroicon-o-magnifying-glass')
                                ->collapsible()
                                ->collapsed()
                                ->schema([
                                    Forms\Components\TextInput::make('meta_description_fr')
                                        ->label('Meta description')
                                        ->placeholder('155–160 caractères affichés dans Google…')
                                        ->maxLength(500)
                                        ->columnSpanFull(),

                                    Forms\Components\Textarea::make('meta')
                                        ->label('Balises meta (name;content / name;content / …)')
                                        ->placeholder('keywords;nutrition,sport / author;Sobitas')
                                        ->rows(3)
                                        ->columnSpanFull(),

                                    Forms\Components\Textarea::make('content_seo')
                                        ->label('Schema JSON-LD')
                                        ->placeholder('{"@context":"https://schema.org","@type":"Article"}')
                                        ->rows(5)
                                        ->columnSpanFull(),

                                    Forms\Components\TextInput::make('review')
                                        ->label('Review (seo)')
                                        ->maxLength(500),

                                    Forms\Components\TextInput::make('aggregateRating')
                                        ->label('AggregateRating (seo)')
                                        ->maxLength(500)
                                        ->placeholder('{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"24"}'),
                                ])
                                ->columns(2),
                        ]),

                    // ══════════════════════════════════════════════════════════
                    // SIDEBAR — 1/3 width — settings, compact and out of the way
                    // ══════════════════════════════════════════════════════════
                    Grid::make(1)
                        ->columnSpan(['default' => 1, 'lg' => 1])
                        ->schema([

                            // ── A. Statut ──────────────────────────────────────
                            Section::make('Statut')
                                ->icon('heroicon-o-signal')
                                ->compact()
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label('Publier l\'article')
                                        ->default(true)
                                        ->onColor('success')
                                        ->offColor('gray')
                                        ->helperText('Désactivez pour passer en brouillon.'),
                                ]),

                            // ── B. Image de couverture ─────────────────────────
                            Section::make('Couverture')
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
                                        ->helperText('JPEG · PNG · WebP — max 5 MB')
                                        ->columnSpanFull()
                                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                            $path = (string) $file->store('articles', 'public');
                                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                                        }),

                                    Forms\Components\TextInput::make('alt_cover')
                                        ->label('Texte alt')
                                        ->maxLength(255)
                                        ->placeholder('Description de l\'image…'),

                                    Forms\Components\TextInput::make('description_cover')
                                        ->label('Légende')
                                        ->maxLength(255)
                                        ->placeholder('Légende sous l\'image…'),
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
                    ->limit(60),

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
