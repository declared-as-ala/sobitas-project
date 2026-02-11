<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ClientResource\Pages;
use App\Models\Client;
use App\Jobs\SendSmsJob;
use Filament\Forms;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Collection;

class ClientResource extends Resource
{
    protected static ?string $model = Client::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-users';

    protected static string | \UnitEnum | null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Informations client')
                ->schema([
                    Forms\Components\TextInput::make('name')
                        ->label('Nom')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone_1')
                        ->label('Téléphone 1')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('phone_2')
                        ->label('Téléphone 2')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('adresse')
                        ->label('Adresse')
                        ->maxLength(500)
                        ->columnSpanFull(),
                    Forms\Components\TextInput::make('matricule')
                        ->label('Matricule fiscal')
                        ->maxLength(255),
                    Forms\Components\Toggle::make('sms')
                        ->label('Accepte SMS')
                        ->default(true),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone_1')
                    ->label('Tél. 1')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone_2')
                    ->label('Tél. 2')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('adresse')
                    ->label('Adresse')
                    ->limit(30)
                    ->toggleable(),
                Tables\Columns\IconColumn::make('sms')
                    ->label('SMS')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('sms')
                    ->label('Accepte SMS'),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                    Actions\BulkAction::make('sendSms')
                        ->label('Envoyer SMS')
                        ->icon('heroicon-o-chat-bubble-left-right')
                        ->form([
                            Forms\Components\Textarea::make('message')
                                ->label('Message SMS')
                                ->required()
                                ->maxLength(160),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $count = 0;

                            foreach ($records as $client) {
                                if ($client->phone_1) {
                                    SendSmsJob::dispatch($client->phone_1, $data['message']);
                                    $count++;
                                }
                            }

                            Notification::make()
                                ->title("SMS en file d'attente")
                                ->body("{$count} SMS mis en file d'attente pour envoi.")
                                ->success()
                                ->send();
                        })
                        ->deselectRecordsAfterCompletion()
                        ->requiresConfirmation(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListClients::route('/'),
            'create' => Pages\CreateClient::route('/create'),
            'edit'   => Pages\EditClient::route('/{record}/edit'),
        ];
    }
}

