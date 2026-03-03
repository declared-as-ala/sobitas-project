<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CommandeResource\Pages;
use App\Models\Commande;
use App\Models\Message;
use App\Jobs\SendSmsJob;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
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

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

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
            Grid::make(3)->schema([
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
                    Tab::make('Statut')->schema([
                        Grid::make(2)->schema([
                            Forms\Components\TextInput::make('numero')->label('Numéro')->disabled()->dehydrated(false),
                            Forms\Components\Select::make('etat')->label('État')->options(Commande::getStatusOptions())->required(),
                        ]),
                    ]),
                ])->columnSpan(2),

                Section::make('Totaux & Note')
                    ->schema([
                        Forms\Components\TextInput::make('prix_ht')->label('Prix HT')->numeric()->prefix('DT')->disabled()->dehydrated(false),
                        Forms\Components\TextInput::make('prix_ttc')->label('Total TTC')->numeric()->prefix('DT')->disabled()->dehydrated(false)->extraInputAttributes(['class' => 'font-semibold']),
                        Forms\Components\TextInput::make('frais_livraison')->label('Frais livraison')->numeric()->prefix('DT'),
                        Forms\Components\Textarea::make('note')->label('Note')->rows(3),
                    ])
                    ->columns(1)
                    ->columnSpan(1)
                    ->extraAttributes(['class' => 'doc-totaux-sidebar']),
            ])->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Select only displayed / frequently used columns; client_id only if column exists (migration may not have run yet)
            ->modifyQueryUsing(function (Builder $query) {
                $columns = [
                    'id',
                    'numero',
                    'nom',
                    'prenom',
                    'phone',
                    'livraison_nom',
                    'livraison_prenom',
                    'livraison_phone',
                    'prix_ttc',
                    'etat',
                    'region',
                    'created_at',
                    'user_id',
                ];
                if (\Illuminate\Support\Facades\Schema::hasColumn('commandes', 'client_id')) {
                    $columns[] = 'client_id';
                }
                return $query->with('client:id,name,phone_1')->select($columns);
            })
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('client_display')
                    ->label('Client')
                    ->getStateUsing(function (Commande $record): string {
                        // Prefer linked client name, then commande client fields, then livraison fallback
                        $name = $record->client?->full_name
                            ?: trim(($record->nom ?? '') . ' ' . ($record->prenom ?? ''))
                            ?: trim(($record->livraison_nom ?? '') . ' ' . ($record->livraison_prenom ?? ''));

                        return $name !== '' ? $name : '—';
                    })
                    ->searchable(query: function (Builder $query, string $search): Builder {
                        return $query->where(function (Builder $q) use ($search) {
                            $q->where('nom', 'like', "%{$search}%")
                                ->orWhere('prenom', 'like', "%{$search}%")
                                ->orWhere('livraison_nom', 'like', "%{$search}%")
                                ->orWhere('livraison_prenom', 'like', "%{$search}%");
                        });
                    }),
                Tables\Columns\TextColumn::make('phone_display')
                    ->label('Tél.')
                    ->getStateUsing(function (Commande $record): string {
                        $phone = $record->client?->phone_1
                            ?: ($record->phone ?? '')
                            ?: ($record->livraison_phone ?? '');

                        return $phone !== '' ? $phone : '—';
                    })
                    ->searchable(query: function (Builder $query, string $search): Builder {
                        return $query->where(function (Builder $q) use ($search) {
                            $q->where('phone', 'like', "%{$search}%")
                                ->orWhere('livraison_phone', 'like', "%{$search}%");
                        });
                    }),
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
                Actions\EditAction::make(),
                ActionGroup::make([
                    Actions\Action::make('createBl')
                        ->label('Convertir en Bon de livraison')
                        ->icon('heroicon-o-document-text')
                        ->requiresConfirmation()
                        ->modalHeading('Créer un bon de livraison')
                        ->modalSubmitActionLabel('Confirmer')
                        ->action(function (Commande $record) {
                            $bl = app(\App\Services\DocumentConversion\OrderToBlService::class)->createBlFromOrder($record);
                            Notification::make()
                                ->title('BL #' . $bl->numero . ' créé')
                                ->success()
                                ->actions([
                                    NotificationAction::make('open')
                                        ->label('Ouvrir le document créé')
                                        ->url(\App\Filament\Resources\FactureResource::getUrl('edit', ['record' => $bl]))
                                        ->openUrlInNewTab(false),
                                ])
                                ->send();
                            return redirect(\App\Filament\Resources\FactureResource::getUrl('edit', ['record' => $bl]));
                        }),
                ])
                    ->icon('heroicon-o-arrow-path')
                    ->label('')
                    ->tooltip('Convertir')
                    ->color('success')
                    ->visible(fn (Commande $record): bool => ! $record->factures()->exists()),
                Actions\DeleteAction::make()
                    ->label('Supprimer')
                    ->modalHeading('Supprimer la commande')
                    ->modalDescription(fn (Commande $record): string => 'La commande #' . $record->numero . ' sera définitivement supprimée. Cette action est irréversible.')
                    ->visible(fn (Commande $record): bool => self::canDeleteCommande($record)),
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

    /**
     * Whether the commande can be deleted: only "nouvelle_commande" or "annuler", and no linked documents (BL/facture, ticket BL).
     */
    public static function canDeleteCommande(Commande $record): bool
    {
        if (! in_array($record->etat, ['nouvelle_commande', 'annuler'], true)) {
            return false;
        }
        if ($record->factures()->exists()) {
            return false;
        }
        if ($record->ticketsBl()->exists()) {
            return false;
        }
        return true;
    }
}
