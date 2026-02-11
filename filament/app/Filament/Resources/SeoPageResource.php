<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SeoPageResource\Pages;
use App\Models\SeoPage;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class SeoPageResource extends Resource
{
    protected static ?string $model = SeoPage::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-magnifying-glass';
    protected static string | \UnitEnum | null $navigationGroup = 'SEO';
    protected static ?int $navigationSort = 1;
    protected static ?string $modelLabel = 'Page SEO';
    protected static ?string $pluralModelLabel = 'Pages SEO';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('page')->required()->maxLength(255),
            Forms\Components\TextInput::make('meta_title')->maxLength(255),
            Forms\Components\Textarea::make('meta_description'),
            Forms\Components\TextInput::make('meta_keywords')->maxLength(500),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('page')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('meta_title')->limit(40),
                Tables\Columns\TextColumn::make('meta_description')->limit(40),
            ])
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ManageSeoPages::route('/')];
    }
}

