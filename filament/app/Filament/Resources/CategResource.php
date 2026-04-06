<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategResource\Pages;
use App\Filament\Support\ImagePath;
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
        return $schema->columns(1)->schema([
            \Filament\Schemas\Components\Section::make('Identification')
                ->schema([
                    Forms\Components\TextInput::make('designation_fr')
                        ->label('Désignation')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('slug')
                        ->label('Slug')
                        ->required()
                        ->maxLength(255)
                        ->unique(ignoreRecord: true)
                        ->helperText('Utilisé dans les URLs — lettres minuscules, chiffres et tirets uniquement.'),
                ]),

            \Filament\Schemas\Components\Section::make('Image')
                ->schema([
                    FileUpload::make('cover')
                        ->label('Image de couverture')
                        ->disk('public')
                        ->directory('categories')
                        ->image()
                        ->imageEditor()
                        ->imagePreviewHeight('250')
                        ->imageEditorAspectRatios([null, '16:9', '4:3', '1:1'])
                        ->visibility('public')
                        ->preserveFilenames(false)
                        ->maxSize(4096)
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                        ->helperText('Formats acceptés : JPEG, PNG, WebP, GIF — Max 4 Mo')
                        ->columnSpanFull()
                        ->afterStateHydrated(function ($component, $state): void {
                            $component->state(\App\Filament\Support\ImagePath::normalize($state));
                        })
                        ->afterStateUpdated(function ($state, $record): void {
                            if ($record && $record->cover && $state && $state !== $record->cover) {
                                $old = \App\Filament\Support\ImagePath::normalize($record->cover);
                                if ($old && Storage::disk('public')->exists($old)) {
                                    Storage::disk('public')->delete($old);
                                }
                            }
                        })
                        ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                            $path = (string) $file->store('categories', 'public');
                            return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp($path) ?? $path;
                        }),
                ]),

            \Filament\Schemas\Components\Section::make('SEO')
                ->collapsed()
                ->schema([
                    Forms\Components\TextInput::make('meta_title')
                        ->label('Meta Title')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('meta_description')
                        ->label('Meta Description')
                        ->maxLength(255),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->getStateUsing(fn ($record) => ImagePath::normalize($record->cover))
                    ->disk('public')
                    ->size(80)
                    ->height(60)
                    ->width(80)
                    ->circular(false)
                    ->square()
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
                    ->before(function (Categ $record): void {
                        $path = \App\Filament\Support\ImagePath::normalize($record->cover);
                        if ($path && Storage::disk('public')->exists($path)) {
                            Storage::disk('public')->delete($path);
                        }
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make()
                    ->before(function ($records): void {
                        foreach ($records as $record) {
                            $path = \App\Filament\Support\ImagePath::normalize($record->cover);
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
            'index'  => Pages\ListCategs::route('/'),
            'create' => Pages\CreateCateg::route('/create'),
            'edit'   => Pages\EditCateg::route('/{record}/edit'),
        ];
    }
}

