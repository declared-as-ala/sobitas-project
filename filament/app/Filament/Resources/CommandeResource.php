<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CommandeResource\Pages;
use App\Models\Commande;
use App\Models\Message;
use App\Jobs\SendSmsJob;
use Filament\Actions;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class CommandeResource extends Resource
{
    protected static ?string $model = Commande::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-shopping-cart';

    protected static string | \UnitEnum | null $navigationGroup = 'Commandes';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Commande';

    protected static ?string $pluralModelLabel = 'Commandes';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getNavigationBadge(): ?string
    {
        // Cache the badge count for 60 seconds to avoid query on every page load
        $count = Cache::remember('nav:commandes_pending', 60, function () {
            return static::getModel()::where('etat', 'nouvelle_commande')->count();
        });

        return $count ?: null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tabs::make('Commande')->tabs([
                Tab::make('Client')->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('nom')->label('Nom'),
                        Forms\Components\TextInput::make('prenom')->label('Prénom'),
                        Forms\Components\TextInput::make('email')->label('Email')->email(),
                        Forms\Components\TextInput::make('phone')->label('Téléphone'),
                        Forms\Components\TextInput::make('region')->label('Région'),
                        Forms\Components\TextInput::make('ville')->label('Ville'),
                        Forms\Components\TextInput::make('adresse1')->label('Adresse'),
                        Forms\Components\TextInput::make('code_postale')->label('Code postal'),
                    ]),
                ]),

                Tab::make('Livraison')->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('livraison_nom')->label('Nom livraison'),
                        Forms\Components\TextInput::make('livraison_prenom')->label('Prénom livraison'),
                        Forms\Components\TextInput::make('livraison_phone')->label('Tél. livraison'),
                        Forms\Components\TextInput::make('livraison_email')->label('Email livraison'),
                        Forms\Components\TextInput::make('livraison_region')->label('Région livraison'),
                        Forms\Components\TextInput::make('livraison_ville')->label('Ville livraison'),
                        Forms\Components\TextInput::make('livraison_adresse1')->label('Adresse livraison'),
                        Forms\Components\TextInput::make('livraison_code_postale')->label('Code postal livraison'),
                    ]),
                ]),

                Tab::make('Statut & Prix')->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('numero')
                            ->label('Numéro')
                            ->disabled()
                            ->dehydrated(false),
                        Forms\Components\Select::make('etat')
                            ->label('État')
                            ->options(Commande::getStatusOptions())
                            ->required(),
                        Forms\Components\TextInput::make('prix_ht')
                            ->label('Prix HT')
                            ->numeric()
                            ->prefix('DT')
                            ->disabled(),
                        Forms\Components\TextInput::make('prix_ttc')
                            ->label('Prix TTC')
                            ->numeric()
                            ->prefix('DT')
                            ->disabled(),
                        Forms\Components\TextInput::make('frais_livraison')
                            ->label('Frais livraison')
                            ->numeric()
                            ->prefix('DT'),
                    ]),
                    Forms\Components\Textarea::make('note')
                        ->label('Note')
                        ->columnSpanFull(),
                ]),
            ])->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Select only displayed columns — commandes has 30+ columns, table shows 7
            ->modifyQueryUsing(fn (Builder $query) => $query->select([
                'id', 'numero', 'nom', 'prenom', 'phone', 'prix_ttc', 'etat', 'region', 'created_at',
            ]))
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record) => $record->full_name)
                    ->searchable(['nom', 'prenom']),
                Tables\Columns\TextColumn::make('phone')
                    ->label('Tél.')
                    ->searchable(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total')
                    ->money('TND')
                    ->sortable(),
                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color(fn (string $state): string => Commande::getStatusColor($state))
                    ->formatStateUsing(fn (string $state): string => Commande::getStatusLabel($state)),
                Tables\Columns\TextColumn::make('region')
                    ->label('Région')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\SelectFilter::make('etat')
                    ->label('État')
                    ->options(Commande::getStatusOptions()),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\EditAction::make(),
                Actions\Action::make('sendSmsNotification')
                    ->label('SMS')
                    ->icon('heroicon-o-chat-bubble-left')
                    ->color('info')
                    ->requiresConfirmation()
                    ->action(function (Commande $record) {
                        if (! $record->phone) {
                            Notification::make()->title('Pas de numéro de téléphone')->warning()->send();
                            return;
                        }

                        $msg = Message::getCached();

                        if ($msg && $msg->msg_etat_commande) {
                            $sms = str_replace(
                                ['[nom]', '[prenom]', '[num_commande]', '[etat]'],
                                [$record->nom ?? '', $record->prenom ?? '', $record->numero ?? '', Commande::getStatusLabel($record->etat)],
                                $msg->msg_etat_commande
                            );
                            
                            // Queue SMS to avoid blocking the request
                            SendSmsJob::dispatch($record->phone, $sms);
                        }

                        Notification::make()
                            ->title('SMS mis en file d\'attente')
                            ->body('Le SMS sera envoyé sous peu.')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            CommandeResource\RelationManagers\DetailsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCommandes::route('/'),
            'create' => Pages\CreateCommande::route('/create'),
            'edit'   => Pages\EditCommande::route('/{record}/edit'),
        ];
    }
}
