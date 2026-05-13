<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleTypeResource\Pages;
use App\Models\ArticleType;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Str;
use Filament\Schemas\Components\Utilities\Set;

class ArticleTypeResource extends Resource
{
    protected static ?string $model = ArticleType::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-tag';

    protected static string | \UnitEnum | null $navigationGroup = 'Blog';

    protected static ?string $navigationLabel = 'Types d\'articles';

    protected static ?string $modelLabel = 'Type d\'article';

    protected static ?string $pluralModelLabel = 'Types d\'articles';

    protected static ?int $navigationSort = 2;

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('name')
                ->label('Nom du type')
                ->placeholder('Ex : Musculation, Conseils, Actualités…')
                ->required()
                ->maxLength(100)
                ->live(onBlur: true)
                ->afterStateUpdated(function (string $operation, $state, Set $set): void {
                    if ($operation === 'create') {
                        $set('slug', Str::slug($state));
                    }
                }),

            Forms\Components\TextInput::make('slug')
                ->label('Slug (identifiant URL)')
                ->required()
                ->maxLength(100)
                ->unique(ignoreRecord: true)
                ->rules(['regex:/^[a-z0-9\-]+$/'])
                ->validationMessages(['regex' => 'Lettres minuscules, chiffres et tirets uniquement.'])
                ->helperText('Généré automatiquement. Utilisé dans les URLs et l\'API.'),

            Forms\Components\Select::make('color')
                ->label('Couleur du badge')
                ->options([
                    'gray'    => '⬜ Gris',
                    'info'    => '🔵 Bleu',
                    'success' => '🟢 Vert',
                    'warning' => '🟡 Jaune',
                    'danger'  => '🔴 Rouge',
                    'primary' => '🟣 Violet',
                ])
                ->default('info')
                ->native(false)
                ->required(),

            Forms\Components\TextInput::make('sort_order')
                ->label('Ordre d\'affichage')
                ->numeric()
                ->default(0)
                ->minValue(0)
                ->helperText('Les types avec un ordre faible apparaissent en premier.'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom')
                    ->searchable()
                    ->sortable()
                    ->badge()
                    ->color(fn (ArticleType $record): string => $record->color ?? 'info'),

                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->copyable()
                    ->color('gray')
                    ->fontFamily('mono'),

                Tables\Columns\TextColumn::make('articles_count')
                    ->counts('articles')
                    ->label('Articles')
                    ->sortable()
                    ->badge()
                    ->color('gray'),

                Tables\Columns\TextColumn::make('sort_order')
                    ->label('Ordre')
                    ->sortable(),
            ])
            ->actions([
                Actions\EditAction::make()->slideOver(),
                Actions\DeleteAction::make()
                    ->before(function (ArticleType $record, Actions\DeleteAction $action): void {
                        if ($record->articles()->exists()) {
                            $action->failureNotificationTitle('Ce type est utilisé par ' . $record->articles()->count() . ' article(s).');
                            $action->halt();
                        }
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageArticleTypes::route('/'),
        ];
    }
}
