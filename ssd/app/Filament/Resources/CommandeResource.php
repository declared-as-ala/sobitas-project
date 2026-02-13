<?php

namespace App\Filament\Resources;

use App\Commande;
use App\CommandeDetail;
use App\Filament\Resources\CommandeResource\Pages;
use App\Product;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class CommandeResource extends BaseResource
{
    protected static ?string $model = Commande::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-cart';

    protected static ?string $permissionSlug = 'commandes';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Commande')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('Client')
                            ->schema([
                                Forms\Components\TextInput::make('nom')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('prenom')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('email')
                                    ->email()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('phone')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('pays')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('region')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('ville')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('code_postale')
                                    ->numeric(),
                                Forms\Components\Textarea::make('adresse1')
                                    ->rows(2),
                                Forms\Components\Textarea::make('adresse2')
                                    ->rows(2),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Livraison')
                            ->schema([
                                Forms\Components\TextInput::make('livraison_nom')
                                    ->label('Nom livraison'),
                                Forms\Components\TextInput::make('livraison_prenom')
                                    ->label('Prénom livraison'),
                                Forms\Components\TextInput::make('livraison_email')
                                    ->email()
                                    ->label('Email livraison'),
                                Forms\Components\TextInput::make('livraison_phone')
                                    ->label('Téléphone livraison'),
                                Forms\Components\TextInput::make('livraison_region')
                                    ->label('Région livraison'),
                                Forms\Components\TextInput::make('livraison_ville')
                                    ->label('Ville livraison'),
                                Forms\Components\TextInput::make('livraison_code_postale')
                                    ->label('Code postal livraison'),
                                Forms\Components\Textarea::make('livraison_adresse1')
                                    ->label('Adresse livraison 1')
                                    ->rows(2),
                                Forms\Components\Textarea::make('livraison_adresse2')
                                    ->label('Adresse livraison 2')
                                    ->rows(2),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Statut & Totaux')
                            ->schema([
                                Forms\Components\Select::make('etat')
                                    ->options([
                                        'nouvelle_commande' => 'Nouvelle Commande',
                                        'en_cours_de_preparation' => 'En cours de préparation',
                                        'prete' => 'Prête',
                                        'en_cours_de_livraison' => 'En cours de livraison',
                                        'expidee' => 'Expédiée',
                                        'annuler' => 'Annulée',
                                        'Nouvelle Commande' => 'Nouvelle Commande (legacy)',
                                    ])
                                    ->searchable(),
                                Forms\Components\TextInput::make('frais_livraison')
                                    ->numeric(),
                                Forms\Components\TextInput::make('remise')
                                    ->numeric(),
                                Forms\Components\TextInput::make('prix_ht')
                                    ->numeric()
                                    ->disabled(),
                                Forms\Components\TextInput::make('prix_ttc')
                                    ->numeric()
                                    ->disabled(),
                                Forms\Components\Textarea::make('note')
                                    ->rows(3)
                                    ->columnSpanFull(),
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
                Tables\Columns\TextColumn::make('nom')
                    ->searchable(),
                Tables\Columns\TextColumn::make('prenom')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone')
                    ->searchable(),
                Tables\Columns\TextColumn::make('etat')
                    ->label('Statut')
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total TTC')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('etat')
                    ->label('Statut')
                    ->options([
                        'nouvelle_commande' => 'Nouvelle Commande',
                        'en_cours_de_preparation' => 'En cours de préparation',
                        'prete' => 'Prête',
                        'en_cours_de_livraison' => 'En cours de livraison',
                        'expidee' => 'Expédiée',
                        'annuler' => 'Annulée',
                        'Nouvelle Commande' => 'Nouvelle Commande (legacy)',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Commande')
                    ->using(function (Commande $record, array $data) {
                        return DB::transaction(function () use ($record, $data) {
                            $details = $data['details'] ?? [];
                            unset($data['details']);

                            $record->fill($data);
                            $record->save();

                            $record->details()->each(function (CommandeDetail $detail) {
                                // Optimize: Use increment instead of find + save
                                Product::where('id', $detail->produit_id)
                                    ->increment('qte', (int) $detail->qte);
                                $detail->delete();
                            });

                            $totals = static::syncDetails($record, $details);
                            $record->prix_ht = $totals['prix_ht'];
                            $record->prix_ttc = $totals['prix_ttc'];
                            $record->save();

                            return $record;
                        });
                    }),
                Tables\Actions\Action::make('print')
                    ->label('Print')
                    ->url(fn (Commande $record): string => route('voyager.imprimer_commande', ['id' => $record->id]))
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
            'index' => Pages\ListCommandes::route('/'),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $details
     * @return array{prix_ht: float, prix_ttc: float}
     */
    protected static function syncDetails(Commande $record, array $details): array
    {
        $totalHt = 0.0;
        $totalTtc = 0.0;

        foreach ($details as $detail) {
            if (empty($detail['produit_id']) || empty($detail['qte'])) {
                continue;
            }

            $qte = (int) $detail['qte'];
            $prixUnitaire = (float) ($detail['prix_unitaire'] ?? 0);
            $prixHt = $qte * $prixUnitaire;

            $commandeDetail = new CommandeDetail();
            $commandeDetail->commande_id = $record->id;
            $commandeDetail->produit_id = $detail['produit_id'];
            $commandeDetail->qte = $qte;
            $commandeDetail->prix_unitaire = $prixUnitaire;
            $commandeDetail->prix_ht = $prixHt;
            $commandeDetail->prix_ttc = $prixHt;
            $commandeDetail->save();

            // Optimize: Use decrement instead of find + save
            Product::where('id', $detail['produit_id'])
                ->decrement('qte', $qte);

            $totalHt += $prixHt;
            $totalTtc += $prixHt;
        }

        if (! empty($record->frais_livraison)) {
            $totalTtc += (float) $record->frais_livraison;
        }

        return [
            'prix_ht' => $totalHt,
            'prix_ttc' => $totalTtc,
        ];
    }
}
