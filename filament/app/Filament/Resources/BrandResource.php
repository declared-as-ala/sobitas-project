<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BrandResource\Pages;
use App\Filament\Support\ImagePath;
use App\Models\Brand;
use App\Support\PublicSlug;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Str;

class BrandResource extends Resource
{
    protected static ?string $model = Brand::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-building-storefront';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 4;

    protected static ?string $modelLabel = 'Marque';

    protected static ?string $pluralModelLabel = 'Marques';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('designation_fr')
                ->label('Nom')
                ->required()
                ->maxLength(255)
                ->rule(function (?Brand $record): \Closure {
                    return function (string $attribute, mixed $value, \Closure $fail) use ($record): void {
                        $slug = Str::slug((string) $value);
                        $conflicts = PublicSlug::conflictsForBrandSlug($slug, $record?->getKey());

                        if ($conflicts !== []) {
                            $fail('Le slug public /' . $slug . ' est deja utilise par: ' . implode(', ', $conflicts) . '. Modifiez le nom de la marque pour eviter un conflit URL.');
                        }
                    };
                }),

            Forms\Components\Placeholder::make('logo_preview')
                ->label('Logo actuel')
                ->content(function ($record): HtmlString|string {
                    $raw = $record?->logo;
                    if (empty($raw)) {
                        return 'Aucun logo enregistré.';
                    }
                    $path = ltrim(str_replace('\\', '/', trim((string) $raw)), '/');
                    if (str_starts_with($path, 'storage/')) {
                        $path = substr($path, 8);
                    }
                    if (! Storage::disk('public')->exists($path)) {
                        return 'Fichier introuvable : ' . $path;
                    }
                    $url = Storage::disk('public')->url($path);
                    return new HtmlString(
                        '<img src="' . e($url) . '" alt="Logo" style="max-height:100px;height:auto;width:auto;border-radius:6px;">'
                    );
                }),

            FileUpload::make('logo')
                ->label('Logo (uploader / remplacer)')
                ->disk('public')
                ->directory('brands')
                ->image()
                ->imageEditor()
                ->maxSize(2048)
                ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                    $path = $file->store('brands', 'public');
                    if (! $path) {
                        $ext  = $file->getClientOriginalExtension() ?: 'jpg';
                        $path = $file->storeAs('brands', \Illuminate\Support\Str::uuid() . '.' . $ext, 'public');
                    }
                    return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                }),

            Forms\Components\TextInput::make('alt_cover')
                ->label('Alt image')
                ->maxLength(255),
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
                Tables\Columns\ImageColumn::make('logo')
                    ->label('Logo')
                    ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->logo))
                    ->disk('public')
                    ->circular()
                    ->size(88),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Nom')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('products_count')
                    ->counts('products')
                    ->label('Produits'),
            ])
            ->actions([
                Actions\EditAction::make()->slideOver(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageBrands::route('/'),
        ];
    }
}

