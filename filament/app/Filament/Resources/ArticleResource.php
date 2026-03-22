<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\Article;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Grid;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

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
            Section::make('Informations générales')
                ->schema([
                    Forms\Components\TextInput::make('designation_fr')
                        ->label('Titre')
                        ->required()
                        ->maxLength(255)
                        ->columnSpanFull(),
                    Forms\Components\TextInput::make('slug')
                        ->label('Slug (URL)')
                        ->required()
                        ->maxLength(255)
                        ->unique(ignoreRecord: true)
                        ->helperText('Identifiant unique dans l\'URL (ex: mon-article)'),
                    Forms\Components\Toggle::make('publier')
                        ->label('Publié')
                        ->default(true),
                ])
                ->columns(2),

            Section::make('Image de couverture')
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
                        ->label('Texte alternatif (alt)')
                        ->maxLength(255)
                        ->helperText('Description de l\'image pour l\'accessibilité et le SEO'),
                    Forms\Components\TextInput::make('description_cover')
                        ->label('Légende de l\'image')
                        ->maxLength(255)
                        ->helperText('Légende affichée sous l\'image'),
                ])
                ->columns(2),

            Section::make('Contenu')
                ->schema([
                    Forms\Components\RichEditor::make('description_fr')
                        ->label('Contenu de l\'article')
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

            Section::make('SEO & Métadonnées')
                ->schema([
                    Forms\Components\TextInput::make('meta_title')
                        ->label('Titre SEO (meta title)')
                        ->maxLength(255)
                        ->helperText('Titre affiché dans les résultats de recherche (60 caractères recommandés)'),
                    Forms\Components\TextInput::make('meta_description')
                        ->label('Description SEO (meta description)')
                        ->maxLength(255)
                        ->helperText('Description affichée dans les résultats de recherche (160 caractères recommandés)'),
                    Forms\Components\TextInput::make('meta_description_fr')
                        ->label('Description meta (FR)')
                        ->maxLength(255),
                    Forms\Components\Textarea::make('content_seo')
                        ->label('Contenu SEO')
                        ->rows(4)
                        ->columnSpanFull()
                        ->helperText('Contenu optimisé SEO (non visible sur la page)'),
                ])
                ->columns(2)
                ->collapsible()
                ->collapsed(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // ✅ OPTIMIZATION: Select only needed columns to reduce memory and DB time
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
                        
                        // If already full URL, return as-is
                        if (str_starts_with($record->cover, 'http://') || str_starts_with($record->cover, 'https://')) {
                            return $record->cover;
                        }
                        
                        // Local storage
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

