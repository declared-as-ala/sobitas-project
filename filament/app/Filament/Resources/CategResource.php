<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategResource\Pages;
use App\Filament\Support\CategorySeoForm;
use App\Filament\Support\ImagePath;
use App\Models\Categ;
use App\Support\PublicSlug;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
        return $schema
            ->columns(1)
            ->schema([
                Tabs::make('categ_tabs')
                    ->persistTabInQueryString()
                    ->columnSpanFull()
                    ->tabs([
                        Tab::make('Général')
                            ->icon('heroicon-o-pencil-square')
                            ->schema([
                                Forms\Components\Hidden::make('_slug_auto_source')
                                    ->dehydrated(false),
                                Section::make('Identification')
                                    ->schema([
                                        Grid::make(2)->schema([
                                            Forms\Components\TextInput::make('designation_fr')
                                                ->label('Désignation')
                                                ->required()
                                                ->maxLength(255)
                                                ->live(debounce: 400)
                                                ->afterStateUpdated(function ($state, Set $set, Get $get): void {
                                                    $des = (string) ($state ?? '');
                                                    $newSlug = Str::slug($des);
                                                    $slug = (string) ($get('slug') ?? '');
                                                    $syncFrom = (string) ($get('_slug_auto_source') ?? '');
                                                    $expected = Str::slug($syncFrom);
                                                    if ($slug === '' || $slug === $expected) {
                                                        $set('slug', $newSlug);
                                                    }
                                                    $set('_slug_auto_source', $des);
                                                }),
                                            Forms\Components\TextInput::make('slug')
                                                ->label('Slug')
                                                ->required()
                                                ->maxLength(255)
                                                ->unique(ignoreRecord: true)
                                                ->rule(function (?Categ $record): \Closure {
                                                    return function (string $attribute, mixed $value, \Closure $fail) use ($record): void {
                                                        $conflicts = PublicSlug::conflictsForCategorySlug((string) $value, $record?->getKey());

                                                        if ($conflicts !== []) {
                                                            $fail('Ce slug public est deja utilise par: ' . implode(', ', $conflicts) . '. Choisissez un slug unique.');
                                                        }
                                                    };
                                                })
                                                ->helperText('Utilisé dans les URLs — lettres minuscules, chiffres et tirets uniquement.'),
                                        ]),
                                    ]),
                                Section::make('Image')
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
                                            ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                                $path = $file->store('categories', 'public');
                                                if (! $path) {
                                                    $ext = $file->getClientOriginalExtension() ?: 'jpg';
                                                    $path = $file->storeAs('categories', Str::uuid().'.'.$ext, 'public');
                                                }

                                                return (new \App\Services\Media\ConvertUploadedImageToWebp)->convertStoredPathToWebp((string) $path) ?? (string) $path;
                                            }),
                                    ]),
                            ]),
                        Tab::make('SEO')
                            ->icon('heroicon-o-magnifying-glass')
                            ->schema(CategorySeoForm::seoSections(false)),
                    ])
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->cover))
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
                            \Log::info('media.manual_delete', [
                                'context' => 'categ.delete',
                                'disk' => 'public',
                                'path' => $path,
                                'record_id' => $record->id,
                            ]);
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
                                \Log::info('media.manual_delete', [
                                    'context' => 'categ.bulk_delete',
                                    'disk' => 'public',
                                    'path' => $path,
                                    'record_id' => $record->id,
                                ]);
                            }
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategs::route('/'),
            'create' => Pages\CreateCateg::route('/create'),
            'edit' => Pages\EditCateg::route('/{record}/edit'),
        ];
    }
}
