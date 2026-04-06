<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SlideResource\Pages;
use App\Filament\Support\ImagePath;
use App\Models\Slide;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
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
    protected static ?string $modelLabel = 'Slide';
    protected static ?string $pluralModelLabel = 'Slides';

    public static function form(Schema $schema): Schema
    {
        return $schema->columns(1)->schema([
            Section::make('Image')
                ->schema([
                    FileUpload::make('image')
                        ->label('Couverture')
                        ->disk('public')
                        ->directory('slides')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios([null, '16:9', '21:9', '4:3', '1:1'])
                        ->imagePreviewHeight('280')
                        ->maxSize(4096)
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                        ->helperText('Formats acceptés : JPEG, PNG, WebP, GIF — Max 4 Mo')
                        ->deletable(true)
                        ->downloadable(false)
                        ->openable(false)
                        ->visibility('public')
                        ->preserveFilenames(false)
                        ->columnSpanFull()
                        ->afterStateHydrated(function ($component, $state): void {
                            $component->state(ImagePath::normalize($state));
                        })
                        ->afterStateUpdated(function ($state, $record): void {
                            if ($record && $record->image && $state && $state !== $record->image) {
                                $old = ImagePath::normalize($record->image);
                                if ($old && Storage::disk('public')->exists($old)) {
                                    Storage::disk('public')->delete($old);
                                }
                            }
                        })
                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                            $path = (string) $file->store('slides', 'public');
                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                        }),
                ]),

            Section::make('Informations')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('titre')
                            ->label('Titre')
                            ->maxLength(255)
                            ->placeholder('Titre du slide (optionnel)'),
                        Forms\Components\Select::make('type')
                            ->label('Affichage')
                            ->options(['web' => 'Web', 'mobile' => 'Mobile'])
                            ->default('web')
                            ->native(false),
                        Forms\Components\TextInput::make('lien')
                            ->label('Lien (URL)')
                            ->maxLength(500)
                            ->placeholder('https://...')
                            ->columnSpan(2),
                    ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')
                    ->label('Couverture')
                    ->getStateUsing(fn ($record) => ImagePath::normalize($record->image))
                    ->disk('public')
                    ->height(60)
                    ->width(120)
                    ->extraImgAttributes(['style' => 'object-fit:cover;border-radius:6px;']),
                Tables\Columns\TextColumn::make('titre')
                    ->label('Titre')
                    ->searchable()
                    ->sortable()
                    ->default('—'),
                Tables\Columns\TextColumn::make('type')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'web'    => 'success',
                        'mobile' => 'info',
                        default  => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('lien')
                    ->label('Lien')
                    ->limit(40)
                    ->copyable()
                    ->copyMessage('Lien copié !')
                    ->toggleable(),
            ])
            ->defaultSort('id', 'desc')
            ->actions([
                Actions\EditAction::make()->slideOver(),
                Actions\DeleteAction::make()
                    ->before(function (Slide $record): void {
                        $path = ImagePath::normalize($record->image);
                        if ($path && Storage::disk('public')->exists($path)) {
                            Storage::disk('public')->delete($path);
                        }
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make()
                    ->before(function ($records): void {
                        foreach ($records as $record) {
                            $path = ImagePath::normalize($record->image);
                            if ($path && Storage::disk('public')->exists($path)) {
                                Storage::disk('public')->delete($path);
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
