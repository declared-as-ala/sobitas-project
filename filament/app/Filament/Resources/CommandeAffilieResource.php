<?php

namespace App\Filament\Resources;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Resources\CommandeAffilieResource\Pages;
use App\Models\Commande;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\ViewEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class CommandeAffilieResource extends Resource
{
    protected static ?string $model = Commande::class;

    protected static ?string $slug = 'commandes-affilies';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-shopping-bag';

    protected static string | \UnitEnum | null $navigationGroup = 'Commandes';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Commandes affiliés';

    protected static ?string $modelLabel = 'Commande affilié';

    protected static ?string $pluralModelLabel = 'Commandes affiliés';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getNavigationBadge(): ?string
    {
        $count = \Illuminate\Support\Facades\Cache::remember('nav:commandes_affilies', 60, function () {
            return static::getModel()::whereNotNull('affilie_id')->count();
        });

        return $count ?: null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'success';
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->whereNotNull('affilie_id')
            ->with(['affilie', 'affilieTransactions', 'details.product', 'latestShipment']);
    }

    private static function ledgerGain(Commande $record): string
    {
        // Mirror the affiliate panel: historical earnings come from the ledger, never line prices.
        $row = $record->affilieTransactions->firstWhere('type', AffilieTransactionType::Commission);

        if (! $row) {
            return '—';
        }

        $suffix = $row->status === AffilieTransactionStatus::Pending ? ' (en attente)' : '';

        return number_format((float) $row->amount, 3, ',', ' ').' DT'.$suffix;
    }

    private static function fulfillmentLabel(?string $state): string
    {
        return $state === Commande::FULFILLMENT_PICKUP ? 'Retrait en magasin' : 'Livraison';
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                TextColumn::make('affilie.name')->label('Affilié')->searchable()->sortable()
                    ->description(fn (Commande $record): ?string => $record->affilie?->business_name),
                TextColumn::make('affilie.phone')->label('Téléphone affilié')->searchable()->placeholder('—'),
                TextColumn::make('nom')->label('Client')->searchable()
                    ->formatStateUsing(fn ($state, Commande $record): string => trim($state.' '.$record->prenom))
                    ->placeholder('—'),
                TextColumn::make('phone')->label('Téléphone client')->searchable()->placeholder('—'),
                TextColumn::make('region')->label('Gouvernorat')->placeholder('—'),
                TextColumn::make('ville')->label('Ville')->placeholder('—'),
                TextColumn::make('fulfillment_mode')->label('Mode de réception')->badge()
                    ->default(Commande::FULFILLMENT_DELIVERY)
                    ->formatStateUsing(fn ($state): string => static::fulfillmentLabel($state))
                    ->color('gray'),
                TextColumn::make('prix_ttc')->label('Total client (DT)')->numeric(decimalPlaces: 3)->alignEnd()->sortable(),
                TextColumn::make('gain')->label('Gain affilié')->alignEnd()
                    ->getStateUsing(fn (Commande $record): string => static::ledgerGain($record)),
                // ONE status: Aramex's real courier state once a shipment exists, the shop's own
                // état before that (and for pickup). Short label; full Aramex sentence in the tooltip.
                TextColumn::make('etat')->label('Statut')->badge()
                    ->getStateUsing(fn (Commande $record): string => $record->unifiedStatusLabel())
                    ->color(fn (Commande $record): string => $record->unifiedStatusColor())
                    ->tooltip(fn (Commande $record): ?string => $record->aramexStatusDescription()),
                TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->recordActions([ViewAction::make()->label('Consulter')])
            ->toolbarActions([])
            ->emptyStateHeading('Aucune commande affilié');
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            ViewEntry::make('facture')
                ->hiddenLabel()
                ->view('filament.affilie.order-facture')
                ->viewData(fn (Commande $record): array => [
                    'record' => $record,
                    'gain' => static::ledgerGain($record),
                ])
                ->columnSpanFull(),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCommandeAffilies::route('/'),
            'view' => Pages\ViewCommandeAffilie::route('/{record}'),
        ];
    }
}
