<?php

namespace App\Filament\Resources;

use App\DetailsProductPriceList;
use App\Filament\Components\Actions\PrintAction;
use App\Filament\Resources\ProductPriceListResource\Pages;
use App\Product;
use App\ProductPriceList;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class ProductPriceListResource extends BaseResource
{
    protected static ?string $model = ProductPriceList::class;

    protected static ?string $navigationIcon = 'heroicon-o-currency-dollar';

    protected static ?string $permissionSlug = 'product_price_lists';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('designation')
                    ->label('Designation')
                    ->required()
                    ->maxLength(255),
                Forms\Components\Repeater::make('details')
                    ->relationship('details')
                    ->schema([
                        Forms\Components\Select::make('product_id')
                            ->label('Product')
                            ->options(Product::query()->orderBy('designation_fr')->pluck('designation_fr', 'id'))
                            ->searchable()
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(function ($state, callable $set) {
                                $price = Product::find($state)?->prix;
                                if ($price !== null) {
                                    $set('prix_unitaire', $price);
                                }
                            }),
                        Forms\Components\TextInput::make('prix_unitaire')
                            ->label('Prix Unitaire')
                            ->numeric()
                            ->required(),
                        Forms\Components\TextInput::make('prix_gros')
                            ->label('Prix Gros')
                            ->numeric(),
                    ])
                    ->columns(3)
                    ->defaultItems(1)
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('designation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('details_count')
                    ->label('Products Count')
                    ->counts('details')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Product Price List'),
                PrintAction::make('voyager.pricelists.print', 'id'),
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
            'index' => Pages\ListProductPriceLists::route('/'),
        ];
    }

    protected static function getDefaultEagerLoads(): array
    {
        return ['details.product'];
    }
}
