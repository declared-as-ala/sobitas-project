<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReviewReplyResource\Pages;
use App\Models\ReviewReply;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * The moderation queue for the thread under a review, and the place the SHOP answers.
 *
 * Two jobs in one screen, and the second is the commercially important one. A held reply needs a
 * yes/no from a human. But a shop that answers a critical review in public is the single most
 * persuasive thing a product page can carry — more than another five-star — and there was nowhere
 * to write that answer from until this existed.
 *
 * The default filter is deliberately "à valider": this list is a QUEUE, and a queue that opens on
 * everything ever posted is a list, which nobody works through.
 */
class ReviewReplyResource extends Resource
{
    protected static ?string $model = ReviewReply::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chat-bubble-left-right';

    protected static string | \UnitEnum | null $navigationGroup = 'SEO';

    protected static ?int $navigationSort = 6;

    protected static ?string $modelLabel = 'Réponse à un avis';

    protected static ?string $pluralModelLabel = 'Réponses aux avis';

    /** The count of what is WAITING, not the count of what exists — a badge is a to-do, not a total. */
    public static function getNavigationBadge(): ?string
    {
        try {
            $pending = static::getModel()::where('publier', 0)->count();

            return $pending > 0 ? (string) $pending : null;
        } catch (\Throwable) {
            // The table does not exist until the migration runs. A resource that throws here takes
            // the whole admin sidebar down with it.
            return null;
        }
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Select::make('review_id')
                ->label('Avis')
                ->relationship('review', 'comment')
                ->searchable()
                ->preload()
                ->required(),

            Forms\Components\Select::make('user_id')
                ->label('Utilisateur')
                ->relationship('user', 'name')
                ->searchable()
                ->preload()
                ->helperText('Laisser vide pour une réponse anonyme ou une réponse de la boutique.'),

            Forms\Components\TextInput::make('author_name')
                ->label('Nom affiché (sans compte)')
                ->maxLength(60),

            Forms\Components\Textarea::make('body')
                ->label('Message')
                ->rows(4)
                ->maxLength(1000)
                ->required(),

            Forms\Components\Toggle::make('is_staff')
                ->label('Réponse de la boutique')
                ->helperText('Affichée au nom de Protein.tn, avec un badge — jamais au nom de l’administrateur connecté.')
                ->default(false),

            Forms\Components\Toggle::make('publier')
                ->label('Publiée')
                ->default(true),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with([
                'user:id,name',
                'review:id,product_id,comment',
                'review.product:id,designation_fr',
            ]))
            ->columns([
                Tables\Columns\TextColumn::make('review.product.designation_fr')->label('Produit')->limit(28)->searchable(),
                Tables\Columns\TextColumn::make('display_name')->label('Auteur'),
                Tables\Columns\TextColumn::make('body')->label('Message')->limit(48)->wrap(),
                Tables\Columns\IconColumn::make('is_staff')->label('Boutique')->boolean(),
                Tables\Columns\IconColumn::make('publier')->label('Publiée')->boolean(),
                // The moderator's own words, so a decision can be checked rather than trusted.
                Tables\Columns\TextColumn::make('ai_moderation.reason')->label('Motif IA')->limit(36)->toggleable(),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('publier')->label('Publiée'),
                Tables\Filters\TernaryFilter::make('is_staff')->label('Réponse boutique'),
            ])
            ->actions([
                Actions\Action::make('publier')
                    ->label('Publier')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn (ReviewReply $record) => ! $record->publier)
                    ->action(fn (ReviewReply $record) => $record->forceFill(['publier' => 1])->saveQuietly()),
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkAction::make('publier')
                    ->label('Publier la sélection')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->action(fn ($records) => $records->each(fn (ReviewReply $r) => $r->forceFill(['publier' => 1])->saveQuietly())),
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageReviewReplies::route('/')];
    }
}
