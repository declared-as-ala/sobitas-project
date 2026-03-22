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

            // ── Titre + Slug (two columns, like reference) ─────────────
            Section::make()
                ->schema([
                    Grid::make(2)
                        ->schema([
                            Forms\Components\TextInput::make('designation_fr')
                                ->label('Titre')
                                ->placeholder('Titre de l\'article')
                                ->required()
                                ->maxLength(255)
                                ->live(onBlur: true)
                                ->afterStateUpdated(function (string $operation, $state, Set $set, Get $get): void {
                                    if ($operation === 'create' || ($operation === 'edit' && empty($get('slug')))) {
                                        $set('slug', Str::slug($state));
                                    }
                                }),

                            Forms\Components\TextInput::make('slug')
                                ->label('Slug')
                                ->placeholder('url-de-l-article')
                                ->required()
                                ->maxLength(255)
                                ->unique(ignoreRecord: true)
                                ->helperText('Généré depuis le titre — modifiable.')
                                ->rules(['regex:/^[a-z0-9\-]+$/'])
                                ->validationMessages(['regex' => 'Lettres minuscules, chiffres et tirets uniquement.']),
                        ]),
                ]),

            // ── Image de couverture ──────────────────────────────────────
            Section::make('Image de couverture')
                ->icon('heroicon-o-photo')
                ->schema([
                    Forms\Components\FileUpload::make('cover')
                        ->label('Image de couverture')
                        ->disk('public')
                        ->directory('articles')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios([null, '16:9', '4:3', '1:1'])
                        ->maxSize(5120)
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                        ->helperText('Formats acceptés : JPEG, PNG, WebP. Taille max : 5 Mo.')
                        ->columnSpanFull()
                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                            $path = (string) $file->store('articles', 'public');

                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                        }),

                    Grid::make(2)
                        ->schema([
                            Forms\Components\TextInput::make('alt_cover')
                                ->label('Texte alt (SEO)')
                                ->maxLength(255)
                                ->placeholder('Description de l\'image'),

                            Forms\Components\TextInput::make('description_cover')
                                ->label('Légende')
                                ->maxLength(255)
                                ->placeholder('Légende sous l\'image'),
                        ]),
                ]),

            // ── Contenu (full-width editor) ──────────────────────────────
            Section::make('Contenu')
                ->icon('heroicon-o-document-text')
                ->schema([
                    Forms\Components\RichEditor::make('description')
                        ->label('Contenu')
                        ->columnSpanFull()
                        ->toolbarButtons([
                            ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'link'],
                            ['h2', 'h3'],
                            ['alignStart', 'alignCenter', 'alignEnd'],
                            ['blockquote', 'codeBlock', 'bulletList', 'orderedList'],
                            ['table', 'attachFiles'],
                            ['undo', 'redo'],
                        ]),
                ]),

            // ── Publié + Meta title (two columns) ────────────────────
            Section::make()
                ->schema([
                    Grid::make(2)
                        ->schema([
                            Forms\Components\Toggle::make('publier')
                                ->label('Publié')
                                ->default(true)
                                ->onColor('primary')
                                ->offColor('gray')
                                ->helperText('Désactivé = brouillon.'),

                            Forms\Components\TextInput::make('meta_title')
                                ->label('Meta title')
                                ->maxLength(255)
                                ->placeholder('Titre pour les moteurs de recherche (optionnel)')
                                ->helperText('Si vide, le titre de l\'article peut être utilisé côté site.'),
                        ]),
                ]),

            Section::make()
                ->schema([
                    Forms\Components\Textarea::make('meta_description_fr')
                        ->label('Meta description')
                        ->placeholder('Résumé affiché dans Google (≈ 155–160 caractères)')
                        ->maxLength(500)
                        ->rows(3)
                        ->columnSpanFull(),
                ]),

            // ── SEO avancé (collapsed) ─────────────────────────────────
            Section::make('SEO avancé')
                ->icon('heroicon-o-magnifying-glass')
                ->collapsible()
                ->collapsed()
                ->schema([
                    Forms\Components\Textarea::make('meta')
                        ->label('Balises meta (name;content / …)')
                        ->placeholder('keywords;nutrition / author;Sobitas')
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
