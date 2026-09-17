<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CommandeResource\Pages;
use App\Models\Commande;
use App\Services\TransactionalSmsText;
use App\Jobs\SendSmsJob;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Enums\Width;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Contracts\View\View;
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
        $count = \Illuminate\Support\Facades\Cache::remember('nav:commandes_pending', 60, function () {
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
            Forms\Components\ViewField::make('commande_view')
                ->view('filament.pages.commande-form')
                ->columnSpanFull(),

            // Hidden fields to capture State pushed from Javascript
            Forms\Components\Hidden::make('details')->default([]),
            Forms\Components\Hidden::make('client_id'),
            Forms\Components\Hidden::make('user_id'),
            Forms\Components\Hidden::make('nom'),
            Forms\Components\Hidden::make('prenom'),
            Forms\Components\Hidden::make('email'),
            Forms\Components\Hidden::make('phone'),
            Forms\Components\Hidden::make('region'),
            Forms\Components\Hidden::make('ville'),
            Forms\Components\Hidden::make('code_postale'),
            Forms\Components\Hidden::make('adresse1'),

            Forms\Components\Hidden::make('livraison_nom'),
            Forms\Components\Hidden::make('livraison_prenom'),
            Forms\Components\Hidden::make('livraison_email'),
            Forms\Components\Hidden::make('livraison_phone'),
            Forms\Components\Hidden::make('livraison_region'),
            Forms\Components\Hidden::make('livraison_ville'),
            Forms\Components\Hidden::make('livraison_code_postale'),
            Forms\Components\Hidden::make('livraison_adresse1'),

            Forms\Components\Hidden::make('etat')->default(Commande::STATUS_NEW),
            Forms\Components\Hidden::make('notifier_client')->default(false),
            Forms\Components\Hidden::make('frais_livraison')->default(0),
            Forms\Components\Hidden::make('prix_ttc')->default(0),
            Forms\Components\Hidden::make('prix_ht')->default(0),
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
                return $query->with(['client:id,name,phone_1', 'legacyClient:id,name,phone_1'])->select($columns);
            })
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('client_display')
                    ->label('Client')
                    ->getStateUsing(function (Commande $record): string {
                        // The order snapshot is authoritative: a delivery recipient may differ from
                        // the customer record, and old numeric user/client ids can collide.
                        $name = trim(($record->livraison_nom ?? '') . ' ' . ($record->livraison_prenom ?? ''))
                            ?: trim(($record->nom ?? '') . ' ' . ($record->prenom ?? ''))
                            ?: ($record->client?->full_name ?? '')
                            ?: ($record->legacyClient?->full_name ?? '');

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
                        $phone = ($record->livraison_phone ?? '')
                            ?: ($record->phone ?? '')
                            ?: ($record->client?->phone_1 ?? '')
                            ?: ($record->legacyClient?->phone_1 ?? '');

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
            ->paginationPageOptions([10, 25, 50])
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
                        ->modalHeading('Transformer en Bon de Livraison')
                        ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                        ->modalContent(fn (Commande $record): View => static::buildConversionModalContent($record, 'Bon de Livraison', 'amber'))
                        ->modalWidth(Width::Large)
                        ->modalSubmitActionLabel('Confirmer la conversion')
                        ->modalCancelActionLabel('Annuler')
                        ->action(function (Commande $record) {
                            $bl = app(\App\Services\DocumentConversion\OrderToBlService::class)->createBlFromOrder($record);
                            Notification::make()
                                ->title('Conversion réussie — ouverture de l’impression pour le BL #' . $bl->numero)
                                ->success()
                                ->send();
                            return redirect(route('factures.print', ['facture' => $bl->id]));
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

                        SendSmsJob::dispatch(
                            $record->phone,
                            TransactionalSmsText::status($record)
                        );

                        Notification::make()
                            ->title('SMS mis en file d\'attente')
                            ->body('Le SMS sera envoyé sous peu.')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([
                // Mark a batch of orders delivered.
                //
                // Until now there was no "Livrée" status at all, so no order had ever reached it —
                // 1,057 of 1,082 still sit at "Nouvelle". Two things wait on that transition and
                // have consequently never run: the post-delivery review request (the only source
                // of purchase-attested reviews, and therefore the only route to a star rating) and
                // loyalty points.
                //
                // Marking one order at a time through the edit form would make catching up on a
                // year of history impractical, which is how it would quietly not happen again.
                //
                // Saved with save(), NOT a mass update(): CommandeObserver has to observe the
                // status change to stamp delivered_at, award points and arm the review request. A
                // bulk update() bypasses model events and would silently do none of it.
                Actions\BulkAction::make('marquerLivree')
                    ->label('Marquer comme livrée')
                    ->icon('heroicon-o-check-badge')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Marquer ces commandes comme livrées')
                    ->modalDescription(
                        'Les clients concernés recevront une demande d\'avis 3 jours après, '
                        .'et leurs points de fidélité seront crédités. Action irréversible.'
                    )
                    ->modalSubmitActionLabel('Confirmer')
                    ->action(function (\Illuminate\Support\Collection $records) {
                        $done = 0;
                        $skipped = 0;

                        foreach ($records as $record) {
                            // Never resurrect a cancelled order, and never re-fire the observer for
                            // one already delivered.
                            if (in_array($record->etat, ['annuler', 'livree'], true)) {
                                $skipped++;

                                continue;
                            }
                            try {
                                $record->etat = 'livree';
                                $record->save();
                                $done++;
                            } catch (\Throwable $e) {
                                $skipped++;
                                \Illuminate\Support\Facades\Log::error('Bulk mark-delivered failed', [
                                    'commande_id' => $record->id,
                                    'error'       => $e->getMessage(),
                                ]);
                            }
                        }

                        \Filament\Notifications\Notification::make()
                            ->title("{$done} commande(s) marquée(s) comme livrée(s)")
                            ->body($skipped > 0 ? "{$skipped} ignorée(s) (annulée ou déjà livrée)." : null)
                            ->success()
                            ->send();
                    })
                    ->deselectRecordsAfterCompletion(),

                /*
                 * ── THE SECOND COD GATE, AND THE ONLY THING THAT OPENS IT ────────────────────
                 * Affiliate commission is EARNED when a parcel reaches `livree`, but it is not
                 * PAYABLE until Aramex has actually remitted the cash for it. In a
                 * cash-on-delivery business those are different days: `livree` means the courier
                 * took the money, not that we have it.
                 *
                 * AffilieTransactionService reads `commandes.cod_remitted_at` for exactly that
                 * gate. Before this action existed NOTHING in the codebase ever wrote that column
                 * — so the Friday payout batch would have selected zero payable commissions, every
                 * week, for ever, exiting 0 and looking indistinguishable from "nobody sold
                 * anything". A silent permanent no-op is the failure mode this project has been
                 * bitten by before (see AramexTrackingSync on promoting nothing and reporting
                 * success), so the writer is deliberately explicit.
                 *
                 * Manual is also correct operationally: COD reconciliation means matching an
                 * Aramex settlement report against orders. A human reads the report; this action
                 * records the outcome. When an Aramex remittance API exists this becomes its
                 * automated counterpart, not a replacement — keep the manual path for corrections.
                 *
                 * Only delivered orders qualify: money cannot be remitted for a parcel the courier
                 * never handed over. Already-remitted orders are skipped rather than re-stamped,
                 * because that timestamp is evidence and overwriting it destroys the audit trail
                 * the payout run relies on.
                 */
                Actions\BulkAction::make('marquerEncaisseCod')
                    ->label('Marquer encaissé (COD)')
                    ->icon('heroicon-o-banknotes')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading('Confirmer l\'encaissement Aramex')
                    ->modalDescription(
                        'À faire uniquement après réception du versement Aramex pour ces commandes. '
                        .'Cela rend la commission des affiliés payable lors du prochain virement. '
                        .'Seules les commandes livrées sont concernées.'
                    )
                    ->modalSubmitActionLabel('Confirmer l\'encaissement')
                    ->action(function (\Illuminate\Support\Collection $records) {
                        $done = 0;
                        $skipped = 0;

                        foreach ($records as $record) {
                            $delivered = in_array(
                                (string) $record->etat,
                                \App\Services\PointsService::DELIVERED_STATUSES,
                                true
                            );

                            if (! $delivered || $record->cod_remitted_at !== null) {
                                $skipped++;

                                continue;
                            }

                            try {
                                // saveQuietly: this stamps a reconciliation fact and must not
                                // re-fire CommandeObserver, which reacts to `etat` changes and
                                // would re-run delivery side effects on an untouched status.
                                $record->cod_remitted_at = now();
                                $record->saveQuietly();
                                $done++;
                            } catch (\Throwable $e) {
                                $skipped++;
                                \Illuminate\Support\Facades\Log::error('COD remittance marking failed', [
                                    'commande_id' => $record->id,
                                    'error'       => $e->getMessage(),
                                ]);
                            }
                        }

                        \Filament\Notifications\Notification::make()
                            ->title("{$done} commande(s) marquée(s) encaissée(s)")
                            ->body($skipped > 0 ? "{$skipped} ignorée(s) (non livrée ou déjà encaissée)." : null)
                            ->success()
                            ->send();
                    })
                    ->deselectRecordsAfterCompletion(),

                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
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
    public static function buildConversionModalContent(Commande $record, string $targetLabel, string $targetColor): View
    {
        $record->loadMissing('details');
        $totalHt = (float) ($record->prix_ht ?? 0);
        $remise = (float) ($record->remise ?? 0);
        $frais = (float) ($record->frais_livraison ?? 0);
        $totalTtc = (float) ($record->prix_ttc ?? 0);

        $fmt = fn ($v) => number_format((float) $v, 3, ',', ' ') . ' DT';
        $clientName = $record->getFullNameAttribute()
            ?: trim(($record->nom ?? '') . ' ' . ($record->prenom ?? ''))
            ?: ($record->client?->name ?? '—');

        // WHY is there a remise? The most common reason is the client spending Protinas (loyalty
        // points): each redemption writes a `redeem` UserPointTransaction against this order, so the
        // points spent are the plain-language explanation staff need. Guarded — a missing column or
        // relation must never break the confirmation modal (it would block converting the order).
        $protinasUsed = 0;
        try {
            $protinasUsed = (int) abs((int) $record->pointTransactions()->where('type', 'redeem')->sum('points'));
        } catch (\Throwable) {
            $protinasUsed = 0;
        }

        $remiseReason = null;
        if ($remise > 0) {
            $remiseReason = $protinasUsed > 0
                ? number_format($protinasUsed, 0, ',', ' ') . ' Protinas utilisées par le client (fidélité)'
                : 'Remise commerciale appliquée à la commande';
        }

        return view('filament.components.convert-wizard-summary', [
            'sourceType'      => 'Commande',
            'sourceNumber'    => $record->numero,
            'client'          => $clientName,
            'date'            => $record->created_at?->format('d/m/Y') ?? '—',
            'itemsCount'      => $record->details->count(),
            'totalHt'         => $fmt($totalHt > 0 ? $totalHt : $totalTtc),
            'remise'          => $remise > 0 ? $fmt($remise) : 0,
            'remiseReason'    => $remiseReason,
            'remiseIsLoyalty' => $protinasUsed > 0,
            'protinasUsed'    => $protinasUsed,
            'frais'           => $frais > 0 ? $fmt($frais) : null,
            'tva'             => null,
            'totalTtc'        => $fmt($totalTtc),
            'targetLabel'     => $targetLabel,
            'targetColor'     => $targetColor,
        ]);
    }

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
