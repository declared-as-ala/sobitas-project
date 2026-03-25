<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SousCategoryResource\Pages;
use App\Filament\Resources\ProductResource;
use App\Models\Categ;
use App\Models\SousCategory;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class SousCategoryResource extends Resource
{
    protected static ?string $model = SousCategory::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-rectangle-group';

    protected static string|\UnitEnum|null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'Sous-catégorie';

    protected static ?string $pluralModelLabel = 'Sous-catégories';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    // ─── Palette for category badges ──────────────────────────────────────────
    private static array $categoryColors = [
        'primary', 'success', 'warning', 'info', 'danger',
    ];

    private static function categoryColor(int $id): string
    {
        return self::$categoryColors[$id % count(self::$categoryColors)];
    }

    // ─── Form ─────────────────────────────────────────────────────────────────

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Hidden::make('_slug_auto_source')
                ->dehydrated(false),

            Section::make('Catégories')
                ->schema([
                    Forms\Components\Select::make('categorie_id')
                        ->label('Catégories')
                        ->relationship('categorie', 'designation_fr')
                        ->required()
                        ->searchable()
                        ->preload()
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),

            Section::make('Désignation → Slug')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('designation_fr')
                            ->label('Désignation')
                            ->required()
                            ->maxLength(255)
                            ->live(debounce: 400)
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
                    ]),
                ])
                ->columnSpanFull(),

            Section::make('📝 DESCRIPTION')
                ->schema([
                    Forms\Components\RichEditor::make('description_fr')
                        ->label('Description')
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),

            Section::make('🖼️ SEO IMAGE')
                ->schema([
                    Forms\Components\TextInput::make('cover')
                        ->label('Image')
                        ->maxLength(500)
                        ->columnSpanFull(),
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('alt_cover')
                            ->label('Alt Cover (SEO)')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('description_cover')
                            ->label('Description Cover (SEO)')
                            ->maxLength(500),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make('🔍 SEO META')
                ->description('Meta (name;content) — ex. title;… / description;… / keywords;…')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('meta_title')
                            ->label('title')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('meta_description')
                            ->label('description')
                            ->maxLength(500),
                    ]),
                    Forms\Components\TextInput::make('meta_keywords')
                        ->label('keywords')
                        ->maxLength(500)
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),

            Section::make('📊 SEO STRUCTURED DATA')
                ->schema([
                    Forms\Components\Textarea::make('seo_schema_description')
                        ->label('Schema Description (SEO)')
                        ->rows(4)
                        ->columnSpanFull(),
                    Grid::make(2)->schema([
                        Forms\Components\Textarea::make('review_seo')
                            ->label('Review (SEO)')
                            ->rows(3)
                            ->maxLength(255),
                        Forms\Components\TextInput::make('aggregate_rating_seo')
                            ->label('AggregateRating (SEO)')
                            ->maxLength(255),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make('🥗 PRODUCT DETAILS')
                ->schema([
                    Forms\Components\Textarea::make('nutrition_values')
                        ->label('Nutrition Values')
                        ->rows(8)
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),

            Section::make('❓ FAQ')
                ->schema([
                    Forms\Components\Repeater::make('faq')
                        ->label('Questions')
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
                ])
                ->columnSpanFull(),

            Section::make('📌 MORE DETAILS')
                ->schema([
                    Forms\Components\Textarea::make('more_details')
                        ->label('More Details')
                        ->rows(8)
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),
        ]);
    }

    // ─── Table ────────────────────────────────────────────────────────────────

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->with('categorie:id,designation_fr')
                ->withCount('products')
            )

            // ── Grouping: sous-catégories grouped under their catégorie ──────
            ->groups([
                Tables\Grouping\Group::make('categorie.designation_fr')
                    ->label('Catégorie')
                    ->collapsible()
                    ->titlePrefixedWithLabel(false),
            ])
            ->defaultGroup('categorie.designation_fr')
            ->groupingSettingsHidden()   // hide the "Group by" settings dropdown — grouping is always on

            // ── Columns ──────────────────────────────────────────────────────
            ->columns([

                // Désignation — primary identifier, always visible
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Sous-catégorie')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::SemiBold)
                    ->description(fn (SousCategory $record): string =>
                        $record->slug ? '/' . $record->slug : ''
                    ),

                // Catégorie badge — visible by default (useful when group is collapsed or grouping disabled)
                Tables\Columns\TextColumn::make('categorie.designation_fr')
                    ->label('Catégorie')
                    ->badge()
                    ->color(fn ($record) => $record?->categorie_id
                        ? self::categoryColor($record->categorie_id)
                        : 'gray'
                    )
                    ->sortable()
                    ->searchable(),

                // Description — HTML stripped, short preview with full-text tooltip
                Tables\Columns\TextColumn::make('description_fr')
                    ->label('Description')
                    ->formatStateUsing(fn (?string $state): string =>
                        $state ? trim(strip_tags(html_entity_decode($state))) : '—'
                    )
                    ->limit(70)
                    ->tooltip(fn (?string $state): ?string =>
                        $state ? mb_substr(trim(strip_tags(html_entity_decode($state))), 0, 300) : null
                    )
                    ->color('gray')
                    ->toggleable(),

                // Product count badge
                Tables\Columns\TextColumn::make('products_count')
                    ->label('Produits')
                    ->badge()
                    ->color(fn (int $state): string => match (true) {
                        $state === 0 => 'gray',
                        $state <= 5 => 'warning',
                        default => 'success',
                    })
                    ->sortable()
                    ->alignCenter(),

                // ── SEO / meta fields — hidden by default, toggled on demand ─
                Tables\Columns\TextColumn::make('alt_cover')
                    ->label('Alt Cover')
                    ->limit(40)
                    ->tooltip(fn (?string $state) => $state)
                    ->color('gray')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('review_seo')
                    ->label('Review SEO')
                    ->limit(40)
                    ->color('gray')
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('aggregate_rating_seo')
                    ->label('AggRating SEO')
                    ->limit(40)
                    ->color('gray')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])

            // ── Filters ───────────────────────────────────────────────────────
            ->filters([
                Tables\Filters\SelectFilter::make('categorie_id')
                    ->label('Catégorie')
                    ->relationship('categorie', 'designation_fr')
                    ->searchable()
                    ->preload()
                    ->placeholder('Toutes les catégories'),

                Tables\Filters\Filter::make('has_description')
                    ->label('Avec description')
                    ->query(fn (Builder $query) => $query->whereNotNull('description_fr')->where('description_fr', '!=', '')),

                Tables\Filters\Filter::make('no_products')
                    ->label('Sans produits')
                    ->query(fn (Builder $query) => $query->doesntHave('products')),
            ])
            ->filtersLayout(Tables\Enums\FiltersLayout::AboveContentCollapsible)
            ->filtersTriggerAction(
                fn (Actions\Action $action) => $action
                    ->button()
                    ->label('Filtres')
                    ->icon('heroicon-o-funnel')
            )

            // ── Search ────────────────────────────────────────────────────────
            ->searchPlaceholder('Rechercher une sous-catégorie...')

            // ── Sorting ───────────────────────────────────────────────────────
            ->defaultSort('designation_fr', 'asc')
            ->striped()
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50, 100])

            ->emptyStateHeading('Aucune sous-catégorie')
            ->emptyStateDescription('Créez une sous-catégorie pour ranger vos produits (ex. Créatine, BCAA, Vitamines).')
            ->emptyStateIcon('heroicon-o-rectangle-group')
            ->emptyStateActions([
                Actions\CreateAction::make()
                    ->label('Créer une sous-catégorie')
                    ->icon('heroicon-o-plus'),
            ])

            // ── Actions ───────────────────────────────────────────────────────
            ->actions([
                Actions\ActionGroup::make([
                    Actions\EditAction::make()
                        ->label('Modifier')
                        ->icon('heroicon-o-pencil-square'),
                    Actions\Action::make('viewProducts')
                        ->label('Voir les produits')
                        ->icon('heroicon-o-shopping-bag')
                        ->color('gray')
                        ->url(fn (SousCategory $record): string => ProductResource::getUrl('index', [
                            'tableFilters' => [
                                'sous_categorie_id' => ['value' => $record->id],
                            ],
                        ])),
                    Actions\DeleteAction::make()
                        ->label('Supprimer'),
                ])
                    ->label('Actions')
                    ->icon('heroicon-m-ellipsis-vertical')
                    ->size('sm')
                    ->color('gray')
                    ->button()
                    ->tooltip('Actions'),
            ])
            ->bulkActions([
                Actions\BulkAction::make('assignCategorie')
                    ->label('Attribuer une catégorie')
                    ->icon('heroicon-o-tag')
                    ->form([
                        Forms\Components\Select::make('categorie_id')
                            ->label('Catégorie parente')
                            ->options(fn (): array => Categ::query()
                                ->orderBy('designation_fr')
                                ->pluck('designation_fr', 'id')
                                ->all())
                            ->searchable()
                            ->required(),
                    ])
                    ->action(function (Collection $records, array $data): void {
                        $id = (int) $data['categorie_id'];
                        $records->each(fn (SousCategory $sc) => $sc->update(['categorie_id' => $id]));
                        Notification::make()
                            ->title($records->count() . ' sous-catégorie(s) mise(s) à jour')
                            ->success()
                            ->send();
                    })
                    ->deselectRecordsAfterCompletion(),
                Actions\DeleteBulkAction::make()
                    ->label('Supprimer la sélection'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSousCategories::route('/'),
            'create' => Pages\CreateSousCategory::route('/create'),
            'edit' => Pages\EditSousCategory::route('/{record}/edit'),
        ];
    }
}
