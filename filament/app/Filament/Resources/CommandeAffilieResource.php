<?php

namespace App\Filament\Resources;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Resources\CommandeAffilieResource\Pages;
use App\Models\Commande;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
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
            ->with(['affilie', 'affilieTransactions']);
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
                TextColumn::make('etat')->label('État')->badge()
                    ->formatStateUsing(fn ($state): string => Commande::getStatusLabel((string) $state))
                    ->color(fn ($state): string => Commande::getStatusColor((string) $state)),
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
            Section::make('Commande')->schema([
                TextEntry::make('numero')->label('N°'),
                TextEntry::make('created_at')->label('Date')->dateTime('d/m/Y H:i'),
                TextEntry::make('etat')->label('État')->badge()
                    ->formatStateUsing(fn ($state): string => Commande::getStatusLabel((string) $state))
                    ->color(fn ($state): string => Commande::getStatusColor((string) $state)),
                TextEntry::make('fulfillment_mode')->label('Mode de réception')->badge()
                    ->default(Commande::FULFILLMENT_DELIVERY)
                    ->formatStateUsing(fn ($state): string => static::fulfillmentLabel($state))
                    ->color('gray'),
            ])->columns(2)->columnSpanFull(),
            Section::make('Affilié')->schema([
                TextEntry::make('affilie.name')->label('Nom')->placeholder('—'),
                TextEntry::make('affilie.business_name')->label('Entreprise')->placeholder('—'),
                TextEntry::make('affilie.phone')->label('Téléphone')->placeholder('—'),
                TextEntry::make('affilie.email')->label('E-mail')->placeholder('—'),
                TextEntry::make('affilie.address')->label('Adresse')->placeholder('—'),
                TextEntry::make('affilie.city')->label('Ville')->placeholder('—'),
            ])->columns(2)->columnSpanFull(),
            Section::make('Client et livraison')->schema([
                ...array_map(
                    fn (string $field, string $label): TextEntry => TextEntry::make($field)
                        ->label($label)
                        ->state(fn (Commande $record) => $record->{'livraison_'.$field} ?: $record->{$field})
                        ->placeholder('—'),
                    ['nom', 'prenom', 'phone', 'email', 'region', 'ville', 'code_postale', 'adresse1', 'adresse2'],
                    ['Nom', 'Prénom', 'Téléphone', 'E-mail', 'Gouvernorat', 'Ville', 'Code postal', 'Adresse', 'Complément d’adresse'],
                ),
                TextEntry::make('note')->label('Note')->placeholder('—')->columnSpanFull(),
            ])->columns(2)->columnSpanFull(),
            Section::make('Articles')->schema([
                RepeatableEntry::make('details')->hiddenLabel()->schema([
                    TextEntry::make('product.designation_fr')->label('Produit')->placeholder('Produit indisponible'),
                    TextEntry::make('arome')->label('Arôme')->placeholder('—'),
                    TextEntry::make('qte')->label('Quantité'),
                    TextEntry::make('prix_unitaire')->label('Prix unitaire (DT)')->numeric(decimalPlaces: 3),
                    TextEntry::make('total')->label('Total (DT)')->numeric(decimalPlaces: 3),
                ])->columns(['sm' => 2, 'lg' => 5])->columnSpanFull(),
            ])->columnSpanFull(),
            Section::make('Totaux')->schema([
                TextEntry::make('prix_ht')->label('Total HT (DT)')->numeric(decimalPlaces: 3),
                TextEntry::make('remise')->label('Remise (DT)')->numeric(decimalPlaces: 3),
                TextEntry::make('frais_livraison')->label('Frais de livraison (DT)')->numeric(decimalPlaces: 3),
                TextEntry::make('prix_ttc')->label('Total client (DT)')->numeric(decimalPlaces: 3),
                TextEntry::make('gain')->label('Gain affilié')
                    ->state(fn (Commande $record): string => static::ledgerGain($record)),
            ])->columns(2)->columnSpanFull(),
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
