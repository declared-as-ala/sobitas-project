<?php

namespace App\Filament\Resources;

use App\Client;
use App\Coordinate;
use App\DetailsQuotation;
use App\Filament\Components\Actions\PrintAction;
use App\Filament\Components\Forms\ClientSelectionFields;
use App\Filament\Components\Forms\PricingFields;
use App\Filament\Resources\QuotationResource\Pages;
use App\Message;
use App\Product;
use App\Quotation;
use App\Services\SmsService;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class QuotationResource extends BaseResource
{
    protected static ?string $model = Quotation::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-magnifying-glass';

    protected static ?string $permissionSlug = 'quotations';

    protected static bool $shouldRegisterNavigation = false;

    protected static function getDefaultEagerLoads(): array
    {
        return ['client'];
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Quotation')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Client')
                            ->schema(ClientSelectionFields::make())
                            ->columns(2),
                        Forms\Components\Tabs\Tab::make('Totals')
                            ->schema([
                                ...PricingFields::make(includeRemise: true),
                                Forms\Components\TextInput::make('tva')
                                    ->numeric()
                                    ->label('TVA')
                                    ->disabled(),
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
                                    ->relationship('details')
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
                                                $tvaRate = (float) (Coordinate::first()?->tva ?? 0);
                                                $prixHt = (float) $state * $price;
                                                $tvaAmount = ($prixHt * $tvaRate) / 100;
                                                $prixTtc = $prixHt + $tvaAmount;
                                                $set('prix_ht', $prixHt);
                                                $set('tva', $tvaRate);
                                                $set('prix_ttc', $prixTtc);
                                            }),
                                        Forms\Components\TextInput::make('prix_unitaire')
                                            ->numeric()
                                            ->reactive()
                                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                                $qte = (float) ($get('qte') ?? 0);
                                                $tvaRate = (float) (Coordinate::first()?->tva ?? 0);
                                                $prixHt = $qte * (float) $state;
                                                $tvaAmount = ($prixHt * $tvaRate) / 100;
                                                $prixTtc = $prixHt + $tvaAmount;
                                                $set('prix_ht', $prixHt);
                                                $set('tva', $tvaRate);
                                                $set('prix_ttc', $prixTtc);
                                            }),
                                        Forms\Components\TextInput::make('prix_ht')
                                            ->numeric()
                                            ->disabled(),
                                        Forms\Components\TextInput::make('tva')
                                            ->numeric()
                                            ->label('TVA %')
                                            ->disabled(),
                                        Forms\Components\TextInput::make('prix_ttc')
                                            ->numeric()
                                            ->disabled(),
                                    ])
                                    ->columns(3)
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
                    ->money('TND')
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
                    ->modalHeading('Edit Quotation')
                    ->using(function (Quotation $record, array $data) {
                        return DB::transaction(function () use ($record, $data) {
                            $details = $data['details'] ?? [];
                            unset($data['details']);

                            static::hydrateClientFromForm($record, $data);
                            $record->fill($data);
                            $record->save();

                            // Delete old details (no stock rollback for quotations)
                            $record->details()->delete();

                            $totals = static::syncDetails($record, $details);
                            $record->prix_ht = $totals['prix_ht'];
                            $record->tva = $totals['tva'];
                            $record->prix_ttc = static::calculateTtc(
                                $record->prix_ht,
                                $record->tva,
                                (float) ($record->remise ?? 0),
                                (float) ($record->timbre ?? 0)
                            );
                            $record->save();

                            return $record;
                        });
                    }),
                PrintAction::make('voyager.imprimer_quotations'),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListQuotations::route('/'),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $details
     * @return array{prix_ht: float, tva: float}
     */
    protected static function syncDetails(Quotation $record, array $details): array
    {
        $totalHt = 0.0;
        $totalTva = 0.0;
        $tvaRate = (float) (Coordinate::first()?->tva ?? 0);

        foreach ($details as $detail) {
            if (empty($detail['produit_id']) || empty($detail['qte'])) {
                continue;
            }

            $qte = (int) $detail['qte'];
            $prixUnitaire = (float) ($detail['prix_unitaire'] ?? 0);
            $prixHt = $qte * $prixUnitaire;
            $tvaAmount = ($prixHt * $tvaRate) / 100;
            $prixTtc = $prixHt + $tvaAmount;

            $detailModel = new DetailsQuotation();
            $detailModel->quotation_id = $record->id;
            $detailModel->produit_id = $detail['produit_id'];
            $detailModel->qte = $qte;
            $detailModel->prix_unitaire = $prixUnitaire;
            $detailModel->prix_ht = $prixHt;
            $detailModel->tva = $tvaRate;
            $detailModel->prix_ttc = $prixTtc;
            $detailModel->save();

            // Note: Quotations don't affect product stock (estimates only)

            $totalHt += $prixHt;
            $totalTva += $tvaAmount;
        }

        return ['prix_ht' => $totalHt, 'tva' => $totalTva];
    }

    protected static function calculateTtc(float $prixHt, float $tva, float $remise, float $timbre): float
    {
        if ($remise > 0) {
            $newPrixHt = $prixHt - $remise;
            $pourcentage = $prixHt != 0 ? $remise / $prixHt : 0;
            $newTva = $tva - ($tva * $pourcentage);
            return $newPrixHt + $newTva + $timbre;
        }

        return $prixHt + $tva + $timbre;
    }

    /**
     * @param array<string, mixed> $data
     */
    protected static function hydrateClientFromForm(Quotation $record, array &$data): void
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
