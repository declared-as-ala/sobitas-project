<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategResource\Pages;
use App\Models\Categ;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class CategResource extends Resource
{
    protected static ?string $model = Categ::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-squares-2x2';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'Catégorie';

    protected static ?string $pluralModelLabel = 'Catégories';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('designation_fr')
                ->label('Désignation')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('slug')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            FileUpload::make('cover')
                ->label('Image')
                ->disk('public')
                ->directory('categories')
                ->image()
                ->imageEditor()
                ->imagePreviewHeight('250')
                ->imageEditorAspectRatios([
                    null,
                    '16:9',
                    '4:3',
                    '1:1',
                ])
                ->visibility('public')
                ->preserveFilenames(false)
                ->maxSize(4096)
                ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                ->helperText('Formats acceptés: JPEG, PNG, WebP, GIF. Taille max: 4MB')
                ->deletable(true)
                ->downloadable(true)
                ->openable(true)
                ->loadingIndicatorPosition('left')
                ->removeUploadedFileButtonPosition('right')
                ->uploadButtonPosition('left')
                ->uploadProgressIndicatorPosition('left')
                ->afterStateUpdated(function ($state, $record, $set) {
                    // Delete old file when a new one is uploaded
                    if ($record && $record->cover && $state && $state !== $record->cover) {
                        $oldPath = $record->cover;
                        if (Storage::disk('public')->exists($oldPath)) {
                            Storage::disk('public')->delete($oldPath);
                        }
                    }
                }),
            Forms\Components\TextInput::make('meta_title')
                ->label('Meta Title')
                ->maxLength(255),
            Forms\Components\TextInput::make('meta_description')
                ->label('Meta Description')
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->size(80)
                    ->height(60)
                    ->width(80)
                    ->circular(false)
                    ->square()
                    ->defaultImageUrl(asset('placeholder.svg'))
                    ->extraAttributes([
                        'class' => 'rounded-lg object-cover',
                    ]),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('sousCategories_count')
                    ->counts('sousCategories')
                    ->label('Sous-catégories')
                    ->sortable(),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make()
                    ->before(function (Categ $record) {
                        // Delete image file when deleting the record
                        if ($record->cover && Storage::disk('public')->exists($record->cover)) {
                            Storage::disk('public')->delete($record->cover);
                        }
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make()
                    ->before(function ($records) {
                        // Delete image files when bulk deleting
                        foreach ($records as $record) {
                            if ($record->cover && Storage::disk('public')->exists($record->cover)) {
                                Storage::disk('public')->delete($record->cover);
                            }
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCategs::route('/'),
            'create' => Pages\CreateCateg::route('/create'),
            'edit'   => Pages\EditCateg::route('/{record}/edit'),
        ];
    }
}

