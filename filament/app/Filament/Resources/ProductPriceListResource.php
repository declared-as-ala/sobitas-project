<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductPriceListResource\Pages;
use App\Models\Product;
use App\Models\ProductPriceList;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
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
        return $schema->schema([

            // ── Header: designation ───────────────────────────────────────────
            Section::make('Informations')
                ->schema([
                    Forms\Components\TextInput::make('designation')
                        ->label('Désignation de la liste de prix')
                        ->placeholder('Ex : Prix Détail 2025')
                        ->required()
                        ->maxLength(255)
                        ->columnSpanFull(),
                ]),

            // ── Barcode scanner ───────────────────────────────────────────────
            Section::make('Scanner code à barre')
                ->schema([
                    Forms\Components\TextInput::make('_barcode')
                        ->label('Code barre')
                        ->placeholder('Scannez ou saisissez un code barre puis Entrée...')
                        ->dehydrated(false)
                        ->autocomplete('off')
                        ->extraInputAttributes([
                            // Alpine: on Enter key → call Livewire method, clear field, refocus
                            'x-on:keydown.enter.prevent' => "
                                const code = \$el.value.trim();
                                if (code) {
                                    \$wire.addProductByBarcode(code).then(() => {
                                        \$el.value = '';
                                        \$el.focus();
                                    });
                                }
                            ",
                        ]),
                ]),

            // ── Inline product rows (Repeater) ────────────────────────────────
            Section::make('Produits')
                ->schema([
                    Forms\Components\Repeater::make('details')
                        ->relationship(
                            'details',
                            fn (Builder $query) => $query->with('product:id,code_product,designation_fr')
                        )
                        ->label('')
                        ->schema([
                            // Product select
                            Forms\Components\Select::make('produit_id')
                                ->label('Produit')
                                ->relationship('product', 'designation_fr')
                                ->searchable()
                                ->preload(false)
                                ->required()
                                ->live()
                                ->afterStateUpdated(function ($state, callable $set) {
                                    if ($state) {
                                        $product = Product::select('id', 'prix', 'code_product')->find($state);
                                        if ($product) {
                                            $set('prix_unitaire', $product->prix ?? 0);
                                            $set('_code_barre', $product->code_product ?? '');
                                        }
                                    }
                                })
                                ->columnSpan(2),

                            // Code barre (display-only, loaded from relationship)
                            Forms\Components\TextInput::make('_code_barre')
                                ->label('Code Barre')
                                ->disabled()
                                ->dehydrated(false)
                                ->afterStateHydrated(function (Forms\Components\TextInput $component, $record) {
                                    if ($record) {
                                        $component->state($record->product?->code_product ?? '');
                                    }
                                }),

                            // Prix de gros
                            Forms\Components\TextInput::make('prix_gros')
                                ->label('Prix Gros')
                                ->numeric()
                                ->step(0.001)
                                ->minValue(0)
                                ->default(0),

                            // Prix unitaire
                            Forms\Components\TextInput::make('prix_unitaire')
                                ->label('Prix Unitaire')
                                ->numeric()
                                ->step(0.001)
                                ->minValue(0)
                                ->required()
                                ->default(0),
                        ])
                        ->columns(5)
                        ->columnSpanFull()
                        ->reorderable(false)
                        ->defaultItems(1)
                        ->addActionLabel('Ajouter un produit')
                        ->deleteAction(
                            fn ($action) => $action
                                ->icon('heroicon-m-trash')
                                ->color('danger')
                        ),
                ]),
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
