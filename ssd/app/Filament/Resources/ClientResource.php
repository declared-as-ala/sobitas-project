<?php

namespace App\Filament\Resources;

use App\Client;
use App\Filament\Resources\ClientResource\Pages;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class ClientResource extends BaseResource
{
    protected static ?string $model = Client::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-group';

    protected static ?string $permissionSlug = 'clients';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                Forms\Components\TextInput::make('phone_1')
                    ->label('Phone 1')
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                Forms\Components\TextInput::make('phone_2')
                    ->label('Phone 2')
                    ->maxLength(255),
                Forms\Components\TextInput::make('matricule')
                    ->maxLength(255),
                Forms\Components\Textarea::make('adresse')
                    ->rows(3),
                Forms\Components\Toggle::make('sms')
                    ->label('SMS'),
            ])
            ->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('phone_1')
                    ->label('Phone 1')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('phone_2')
                    ->label('Phone 2')
                    ->searchable(),
                Tables\Columns\IconColumn::make('sms')
                    ->label('SMS')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('sms')
                    ->label('SMS'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Client'),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListClients::route('/'),
        ];
    }
}
