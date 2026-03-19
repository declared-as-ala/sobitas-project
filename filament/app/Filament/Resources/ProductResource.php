<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-cube';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tabs::make('Produit')
                ->tabs([
                    Tab::make('1. Général')
                        ->schema([
                            Forms\Components\Hidden::make('_slug_auto_source')
                                ->dehydrated(false),
                            Section::make('Identification')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('designation_fr')
                                            ->label('Désignation')
                                            ->required()
                                            ->maxLength(255)
                                            ->live(onBlur: true)
                                            ->afterStateUpdated(function ($state, callable $set, callable $get): void {
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
                                            ->helperText('Généré automatiquement à partir de la désignation (modifiable).'),
                                        Forms\Components\TextInput::make('code_product')
                                            ->label('Code Produit')
                                            ->maxLength(255),
                                        Forms\Components\Select::make('brand_id')
                                            ->label('Marque')
                                            ->relationship('brand', 'designation_fr')
                                            ->searchable()
                                            ->preload(),
                                        Forms\Components\Select::make('sous_categorie_id')
                                            ->label('Sous-catégories')
                                            ->relationship('sousCategorie', 'designation_fr')
                                            ->searchable()
                                            ->preload(),
                                    ]),
                                    Forms\Components\RichEditor::make('description_fr')
                                        ->label('Description')
                                        ->columnSpanFull(),
                                ]),
                            Section::make('Médias')
                                ->schema([
                                    FileUpload::make('cover')
                                        ->label('Couverture (image principale)')
                                        ->disk('public')
                                        ->directory('products')
                                        ->image()
                                        ->imageEditor()
                                        ->maxSize(4096),
                                    FileUpload::make('images')
                                        ->label('Gallery (images secondaires)')
                                        ->disk('public')
                                        ->directory('products')
                                        ->image()
                                        ->multiple()
                                        ->reorderable()
                                        ->maxSize(4096),
                                ]),
                            Section::make('Flags produit')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\Toggle::make('pack')->label('Pack'),
                                        Forms\Components\Toggle::make('new_product')->label('New Product'),
                                        Forms\Components\Toggle::make('best_seller')->label('Meilleures ventes'),
                                    ]),
                                ]),
                        ]),

                    Tab::make('2. Stock & état')
                        ->schema([
                            Section::make('Stock')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('qte')
                                            ->label('Qte (quantité)')
                                            ->numeric()
                                            ->default(0)
                                            ->minValue(0)
                                            ->live(onBlur: true)
                                            ->disabled(fn (callable $get) => (int) $get('rupture') === 1)
                                            ->dehydrated(true)
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                $set('rupture', (int) $state <= 0 ? 1 : 0);
                                            }),
                                        Forms\Components\Select::make('rupture')
                                            ->label('Etat de stock')
                                            ->options([
                                                0 => 'En stock',
                                                1 => 'Rupture',
                                            ])
                                            ->default(0)
                                            ->required()
                                            ->native(false)
                                            ->live()
                                            ->formatStateUsing(fn ($state): int => ((bool) $state || (int) $state === 1) ? 1 : 0)
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                if ((int) $state === 1) {
                                                    $set('qte', 0);
                                                }
                                            }),
                                        Forms\Components\TextInput::make('note')
                                            ->label('Nombre d’étoiles (rating)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->maxValue(5),
                                    ]),
                                ]),
                        ]),

                    Tab::make('3. Prix & Promotion')
                        ->schema([
                            Section::make('Prix')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('prix')
                                            ->label('Prix')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\TextInput::make('promo')
                                            ->label('Promo')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\DateTimePicker::make('promo_expiration_date')
                                            ->label('Date d’expiration du promo (Ventes Flash)'),
                                    ]),
                                ]),
                        ]),

                    Tab::make('4. Contenu produit')
                        ->schema([
                            Section::make('Contenu')
                                ->schema([
                                    Forms\Components\Repeater::make('faq')
                                        ->label('Questions (FAQ)')
                                        ->schema([
                                            Forms\Components\TextInput::make('q')
                                                ->label('Question')
                                                ->required(),
                                            Forms\Components\Textarea::make('a')
                                                ->label('Réponse')
                                                ->rows(3)
                                                ->required(),
                                        ])
                                        ->default([])
                                        ->collapsible()
                                        ->columnSpanFull(),
                                    Forms\Components\Textarea::make('nutrition_values')
                                        ->label('Nutrition Values')
                                        ->rows(6)
                                        ->columnSpanFull(),
                                ]),
                        ]),

                    Tab::make('5. SEO')
                        ->schema([
                            Section::make('SEO')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\TextInput::make('meta_description')
                                            ->label('Meta Description')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('meta_title')
                                            ->label('Meta (name;content)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('alt_cover')
                                            ->label('Alt Cover (SEO)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('description_cover')
                                            ->label('Description Cover (SEO)')
                                            ->maxLength(500),
                                        Forms\Components\Textarea::make('seo_schema_description')
                                            ->label('Schema description (SEO)')
                                            ->rows(3)
                                            ->columnSpanFull(),
                                        Forms\Components\Textarea::make('seo_review')
                                            ->label('Review (SEO)')
                                            ->rows(3)
                                            ->columnSpanFull(),
                                        Forms\Components\TextInput::make('seo_aggregate_rating')
                                            ->label('AggregateRating (SEO)')
                                            ->maxLength(512)
                                            ->columnSpanFull(),
                                    ]),
                                ]),
                        ]),

                    Tab::make('6. Classification')
                        ->schema([
                            Section::make('Classification')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\Select::make('tags')
                                            ->label('Tags')
                                            ->relationship('tags', 'designation_fr')
                                            ->multiple()
                                            ->searchable()
                                            ->preload(),
                                        Forms\Components\Select::make('aromes')
                                            ->label('Aromas')
                                            ->relationship('aromes', 'designation_fr')
                                            ->multiple()
                                            ->searchable()
                                            ->preload(),
                                    ]),
                                ]),
                        ]),

                    Tab::make('7. Publication')
                        ->schema([
                            Section::make('Publication')
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label('Publier')
                                        ->default(true),
                                ]),
                        ]),
                ])
                ->persistTabInQueryString()
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr']))
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(72),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable()
                    ->limit(40),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Sous-catégorie')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix')
                    ->money('TND')
                    ->sortable(),
                Tables\Columns\TextColumn::make('promo')
                    ->label('Promo')
                    ->money('TND')
                    ->sortable()
                    ->toggleable()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Stock')
                    ->sortable()
                    ->badge()
                    ->color(fn (int $state): string => $state > 10 ? 'success' : ($state > 0 ? 'warning' : 'danger')),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Publié')
                    ->boolean()
                    ->sortable(),
                Tables\Columns\IconColumn::make('best_seller')
                    ->label('Best')
                    ->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('publier')
                    ->label('Publié'),
                Tables\Filters\TernaryFilter::make('best_seller')
                    ->label('Best-seller'),
                Tables\Filters\TernaryFilter::make('pack')
                    ->label('Pack'),
                Tables\Filters\TernaryFilter::make('new_product')
                    ->label('Nouveau'),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Marque')
                    ->relationship('brand', 'designation_fr')
                    ->searchable(),
            ])
            ->actions([
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
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['designation_fr', 'slug'];
    }
}
