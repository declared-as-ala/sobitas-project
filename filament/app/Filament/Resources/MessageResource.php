<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MessageResource\Pages;
use App\Models\Message;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class MessageResource extends Resource
{
    protected static ?string $model = Message::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chat-bubble-bottom-center-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Marketing';

    protected static ?string $navigationLabel = 'Templates SMS';

    protected static ?string $modelLabel = 'Template SMS';

    protected static ?string $pluralModelLabel = 'Templates SMS';

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Section::make('Templates de messages SMS')
                    ->description('Variables: [nom], [prenom], [num_commande], [etat]')
                    ->schema([
                        Forms\Components\Textarea::make('msg_etat_commande')
                            ->label('Message état commande')
                            ->rows(4)
                            ->helperText('Envoyé quand le statut de commande change'),
                        Forms\Components\Textarea::make('msg_inscription')
                            ->label('Message inscription')
                            ->rows(4)
                            ->helperText('Envoyé lors de la création de commande'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->label('ID'),
                Tables\Columns\TextColumn::make('msg_etat_commande')
                    ->label('Message commande')
                    ->limit(60),
                Tables\Columns\TextColumn::make('msg_inscription')
                    ->label('Message inscription')
                    ->limit(60),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Modifié le')
                    ->dateTime('d/m/Y H:i'),
            ])
            ->actions([
                Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageMessages::route('/'),
        ];
    }
}

