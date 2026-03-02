<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SlideResource\Pages;
use App\Models\Slide;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class SlideResource extends Resource
{
    protected static ?string $model = Slide::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-photo';
    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';
    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            FileUpload::make('image')
                ->label('Image')
                ->disk('public')
                ->directory('slides')
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
                    if ($record && $record->image && $state && $state !== $record->image) {
                        $oldPath = $record->image;
                        if (Storage::disk('public')->exists($oldPath)) {
                            Storage::disk('public')->delete($oldPath);
                        }
                    }
                }),
            Forms\Components\TextInput::make('titre')->label('Titre')->maxLength(255),
            Forms\Components\TextInput::make('lien')->label('Lien')->maxLength(500),
            Forms\Components\Select::make('type')
                ->options(['web' => 'Web', 'mobile' => 'Mobile'])
                ->default('web'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')
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
                Tables\Columns\TextColumn::make('titre')
                    ->label('Titre')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'web' => 'success',
                        'mobile' => 'info',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('lien')
                    ->label('Lien')
                    ->limit(30)
                    ->copyable()
                    ->copyMessage('Lien copié!')
                    ->toggleable(),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make()
                    ->before(function (Slide $record) {
                        // Delete image file when deleting the record
                        if ($record->image && Storage::disk('public')->exists($record->image)) {
                            Storage::disk('public')->delete($record->image);
                        }
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make()
                    ->before(function ($records) {
                        // Delete image files when bulk deleting
                        foreach ($records as $record) {
                            if ($record->image && Storage::disk('public')->exists($record->image)) {
                                Storage::disk('public')->delete($record->image);
                            }
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageSlides::route('/'),
        ];
    }
}

