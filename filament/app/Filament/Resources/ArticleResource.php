<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\Article;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class ArticleResource extends Resource
{
    protected static ?string $model = Article::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-newspaper';

    protected static string | \UnitEnum | null $navigationGroup = 'Blog';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('designation_fr')
                ->label('Titre')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('slug')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            Forms\Components\FileUpload::make('cover')
                ->label('Image de couverture')
                ->disk('cloudinary')
                ->directory('articles')
                ->image()
                ->imageEditor()
                ->imageEditorAspectRatios([
                    null,
                    '16:9',
                    '4:3',
                    '1:1',
                ])
                ->maxSize(5120) // 5MB
                ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                ->helperText('Formats acceptés: JPEG, PNG, WebP. Taille max: 5MB')
                ->columnSpanFull(),
            Forms\Components\RichEditor::make('description_fr')
                ->label('Contenu')
                ->columnSpanFull(),
            Forms\Components\Toggle::make('publier')
                ->label('Publié')
                ->default(true),
            Forms\Components\TextInput::make('meta_title')
                ->maxLength(255),
            Forms\Components\TextInput::make('meta_description')
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->circular()
                    ->defaultImageUrl(function ($record) {
                        // Handle Cloudinary URLs
                        if (!$record->cover) {
                            return null;
                        }
                        
                        // If already full URL, return as-is
                        if (str_starts_with($record->cover, 'http://') || str_starts_with($record->cover, 'https://')) {
                            return $record->cover;
                        }
                        
                        // If Cloudinary public_id, construct URL
                        $cloudName = config('cloudinary.cloud_name');
                        if ($cloudName && !str_contains($record->cover, '/')) {
                            return "https://res.cloudinary.com/{$cloudName}/image/upload/w_100,h_100,c_fill/{$record->cover}";
                        }
                        
                        // Fallback: local storage
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

