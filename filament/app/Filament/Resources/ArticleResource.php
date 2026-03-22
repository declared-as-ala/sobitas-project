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
        return $schema
            ->columns(['default' => 1, 'lg' => 3])
            ->schema([

                // ══════════════════════════════════════════════════════════════
                // LEFT COLUMN (2/3) — Title + Slug
                // ══════════════════════════════════════════════════════════════
                Section::make('Identification')
                    ->columnSpan(['default' => 1, 'lg' => 2])
                    ->schema([
                        Forms\Components\TextInput::make('designation_fr')
                            ->label('Titre de l\'article')
                            ->placeholder('Donnez un titre accrocheur…')
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
                            ->helperText('Généré automatiquement depuis le titre — modifiable manuellement.')
                            ->rules(['regex:/^[a-z0-9\-]+$/'])
                            ->validationMessages(['regex' => 'Lettres minuscules, chiffres et tirets uniquement.'])
                            ->columnSpanFull(),
                    ]),

                // ══════════════════════════════════════════════════════════════
                // RIGHT COLUMN (1/3) — Publication status
                // ══════════════════════════════════════════════════════════════
                Section::make('Publication')
                    ->icon('heroicon-o-signal')
                    ->columnSpan(1)
                    ->schema([
                        Forms\Components\Toggle::make('publier')
                            ->label('Publier cet article')
                            ->default(true)
                            ->onColor('success')
                            ->offColor('gray')
                            ->helperText('Désactivez pour enregistrer comme brouillon.'),
                    ]),

                // ══════════════════════════════════════════════════════════════
                // LEFT COLUMN (2/3) — Content editor (dominant workspace)
                // ══════════════════════════════════════════════════════════════
                Section::make('Contenu')
                    ->icon('heroicon-o-pencil-square')
                    ->columnSpan(['default' => 1, 'lg' => 2])
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

                // ══════════════════════════════════════════════════════════════
                // RIGHT COLUMN (1/3) — Cover image sidebar
                // ══════════════════════════════════════════════════════════════
                Section::make('Image de couverture')
                    ->icon('heroicon-o-photo')
                    ->columnSpan(1)
                    ->schema([
                        Forms\Components\FileUpload::make('cover')
                            ->label(false)
                            ->disk('public')
                            ->directory('articles')
                            ->image()
                            ->imageEditor()
                            ->imageEditorAspectRatios([null, '16:9', '4:3', '1:1'])
                            ->maxSize(5120)
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                            ->helperText('JPEG · PNG · WebP — max 5 Mo')
                            ->columnSpanFull()
                            ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                $path = (string) $file->store('articles', 'public');
                                return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                            }),

                        Forms\Components\TextInput::make('alt_cover')
                            ->label('Texte alternatif (alt)')
                            ->maxLength(255)
                            ->placeholder('Ex: Protéine whey chocolat 1kg')
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('description_cover')
                            ->label('Légende')
                            ->maxLength(255)
                            ->placeholder('Légende affichée sous l\'image')
                            ->columnSpanFull(),
                    ]),

                // ══════════════════════════════════════════════════════════════
                // BOTTOM FULL WIDTH — SEO (collapsible)
                // ══════════════════════════════════════════════════════════════
                Section::make('SEO & Métadonnées')
                    ->icon('heroicon-o-magnifying-glass')
                    ->collapsible()
                    ->columnSpan(['default' => 1, 'lg' => 3])
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                Forms\Components\TextInput::make('meta_title')
                                    ->label('Titre SEO (meta title)')
                                    ->maxLength(255)
                                    ->placeholder('Titre dans les résultats Google…')
                                    ->helperText('60 caractères recommandés.'),

                                Forms\Components\TextInput::make('meta_description_fr')
                                    ->label('Meta description')
                                    ->maxLength(500)
                                    ->placeholder('Description affichée dans Google…')
                                    ->helperText('155–160 caractères recommandés.'),
                            ]),

                        Section::make('Données structurées (JSON-LD)')
                            ->collapsible()
                            ->collapsed()
                            ->schema([
                                Forms\Components\Textarea::make('meta')
                                    ->label('Balises meta personnalisées (name;content / …)')
                                    ->placeholder('keywords;nutrition,sport / author;Sobitas')
                                    ->rows(3)
                                    ->columnSpanFull(),

                                Forms\Components\Textarea::make('content_seo')
                                    ->label('Schema JSON-LD')
                                    ->placeholder('{"@context":"https://schema.org","@type":"Article"}')
                                    ->rows(5)
                                    ->columnSpanFull(),

                                Grid::make(2)
                                    ->schema([
                                        Forms\Components\TextInput::make('review')
                                            ->label('Review (seo)')
                                            ->maxLength(500),

                                        Forms\Components\TextInput::make('aggregateRating')
                                            ->label('AggregateRating (seo)')
                                            ->maxLength(500)
                                            ->placeholder('{"@type":"AggregateRating","ratingValue":"4.8"}'),
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
