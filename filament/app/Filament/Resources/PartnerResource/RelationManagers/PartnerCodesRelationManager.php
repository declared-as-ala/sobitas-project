<?php

namespace App\Filament\Resources\PartnerResource\RelationManagers;

use App\Enums\PartnerCodeStatus;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class PartnerCodesRelationManager extends RelationManager
{
    protected static string $relationship = 'codes';

    protected static ?string $title = 'Codes partenaire';

    public function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make()->schema([
                Forms\Components\TextInput::make('code')
                    ->label('Code')
                    ->required()
                    ->maxLength(64)
                    ->unique(ignoreRecord: true)
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn ($state, callable $set) => $set('code', $state ? strtoupper(trim((string) $state)) : $state)),
                Forms\Components\Select::make('discount_type')
                    ->label('Type de remise')
                    ->options([
                        'percentage' => 'Pourcentage',
                        'fixed' => 'Montant fixe (HT)',
                    ])
                    ->default('percentage')
                    ->required(),
                Forms\Components\TextInput::make('discount_value')
                    ->label('Valeur remise (% ou DT HT)')
                    ->numeric()
                    ->default(10)
                    ->required(),
                Forms\Components\TextInput::make('commission_rate')
                    ->label('Commission % (optionnel)')
                    ->numeric()
                    ->nullable()
                    ->helperText('Vide = taux du partenaire'),
                Forms\Components\Select::make('status')
                    ->label('Statut')
                    ->options(collect(PartnerCodeStatus::cases())->mapWithKeys(fn (PartnerCodeStatus $s) => [$s->value => $s->label()]))
                    ->default(PartnerCodeStatus::Active->value)
                    ->required(),
            ])->columns(2),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')->label('Code')->searchable(),
                Tables\Columns\TextColumn::make('discount_type')->label('Remise'),
                Tables\Columns\TextColumn::make('discount_value')->label('Valeur')->alignEnd(),
                Tables\Columns\TextColumn::make('commission_rate')->label('Com. %')->alignEnd()->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->label('Statut')->badge(),
                Tables\Columns\TextColumn::make('used_count')->label('Utilisations')->alignEnd(),
            ])
            ->headerActions([
                Actions\CreateAction::make()
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['partner_id'] = $this->getOwnerRecord()->getKey();

                        return $data;
                    }),
            ])
            ->actions([
                Actions\EditAction::make(),
            ]);
    }
}
