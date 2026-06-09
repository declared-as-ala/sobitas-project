<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SiteNavigationItemResource\Pages;
use App\Models\SiteNavigationItem;
use App\Rules\SiteNavigationUrl;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class SiteNavigationItemResource extends Resource
{
    protected static ?string $model = SiteNavigationItem::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-bars-3-bottom-left';

    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Navigation';

    protected static ?string $modelLabel = 'Lien de navigation';

    protected static ?string $pluralModelLabel = 'Navigation';

    protected static ?string $recordTitleAttribute = 'label';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Bouton')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\Select::make('location')
                            ->label('Emplacement')
                            ->options(SiteNavigationItem::locationOptions())
                            ->required()
                            ->native(false)
                            ->default(SiteNavigationItem::LOCATION_NAVBAR),
                        Forms\Components\TextInput::make('label')
                            ->label('Libelle')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('url')
                            ->label('URL')
                            ->required()
                            ->maxLength(1024)
                            ->helperText('Exemples: /packs, /creatine, https://example.com, tel:+216...')
                            ->rules([new SiteNavigationUrl()])
                            ->columnSpanFull(),
                        Forms\Components\Select::make('icon')
                            ->label('Icone')
                            ->options([
                                'home' => 'Home',
                                'shopping-bag' => 'Shopping bag',
                                'package' => 'Package',
                                'store' => 'Store',
                                'newspaper' => 'Newspaper',
                                'mail' => 'Mail',
                                'phone' => 'Phone',
                                'info' => 'Info',
                                'star' => 'Star',
                                'heart' => 'Heart',
                                'tag' => 'Tag',
                                'gift' => 'Gift',
                            ])
                            ->searchable()
                            ->native(false)
                            ->placeholder('Aucune icone'),
                        Forms\Components\TextInput::make('sort_order')
                            ->label('Ordre')
                            ->numeric()
                            ->minValue(0)
                            ->default(0),
                        Forms\Components\Toggle::make('is_visible')
                            ->label('Visible')
                            ->default(true)
                            ->inline(false),
                        Forms\Components\Toggle::make('opens_new_tab')
                            ->label('Ouvrir dans un nouvel onglet')
                            ->default(false)
                            ->inline(false),
                    ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->columns([
                Tables\Columns\TextColumn::make('label')
                    ->label('Libelle')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::SemiBold),
                Tables\Columns\TextColumn::make('url')
                    ->label('URL')
                    ->searchable()
                    ->copyable()
                    ->limit(48)
                    ->tooltip(fn (?string $state): ?string => $state),
                Tables\Columns\TextColumn::make('icon')
                    ->label('Icone')
                    ->badge()
                    ->placeholder('Aucune')
                    ->color('gray'),
                Tables\Columns\IconColumn::make('is_visible')
                    ->label('Visible')
                    ->boolean()
                    ->sortable(),
                Tables\Columns\TextColumn::make('sort_order')
                    ->label('Ordre')
                    ->sortable(),
            ])
            ->modifyQueryUsing(fn ($query) => $query->where('location', SiteNavigationItem::LOCATION_NAVBAR))
            ->filters([
                Tables\Filters\TernaryFilter::make('is_visible')
                    ->label('Visible'),
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
            'index' => Pages\ManageSiteNavigationItems::route('/'),
        ];
    }
}
