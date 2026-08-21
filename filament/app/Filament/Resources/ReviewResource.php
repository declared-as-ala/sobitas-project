<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReviewResource\Pages;
use App\Models\Review;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ReviewResource extends Resource
{
    protected static ?string $model = Review::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-star';
    protected static string | \UnitEnum | null $navigationGroup = 'SEO';
    protected static ?int $navigationSort = 5;
    protected static ?string $modelLabel = 'Avis';
    protected static ?string $pluralModelLabel = 'Avis';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Select::make('product_id')
                ->label('Produit')
                ->relationship('product', 'designation_fr')
                ->searchable()
                ->preload(),
            Forms\Components\Select::make('user_id')
                ->label('Utilisateur')
                ->relationship('user', 'name')
                ->searchable()
                ->preload(),
            Forms\Components\TextInput::make('stars')->label('Note')->numeric()->minValue(1)->maxValue(5),
            Forms\Components\Textarea::make('comment')->label('Commentaire'),
            Forms\Components\Toggle::make('publier')->label('Publié')->default(true),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with([
                'product:id,designation_fr',
                'user:id,name',
            ]))
            ->columns([
                Tables\Columns\TextColumn::make('product.designation_fr')->label('Produit')->limit(30)->searchable(),
                Tables\Columns\TextColumn::make('user.name')->label('Utilisateur')->searchable(),
                Tables\Columns\TextColumn::make('stars')->label('Note')->sortable(),
                Tables\Columns\TextColumn::make('comment')->label('Commentaire')->limit(40),
                Tables\Columns\IconColumn::make('publier')->label('Publié')->boolean(),
                /*
                 * ── THE AUTHENTICITY COLUMN IS THE POINT OF THIS TABLE NOW ──────────────────
                 * A review earns loyalty points, so this list is no longer only a content queue —
                 * it is where money is approved. A score with no reasons beside it is a number
                 * nobody can argue with, which is the wrong property for something that withholds
                 * a reward from a real customer, so the signals ride along in the tooltip.
                 *
                 * Colours are deliberately not a traffic light on the star rating: they describe
                 * how likely a HUMAN wrote it, and a genuine one-star review is green.
                 */
                Tables\Columns\TextColumn::make('authenticity_score')
                    ->label('Authenticité')
                    ->badge()
                    ->color(fn ($state) => match (true) {
                        $state === null => 'gray',
                        $state >= 70 => 'success',
                        $state >= 35 => 'warning',
                        default => 'danger',
                    })
                    ->formatStateUsing(fn ($state) => $state === null ? '—' : $state . '/100')
                    ->tooltip(fn ($record) => $record->authenticity_signals['reason'] ?? null)
                    ->sortable(),
                Tables\Columns\IconColumn::make('points_awarded')
                    ->label('Points versés')
                    ->boolean()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('publier')->label('Publié'),
                Tables\Filters\TernaryFilter::make('points_awarded')->label('Points versés'),
                // The queue that actually needs a human: everything the bot detector was not
                // confident about. Sorted worst-first by the score column above.
                Tables\Filters\Filter::make('suspect')
                    ->label('Authenticité douteuse')
                    ->query(fn ($query) => $query->whereNotNull('authenticity_score')->where('authenticity_score', '<', 70)),
            ])
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageReviews::route('/')];
    }
}
