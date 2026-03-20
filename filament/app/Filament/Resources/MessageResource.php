<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages;
use App\Models\Message;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class MessageResource extends Resource
{
    protected static ?string $model = Message::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-bottom-center-text';

    protected static string|\UnitEnum|null $navigationGroup = 'Marketing';

    protected static ?string $navigationLabel = 'Messages';

    protected static ?string $modelLabel = 'Message';

    protected static ?string $pluralModelLabel = 'Messages';

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Section::make('Templates de messages SMS')
                    ->description('Variables disponibles : [nom], [prenom], [num_commande], [etat], [produits], [total]')
                    ->schema([
                        Forms\Components\Textarea::make('msg_welcome')
                            ->label('Msg bienvenue')
                            ->rows(4)
                            ->helperText('Message envoyé pour accueillir le client. Ex: Cher(e) client(e), nous vous remercions de votre confiance.')
                            ->columnSpanFull(),
                        Forms\Components\Textarea::make('msg_etat_commande')
                            ->label('Msg Etat Commande')
                            ->rows(4)
                            ->helperText('Envoyé quand le statut change. Variables: [prenom], [nom], [num_commande], [etat], [produits], [total]')
                            ->columnSpanFull(),
                        Forms\Components\Textarea::make('msg_passez_commande')
                            ->label('Msg Passez Commande')
                            ->rows(4)
                            ->helperText('Envoyé à la création de commande. Variables: [nom], [prenom], [num_commande], [etat], [produits], [total]')
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('msg_welcome')
                    ->label('Msg bienvenue')
                    ->limit(80)
                    ->wrap(),
                Tables\Columns\TextColumn::make('msg_etat_commande')
                    ->label('Msg Etat Commande')
                    ->limit(80)
                    ->wrap(),
                Tables\Columns\TextColumn::make('msg_passez_commande')
                    ->label('Msg Passez Commande')
                    ->limit(80)
                    ->wrap(),
            ])
            ->actions([
                Actions\ViewAction::make()
                    ->label('Vue'),
                Actions\EditAction::make()
                    ->label('Editer'),
                Actions\DeleteAction::make()
                    ->label('Supprimer'),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make()
                        ->label('Supprimer la sélection'),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageMessages::route('/'),
        ];
    }
}
