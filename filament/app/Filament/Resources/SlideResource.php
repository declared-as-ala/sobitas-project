<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SlideResource\Pages;
use App\Models\Slide;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class SlideResource extends Resource
{
    protected static ?string $model = Slide::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-photo';
    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';
    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            FileUpload::make('image')
                ->label('Image')
                ->disk('public')
                ->directory('slides')
                ->image()
                ->imageEditor()
                ->maxSize(4096),
            Forms\Components\TextInput::make('titre')->label('Titre')->maxLength(255),
            Forms\Components\TextInput::make('lien')->label('Lien')->maxLength(500),
            Forms\Components\Select::make('type')
                ->options(['web' => 'Web', 'mobile' => 'Mobile'])
                ->default('web'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')->label('Image')->disk('public'),
                Tables\Columns\TextColumn::make('titre')->label('Titre')->searchable(),
                Tables\Columns\TextColumn::make('type')->badge(),
                Tables\Columns\TextColumn::make('lien')->label('Lien')->limit(30)->toggleable(),
            ])
            ->reorderable('order_column')
            ->actions([Actions\EditAction::make(), Actions\DeleteAction::make()])
            ->bulkActions([Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageSlides::route('/'),
        ];
    }
}

