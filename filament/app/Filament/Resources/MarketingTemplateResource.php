<?php

namespace App\Filament\Resources;

use App\Filament\Resources\MarketingTemplateResource\Pages;
use App\Models\MarketingTemplate;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;

class MarketingTemplateResource extends Resource
{
    protected static ?string $model = MarketingTemplate::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-duplicate';
    protected static ?string $navigationLabel = 'Templates';
    protected static ?string $modelLabel = 'Template';
    protected static ?string $pluralModelLabel = 'Templates';
    protected static string | \UnitEnum | null $navigationGroup = 'Marketing';
    protected static ?int $navigationSort = 30;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Identification')
                ->schema([
                    Forms\Components\Select::make('type')
                        ->options(['sms' => 'SMS', 'email' => 'Email'])
                        ->required()
                        ->native(false),
                    Forms\Components\TextInput::make('name')->required()->maxLength(255),
                    Forms\Components\TextInput::make('subject')->maxLength(255)->visible(fn ($get) => $get('type') === 'email'),
                    Forms\Components\Toggle::make('is_active')->default(true),
                ])
                ->columns(2),
            Section::make('Contenu SMS')
                ->schema([
                    Forms\Components\Textarea::make('content_text')
                        ->label('Message')
                        ->rows(5)
                        ->maxLength(500)
                        ->helperText('Variables: {{stop_text}}, {{promo_code}}, etc.')
                        ->visible(fn ($get) => $get('type') === 'sms'),
                ])
                ->visible(fn ($get) => $get('type') === 'sms'),
            Section::make('Contenu Email')
                ->schema([
                    Forms\Components\Textarea::make('content_html')
                        ->label('HTML')
                        ->rows(15)
                        ->helperText('Variables: {{logo_url}}, {{unsubscribe_url}}, etc.')
                        ->visible(fn ($get) => $get('type') === 'email'),
                ])
                ->visible(fn ($get) => $get('type') === 'email'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('type')->badge()->color(fn (string $state) => $state === 'email' ? 'info' : 'success'),
                Tables\Columns\TextColumn::make('name')->searchable(),
                Tables\Columns\TextColumn::make('subject')->limit(40)->toggleable(),
                Tables\Columns\IconColumn::make('is_active')->boolean(),
                Tables\Columns\TextColumn::make('updated_at')->dateTime()->sortable(),
            ])
            ->defaultSort('updated_at', 'desc')
            ->actions([Actions\EditAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMarketingTemplates::route('/'),
            'create' => Pages\CreateMarketingTemplate::route('/create'),
            'edit' => Pages\EditMarketingTemplate::route('/{record}/edit'),
        ];
    }
}
