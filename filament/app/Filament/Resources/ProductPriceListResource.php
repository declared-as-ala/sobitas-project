<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductPriceListResource\Pages;
use App\Models\ProductPriceList;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProductPriceListResource extends Resource
{
    protected static ?string $model = ProductPriceList::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static string|\UnitEnum|null $navigationGroup = 'Facturation & Tickets';

    protected static ?string $navigationLabel = 'Listes de Prix';

    protected static ?string $modelLabel = 'Liste de Prix';

    protected static ?string $pluralModelLabel = 'Listes de Prix';

    protected static ?int $navigationSort = 5;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->schema([
            Forms\Components\ViewField::make('custom_lp_view')
                ->hiddenLabel()
                ->view('filament.pages.create-liste-prix')
                ->columnSpanFull(),

            // Hidden fields populated by the custom blade view on save
            Forms\Components\Hidden::make('designation'),
            Forms\Components\Hidden::make('details'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount('details'))
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('#')
                    ->sortable(),
                Tables\Columns\TextColumn::make('designation')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('details_count')
                    ->label('Nb Produits')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->striped()
            ->actions([
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('warning')
                    ->url(fn (ProductPriceList $record): string => route('product-price-lists.print', $record->id))
                    ->openUrlInNewTab(),
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        // Products are managed inline via the Repeater — no RelationManager needed
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProductPriceLists::route('/'),
            'create' => Pages\CreateProductPriceList::route('/create'),
            'edit'   => Pages\EditProductPriceList::route('/{record}/edit'),
        ];
    }
}
