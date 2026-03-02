<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class PageResource extends Resource
{
    protected static ?string $model = Page::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Page';

    protected static ?string $pluralModelLabel = 'Pages';

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('title')
                ->label('Titre')
                ->required()
                ->maxLength(255)
                ->live(onBlur: true)
                ->afterStateUpdated(function ($state, Forms\Set $set, Forms\Get $get) {
                if (blank($get('slug'))) {
                    $set('slug', Str::slug($state));
                }
            }),
            Forms\Components\TextInput::make('slug')
                ->label('Slug (URL)')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true)
                ->rules(['alpha_dash:ascii']),
            Forms\Components\Textarea::make('excerpt')
                ->label('Extrait')
                ->rows(2)
                ->columnSpanFull(),
            Forms\Components\RichEditor::make('body')
                ->label('Contenu')
                ->columnSpanFull(),
            FileUpload::make('image')
                ->label('Image')
                ->disk('public')
                ->directory('pages')
                ->image()
                ->imageEditor()
                ->maxSize(4096),
            Forms\Components\Select::make('status')
                ->label('Statut')
                ->options(Page::getStatusOptions())
                ->default(Page::STATUS_ACTIVE)
                ->required(),
            Forms\Components\Textarea::make('meta_description')
                ->label('Meta description')
                ->rows(2)
                ->columnSpanFull(),
            Forms\Components\TextInput::make('meta_keywords')
                ->label('Meta mots-clés')
                ->maxLength(500)
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Title')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => Page::getStatusOptions()[$state] ?? $state)
                    ->color(fn (string $state): string => $state === Page::STATUS_ACTIVE ? 'success' : 'gray'),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Modifié le')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Actions\ViewAction::make()->slideOver(),
                Actions\EditAction::make()->slideOver(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManagePages::route('/'),
        ];
    }
}
