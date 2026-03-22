<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\Article;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
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

            // ── Section 1: Informations générales ────────────────────────
            Section::make('Informations générales')
                ->schema([
                    Forms\Components\TextInput::make('designation_fr')
                        ->label('Désignation / Titre')
                        ->required()
                        ->maxLength(255)
                        ->columnSpanFull()
                        ->live(onBlur: true)
                        ->afterStateUpdated(function (string $operation, $state, Forms\Set $set, Forms\Get $get): void {
                            // Auto-generate slug on create, or on edit only if slug is empty
                            if ($operation === 'create' || ($operation === 'edit' && empty($get('slug')))) {
                                $set('slug', Str::slug($state));
                            }
                        }),

                    Forms\Components\TextInput::make('slug')
                        ->label('Slug (URL)')
                        ->required()
                        ->maxLength(255)
                        ->unique(ignoreRecord: true)
                        ->helperText('Généré automatiquement depuis le titre. Modifiable manuellement.')
                        ->rules(['regex:/^[a-z0-9\-]+$/'])
                        ->validationMessages(['regex' => 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.']),

                    Forms\Components\Toggle::make('publier')
                        ->label('Publier')
                        ->onLabel('Publier')
                        ->offLabel('Non publier')
                        ->default(true),
                ])
                ->columns(2),

            // ── Section 2: Image de couverture ───────────────────────────
            Section::make('Couverture')
                ->schema([
                    Forms\Components\FileUpload::make('cover')
                        ->label('Image de couverture')
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
                        ->helperText('Formats acceptés: JPEG, PNG, WebP. Taille max: 5MB')
                        ->columnSpanFull()
                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                            $path = (string) $file->store('articles', 'public');
                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                        }),

                    Forms\Components\TextInput::make('alt_cover')
                        ->label('Alt Cover (SEO)')
                        ->maxLength(255)
                        ->helperText('Texte alternatif de l\'image pour l\'accessibilité et le référencement.'),

                    Forms\Components\TextInput::make('description_cover')
                        ->label('Description Cover (SEO)')
                        ->maxLength(255)
                        ->helperText('Légende ou description de l\'image de couverture.'),
                ])
                ->columns(2),

            // ── Section 3: Contenu ────────────────────────────────────────
            Section::make('Description / Contenu')
                ->schema([
                    Forms\Components\RichEditor::make('description')
                        ->label('Description')
                        ->columnSpanFull()
                        ->toolbarButtons([
                            'heading',
                            'bold',
                            'italic',
                            'underline',
                            'strike',
                            'link',
                            'bulletList',
                            'orderedList',
                            'blockquote',
                            'codeBlock',
                            'table',
                            'attachFiles',
                            'undo',
                            'redo',
                        ])
                        ->extraInputAttributes(['style' => 'min-height: 500px;']),
                ]),

            // ── Section 4: SEO & Métadonnées ─────────────────────────────
            Section::make('SEO & Métadonnées')
                ->schema([
                    Forms\Components\TextInput::make('meta_description_fr')
                        ->label('Meta Description')
                        ->maxLength(500)
                        ->helperText('Description affichée dans les résultats de recherche (160 caractères recommandés).')
                        ->columnSpanFull(),

                    Forms\Components\Textarea::make('meta')
                        ->label('Meta (name;content/name;content/...)')
                        ->rows(4)
                        ->columnSpanFull()
                        ->helperText('Format: name;content séparés par / — ex: keywords;seo,filament/author;sobitas'),

                    Forms\Components\Textarea::make('content_seo')
                        ->label('Schema description (seo)')
                        ->rows(5)
                        ->columnSpanFull()
                        ->helperText('Balisage JSON-LD ou description structurée pour les moteurs de recherche.'),

                    Forms\Components\TextInput::make('review')
                        ->label('Review (seo)')
                        ->maxLength(500)
                        ->helperText('Contenu de review pour le schéma structuré SEO.'),

                    Forms\Components\TextInput::make('aggregateRating')
                        ->label('AggregateRating (seo)')
                        ->maxLength(500)
                        ->helperText('Données JSON de notation agrégée pour le schéma structuré SEO.')
                        ->placeholder('{"@type":"AggregateRating","ratingValue":"4.5","reviewCount":"12"}'),
                ])
                ->columns(2)
                ->collapsible()
                ->collapsed(),
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
