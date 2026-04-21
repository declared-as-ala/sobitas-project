<?php

namespace App\Filament\Resources;

use App\Brand;
use App\Filament\Resources\BrandResource\Pages;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class BrandResource extends BaseResource
{
    protected static ?string $model = Brand::class;

    protected static ?string $navigationIcon = 'heroicon-o-sparkles';

    protected static ?string $permissionSlug = 'brands';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('designation_fr')
                    ->label('Name (FR)')
                    ->required()
                    ->maxLength(255),
                Forms\Components\FileUpload::make('logo')
                    ->disk('public')
                    ->directory('brands')
                    ->image()
                    ->imagePreviewHeight(80),
                Forms\Components\Textarea::make('description_fr')
                    ->label('Description (FR)')
                    ->rows(4),
                Forms\Components\TextInput::make('alt_cover')
                    ->label('Alt Cover')
                    ->maxLength(255),
                Forms\Components\Textarea::make('description_cover')
                    ->label('Cover Description')
                    ->rows(2),
                Forms\Components\Textarea::make('meta')
                    ->label('Meta')
                    ->rows(3),
            ])
            ->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\ImageColumn::make('logo')
                    ->disk('public')
                    ->height(36)
                    ->width(36),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Name (FR)')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Brand'),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBrands::route('/'),
        ];
    }
}
