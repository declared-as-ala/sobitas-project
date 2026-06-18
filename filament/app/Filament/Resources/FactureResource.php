<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FactureResource\Pages;
use App\Models\Client;
use App\Models\Coordinate;
use App\Models\Facture;
use App\Services\AramexService;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Repeater;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class FactureResource extends Resource
{
    protected static ?string $model = Facture::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Facturation & Tickets';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Bon de Livraison';

    protected static ?string $pluralModelLabel = 'Bons de Livraison';

    protected static ?string $recordTitleAttribute = 'numero';

    public static function getGloballySearchableAttributes(): array
    {
        return ['numero'];
    }

    public static function updateTotals($get, $set, bool $isItem = false): void
    {
        $details = $isItem ? ($get('../../details') ?? []) : ($get('details') ?? []);
        $remise = (float) ($isItem ? ($get('../../remise') ?? 0) : ($get('remise') ?? 0));
        // BL: no timbre — always 0
        $timbre = 0.0;
        $fraisLivraison = (float) ($isItem ? ($get('../../frais_livraison') ?? 0) : ($get('frais_livraison') ?? 0));

        // BL is HT only: no TVA; net_a_payer includes frais_livraison
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison, true);

        $prefix = $isItem ? '../../' : '';

        $set($prefix . 'prix_ht', $calcTotals['total_ht_brut']);
        $set($prefix . 'pourcentage_remise', $calcTotals['pourcentage_remise']);
        $set($prefix . 'prix_ht_apres_remise', $calcTotals['prix_ht_apres_remise']);
        $set($prefix . 'tva', $calcTotals['tva']);
        $set($prefix . 'prix_ttc', $calcTotals['prix_ttc']);
        $set($prefix . 'net_a_payer', $calcTotals['net_a_payer']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\ViewField::make('bl_pos_view')
                ->hiddenLabel()
                ->columnSpanFull()
                ->view('filament.pages.create-facture-bl'),

            Forms\Components\Hidden::make('numero'),
            Forms\Components\Hidden::make('client_id'),
            Forms\Components\Hidden::make('details'),
            Forms\Components\Hidden::make('prix_ht'),
            Forms\Components\Hidden::make('remise')->default(0),
            Forms\Components\Hidden::make('pourcentage_remise'),
            Forms\Components\Hidden::make('prix_ht_apres_remise'),
            Forms\Components\Hidden::make('frais_livraison')->default(0),
            Forms\Components\Hidden::make('tva'),
            Forms\Components\Hidden::make('prix_ttc'),
            Forms\Components\Hidden::make('timbre')->default(0),
            Forms\Components\Hidden::make('net_a_payer'),
            Forms\Components\Hidden::make('livraison_nom'),
            Forms\Components\Hidden::make('livraison_phone'),
            Forms\Components\Hidden::make('livraison_adresse1'),
            Forms\Components\Hidden::make('livraison_ville'),
            Forms\Components\Hidden::make('livraison_region'),
            Forms\Components\Hidden::make('livraison_email'),
            Forms\Components\Hidden::make('livraison_code_postale'),

            Forms\Components\Hidden::make('nom'),
            Forms\Components\Hidden::make('email'),
            Forms\Components\Hidden::make('phone'),
            Forms\Components\Hidden::make('adresse1'),
            Forms\Components\Hidden::make('ville'),
            Forms\Components\Hidden::make('region'),
            Forms\Components\Hidden::make('code_postale'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->select([
                    'factures.id',
                    'factures.numero',
                    'factures.client_id',
                    'factures.net_a_payer',
                    'factures.created_at',
                ])
                ->with('client:id,name')
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('Numéro B.L')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date de Facture')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Clients')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('net_a_payer')
                    ->label('Net à payer')
                    ->formatStateUsing(fn ($state): string => number_format((float) ($state ?? 0), 3, '.', ' ') . ' DT')
                    ->alignEnd()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold)
                    ->color('primary'),
                Tables\Columns\TextColumn::make('aramex_hawb')
                    ->label('HAWB Aramex')
                    ->placeholder('—')
                    ->copyable()
                    ->copyMessage('HAWB copié')
                    ->searchable(),
                Tables\Columns\TextColumn::make('aramex_status')
                    ->label('Statut Aramex')
                    ->placeholder('—')
                    ->badge()
                    ->color(fn (?string $state): string => match ($state) {
                        'SH005', 'SH006' => 'success',
                        'SH003', 'SH004' => 'info',
                        'SH069'          => 'warning',
                        null             => 'gray',
                        default          => 'primary',
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([10, 25, 50])
            ->striped()
            ->actions([
                Actions\EditAction::make(),
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->color('gray')
                    ->url(fn (Facture $record) => route('factures.print', ['facture' => $record->id]))
                    ->openUrlInNewTab(),
                Actions\Action::make('aramex_label')
                    ->label('Étiquette')
                    ->icon('heroicon-o-tag')
                    ->color('warning')
                    ->visible(fn (Facture $record): bool => (bool) $record->aramex_label_url)
                    ->modalContent(fn (Facture $record) => view('filament.modals.aramex-label', [
                        'url'  => route('factures.aramex-label', $record->id),
                        'hawb' => $record->aramex_hawb,
                    ]))
                    ->modalHeading(fn (Facture $record) => 'Étiquette Aramex — HAWB ' . $record->aramex_hawb)
                    ->modalWidth('3xl')
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Fermer'),
                Actions\Action::make('push_aramex')
                    ->label('Envoyer Aramex')
                    ->icon('heroicon-o-truck')
                    ->color('primary')
                    ->visible(fn (Facture $record): bool => \Illuminate\Support\Facades\Schema::hasColumn('factures', 'aramex_hawb') && ! $record->aramex_hawb)
                    ->requiresConfirmation()
                    ->modalHeading('Envoyer vers Aramex ?')
                    ->modalDescription('Créer une expédition Aramex pour ce bon de livraison.')
                    ->action(function (Facture $record): void {
                        try {
                            if (! \Illuminate\Support\Facades\Schema::hasColumn('factures', 'aramex_hawb')) {
                                Notification::make()
                                    ->title('Migration requise')
                                    ->body('Exécutez php artisan migrate pour activer Aramex.')
                                    ->warning()
                                    ->send();
                                return;
                            }
                            $result = app(AramexService::class)->createShipment($record);
                            $record->aramex_hawb      = $result['hawb'];
                            $record->aramex_label_url = $result['label_url'];
                            $record->aramex_error     = $result['error'];
                            $record->aramex_pushed_at = now();
                            $record->save();
                            if ($result['hawb']) {
                                Notification::make()
                                    ->title('Expédition créée — HAWB : ' . $result['hawb'])
                                    ->success()
                                    ->send();
                                redirect(request()->url());
                            } else {
                                Notification::make()
                                    ->title('Erreur Aramex')
                                    ->body($result['error'] ?? 'Erreur inconnue')
                                    ->danger()
                                    ->send();
                            }
                        } catch (\Throwable $e) {
                            Notification::make()
                                ->title('Erreur système')
                                ->body($e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
                Actions\Action::make('track_aramex')
                    ->label('Suivre')
                    ->icon('heroicon-o-map-pin')
                    ->color('info')
                    ->visible(fn (Facture $record): bool => (bool) $record->aramex_hawb)
                    ->action(function (Facture $record): void {
                        $result = app(AramexService::class)->trackShipment($record->aramex_hawb);
                        if ($result['error']) {
                            Notification::make()->title('Erreur tracking')->body($result['error'])->danger()->send();

                            return;
                        }
                        if ($result['update_code']) {
                            $record->update(['aramex_status' => $result['update_code']]);
                            Notification::make()
                                ->title('Statut mis à jour : ' . $result['update_code'])
                                ->body($result['description'] ?? '')
                                ->success()
                                ->send();
                        } else {
                            Notification::make()->title('Aucun statut disponible')->warning()->send();
                        }
                    }),
                Actions\Action::make('schedule_pickup')
                    ->label('Collecte')
                    ->icon('heroicon-o-calendar-days')
                    ->color('success')
                    ->visible(fn (Facture $record): bool => (bool) $record->aramex_hawb && $record->aramex_status !== 'annulé')
                    ->form([
                        \Filament\Forms\Components\DatePicker::make('date')
                            ->label('Date de collecte')
                            ->default(now()->addDay()->format('Y-m-d'))
                            ->minDate(now()->format('Y-m-d'))
                            ->required(),
                        \Filament\Forms\Components\TimePicker::make('ready_time')
                            ->label('Heure prête')
                            ->default('09:00')
                            ->required(),
                        \Filament\Forms\Components\TimePicker::make('last_time')
                            ->label('Dernière heure')
                            ->default('18:00')
                            ->required(),
                    ])
                    ->modalHeading('Programmer une collecte Aramex')
                    ->action(function (Facture $record, array $data): void {
                        try {
                            $result = app(AramexService::class)->schedulePickup([
                                'date'       => $data['date'],
                                'ready_time' => substr($data['ready_time'], 0, 5),
                                'last_time'  => substr($data['last_time'], 0, 5),
                                'hawbs'      => [$record->aramex_hawb],
                                'pieces'     => 1,
                            ]);
                            if ($result['success']) {
                                Notification::make()
                                    ->title('Collecte programmée — ID : ' . ($result['guid'] ?? 'OK'))
                                    ->success()
                                    ->send();
                                redirect(request()->url());
                            } else {
                                Notification::make()
                                    ->title('Erreur collecte')
                                    ->body($result['error'] ?? 'Erreur inconnue')
                                    ->danger()
                                    ->send();
                            }
                        } catch (\Throwable $e) {
                            Notification::make()->title('Erreur système')->body($e->getMessage())->danger()->send();
                        }
                    }),
                Actions\Action::make('cancel_aramex')
                    ->label('Annuler')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->visible(fn (Facture $record): bool => (bool) $record->aramex_hawb && $record->aramex_status !== 'annulé')
                    ->requiresConfirmation()
                    ->modalHeading('Annuler l\'expédition Aramex ?')
                    ->modalDescription('Cette action annulera l\'expédition chez Aramex. Le HAWB sera conservé pour référence.')
                    ->action(function (Facture $record): void {
                        try {
                            $result = app(AramexService::class)->cancelShipment($record->aramex_hawb);
                            if ($result['success']) {
                                $record->aramex_status = 'annulé';
                                $record->save();
                                Notification::make()->title('Expédition annulée')->success()->send();
                                redirect(request()->url());
                            } else {
                                Notification::make()
                                    ->title('Erreur annulation')
                                    ->body($result['error'] ?? 'Erreur inconnue')
                                    ->danger()
                                    ->send();
                            }
                        } catch (\Throwable $e) {
                            Notification::make()->title('Erreur système')->body($e->getMessage())->danger()->send();
                        }
                    }),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
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
            'index'  => Pages\ListFactures::route('/'),
            'create' => Pages\CreateFacture::route('/create'),
            'edit'   => Pages\EditFacture::route('/{record}/edit'),
        ];
    }
}
