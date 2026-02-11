<?php

namespace App\Filament\Resources;

use App\Client;
use App\DetailsFacture;
use App\Facture;
use App\Filament\Resources\FactureResource\Pages;
use App\Message;
use App\Product;
use App\Services\SmsService;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class FactureResource extends BaseResource
{
    protected static ?string $model = Facture::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $permissionSlug = 'factures';

    protected static bool $shouldRegisterNavigation = false;

    protected static function getDefaultEagerLoads(): array
    {
        return ['client'];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Facture')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Client')
                            ->schema([
                                Forms\Components\Toggle::make('new_client')
                                    ->label('New client')
                                    ->reactive(),
                                Forms\Components\Select::make('client_id')
                                    ->label('Client')
                                    ->relationship('client', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->visible(fn (callable $get) => ! $get('new_client')),
                                Forms\Components\TextInput::make('client_name')
                                    ->label('Name')
                                    ->maxLength(255)
                                    ->visible(fn (callable $get) => (bool) $get('new_client')),
                                Forms\Components\TextInput::make('client_adresse')
                                    ->label('Adresse')
                                    ->maxLength(255)
                                    ->visible(fn (callable $get) => (bool) $get('new_client')),
                                Forms\Components\TextInput::make('client_phone_1')
                                    ->label('Phone')
                                    ->maxLength(255)
                                    ->visible(fn (callable $get) => (bool) $get('new_client')),
                                Forms\Components\TextInput::make('client_matricule')
                                    ->label('Matricule')
                                    ->maxLength(255)
                                    ->visible(fn (callable $get) => (bool) $get('new_client')),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Totals')
                            ->schema([
                                Forms\Components\TextInput::make('remise')
                                    ->numeric()
                                    ->label('Remise'),
                                Forms\Components\TextInput::make('pourcentage_remise')
                                    ->numeric()
                                    ->label('Pourcentage remise'),
                                Forms\Components\TextInput::make('timbre')
                                    ->numeric()
                                    ->label('Timbre'),
                                Forms\Components\TextInput::make('prix_ht')
                                    ->numeric()
                                    ->disabled(),
                                Forms\Components\TextInput::make('prix_ttc')
                                    ->numeric()
                                    ->disabled(),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Produits')
                            ->schema([
                                Forms\Components\Repeater::make('details')
                                    ->schema([
                                        Forms\Components\Select::make('produit_id')
                                            ->label('Produit')
                                            ->options(Product::query()->orderBy('designation_fr')->pluck('designation_fr', 'id'))
                                            ->searchable()
                                            ->reactive()
                                            ->afterStateUpdated(function ($state, callable $set) {
                                                $price = Product::find($state)?->prix;
                                                if ($price !== null) {
                                                    $set('prix_unitaire', $price);
                                                }
                                            }),
                                        Forms\Components\TextInput::make('qte')
                                            ->numeric()
                                            ->default(1)
                                            ->reactive()
                                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                                $price = (float) ($get('prix_unitaire') ?? 0);
                                                $set('prix_ht', (float) $state * $price);
                                                $set('prix_ttc', (float) $state * $price);
                                            }),
                                        Forms\Components\TextInput::make('prix_unitaire')
                                            ->numeric()
                                            ->reactive()
                                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                                $qte = (float) ($get('qte') ?? 0);
                                                $set('prix_ht', $qte * (float) $state);
                                                $set('prix_ttc', $qte * (float) $state);
                                            }),
                                        Forms\Components\TextInput::make('prix_ht')
                                            ->numeric()
                                            ->disabled(),
                                        Forms\Components\TextInput::make('prix_ttc')
                                            ->numeric()
                                            ->disabled(),
                                    ])
                                    ->columns(2)
                                    ->defaultItems(1)
                                    ->columnSpanFull(),
                            ]),
                    ])
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('numero')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('client_id')
                    ->relationship('client', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Facture')
                    ->using(function (Facture $record, array $data) {
                        return DB::transaction(function () use ($record, $data) {
                            $details = $data['details'] ?? [];
                            unset($data['details']);

                            static::hydrateClientFromForm($record, $data);
                            $record->fill($data);
                            $record->save();

                            $record->details()->each(function (DetailsFacture $detail) {
                                // Optimize: Use increment instead of find + save
                                Product::where('id', $detail->produit_id)
                                    ->increment('qte', (int) $detail->qte);
                                $detail->delete();
                            });

                            $totals = static::syncDetails($record, $details);
                            $record->prix_ht = $totals['prix_ht'];
                            $record->prix_ttc = static::calculateTtc($record->prix_ht, (float) $record->remise);
                            $record->save();

                            return $record;
                        });
                    }),
                Tables\Actions\Action::make('print')
                    ->label('Print')
                    ->url(fn (Facture $record): string => route('voyager.imprimer_facture', ['id' => $record->id]))
                    ->openUrlInNewTab(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFactures::route('/'),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $details
     * @return array{prix_ht: float}
     */
    protected static function syncDetails(Facture $record, array $details): array
    {
        $totalHt = 0.0;

        foreach ($details as $detail) {
            if (empty($detail['produit_id']) || empty($detail['qte'])) {
                continue;
            }

            $qte = (int) $detail['qte'];
            $prixUnitaire = (float) ($detail['prix_unitaire'] ?? 0);
            $prixHt = $qte * $prixUnitaire;

            $detailModel = new DetailsFacture();
            $detailModel->facture_id = $record->id;
            $detailModel->produit_id = $detail['produit_id'];
            $detailModel->qte = $qte;
            $detailModel->prix_unitaire = $prixUnitaire;
            $detailModel->prix_ht = $prixHt;
            $detailModel->prix_ttc = $prixHt;
            $detailModel->save();

            // Optimize: Use update instead of find + save
            Product::where('id', $detail['produit_id'])
                ->decrement('qte', $qte);

            $totalHt += $prixHt;
        }

        return ['prix_ht' => $totalHt];
    }

    protected static function calculateTtc(float $prixHt, float $remise): float
    {
        if ($remise > 0) {
            return $prixHt - $remise;
        }

        return $prixHt;
    }

    /**
     * @param array<string, mixed> $data
     */
    protected static function hydrateClientFromForm(Facture $record, array &$data): void
    {
        $isNewClient = (bool) ($data['new_client'] ?? false);

        if (! $isNewClient) {
            return;
        }

        $client = new Client();
        $client->name = $data['client_name'] ?? null;
        $client->adresse = $data['client_adresse'] ?? null;
        $client->phone_1 = $data['client_phone_1'] ?? null;
        $client->matricule = $data['client_matricule'] ?? null;
        $client->save();

        $data['client_id'] = $client->id;

        if ($client->phone_1) {
            $msg = Message::first();
            $sms = $msg && $msg->msg_welcome
                ? $msg->msg_welcome
                : 'Cher(e) client(e), nous vous remercions de votre confiance et nous serons ravis de vous revoir dans notre boutique SOBITAS ou notre site Web Protein.tn';

            (new SmsService())->send_sms($client->phone_1, $sms);
        }
    }
}
