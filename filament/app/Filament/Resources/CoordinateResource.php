<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CoordinateResource\Pages;
use App\Models\Coordinate;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\HtmlString;

class CoordinateResource extends Resource
{
    protected static ?string $model = Coordinate::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-map-pin';

    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';

    protected static ?int $navigationSort = 1;

    protected static ?string $modelLabel = 'Coordonnées';

    protected static ?string $pluralModelLabel = 'Coordonnées';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tabs::make('Coordonnées')
                ->tabs([

                    Tab::make('Informations générales')
                        ->schema([
                            Section::make()->schema([
                                Grid::make(2)->schema([
                                    Forms\Components\TextInput::make('designation_fr')
                                        ->label('titre de la société')
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('abbreviation')
                                        ->label('Abréviation')
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('matricule')
                                        ->label('Matricule')
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('registre_commerce')
                                        ->label('Registre de commerce')
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('rib')
                                        ->label('RIB')
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('email')
                                        ->label('Email')
                                        ->email()
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('adresse_fr')
                                        ->label('Adresse')
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('phone_1')
                                        ->label('Téléphone 1')
                                        ->tel()
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('phone_2')
                                        ->label('Fix')
                                        ->tel()
                                        ->maxLength(255),
                                    Forms\Components\TextInput::make('site_web')
                                        ->label('Site Web')
                                        ->url()
                                        ->maxLength(255),
                                ]),
                            ]),
                        ]),

                    Tab::make('Réseaux sociaux')
                        ->schema([
                            Section::make()->schema([
                                Grid::make(2)->schema([
                                    Forms\Components\TextInput::make('instagram_link')
                                        ->label('Lien Instagram')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('facebook_link')
                                        ->label('Lien Facebook')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('twitter_link')
                                        ->label('Lien Twitter')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('linkedin_link')
                                        ->label('Lien Linkedin')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('tiktok_link')
                                        ->label('Tiktok Link')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('youtube_link')
                                        ->label('Lien Youtube')
                                        ->url()
                                        ->maxLength(500),
                                    Forms\Components\TextInput::make('whatsapp_link')
                                        ->label('Whatsapp Link')
                                        ->maxLength(500),
                                ]),
                            ]),
                        ]),

                    Tab::make('Logos')
                        ->schema([
                            Section::make()->schema([
                                Forms\Components\Placeholder::make('logo_preview')
                                    ->label('Logo actuel')
                                    ->content(function ($record): HtmlString|string {
                                        $raw = $record?->logo;
                                        if (empty($raw)) {
                                            return 'Aucun logo enregistré.';
                                        }
                                        $path = ltrim(str_replace('\\', '/', trim((string) $raw)), '/');
                                        if (str_starts_with($path, 'storage/')) {
                                            $path = substr($path, 8);
                                        }
                                        if (! Storage::disk('public')->exists($path)) {
                                            return 'Fichier introuvable : ' . $path;
                                        }
                                        $url = rtrim(Coordinate::originRootUrl(), '/') . '/storage/' . $path;

                                        return new HtmlString(
                                            '<img src="' . e($url) . '" alt="Logo" style="max-height:120px;height:auto;width:auto;border-radius:6px;">'
                                        );
                                    })
                                    ->columnSpanFull(),
                                FileUpload::make('logo')
                                    ->label('Logo (remplacer)')
                                    ->disk('public')
                                    ->directory('coordonnees')
                                    ->image()
                                    ->imageEditor()
                                    ->maxSize(2048)
                                    ->columnSpanFull(),
                                Forms\Components\Placeholder::make('logo_facture_preview')
                                    ->label('Logo Facture actuel')
                                    ->content(function ($record): HtmlString|string {
                                        $raw = $record?->logo_facture;
                                        if (empty($raw)) {
                                            return 'Aucun logo facture enregistré.';
                                        }
                                        $path = ltrim(str_replace('\\', '/', trim((string) $raw)), '/');
                                        if (str_starts_with($path, 'storage/')) {
                                            $path = substr($path, 8);
                                        }
                                        if (! Storage::disk('public')->exists($path)) {
                                            return 'Fichier introuvable : ' . $path;
                                        }
                                        $url = rtrim(Coordinate::originRootUrl(), '/') . '/storage/' . $path;

                                        return new HtmlString(
                                            '<img src="' . e($url) . '" alt="Logo Facture" style="max-height:120px;height:auto;width:auto;border-radius:6px;">'
                                        );
                                    })
                                    ->columnSpanFull(),
                                FileUpload::make('logo_facture')
                                    ->label('Logo Facture (remplacer)')
                                    ->disk('public')
                                    ->directory('coordonnees')
                                    ->image()
                                    ->imageEditor()
                                    ->maxSize(2048)
                                    ->columnSpanFull(),
                            ]),
                        ]),

                    Tab::make('Descriptions')
                        ->schema([
                            Section::make()->schema([
                                Forms\Components\Textarea::make('short_description_fr')
                                    ->label('description footer')
                                    ->rows(3)
                                    ->columnSpanFull(),
                                Forms\Components\Textarea::make('description_fr')
                                    ->label('Description')
                                    ->rows(5)
                                    ->columnSpanFull(),
                                Forms\Components\Textarea::make('note')
                                    ->label('Note')
                                    ->rows(3)
                                    ->columnSpanFull(),
                                Forms\Components\Textarea::make('gelocalisation')
                                    ->label('Géolocalisation')
                                    ->rows(3)
                                    ->columnSpanFull(),
                                Forms\Components\Textarea::make('note_devis')
                                    ->label('Note Devis')
                                    ->rows(3)
                                    ->columnSpanFull(),
                            ]),
                        ]),

                    Tab::make('Facturation')
                        ->schema([
                            Section::make()->schema([
                                Grid::make(3)->schema([
                                    Forms\Components\TextInput::make('timbre')
                                        ->label('Timbre')
                                        ->numeric(),
                                    Forms\Components\TextInput::make('tva')
                                        ->label('TVA')
                                        ->numeric(),
                                    Forms\Components\TextInput::make('frais_livraison')
                                        ->label('Frais Livraison')
                                        ->numeric()
                                        ->prefix('TND'),
                                ]),
                                Forms\Components\TextInput::make('short_description_ticket')
                                    ->label('Description Ticket')
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('footer_ticket')
                                    ->label('Footer Ticket')
                                    ->maxLength(500),
                            ]),
                        ]),

                    Tab::make('Marketing & Contenu')
                        ->schema([
                            Section::make()->schema([
                                Forms\Components\TextInput::make('social_media_text_fr')
                                    ->label('Social Media Text')
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('newsletter_text_fr')
                                    ->label('Newsletter Text')
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('store_text_fr')
                                    ->label('Store Text')
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('appstore_link')
                                    ->label('Appstore Link')
                                    ->url()
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('playstore_link')
                                    ->label('Playstore Link')
                                    ->url()
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('copyright')
                                    ->label('Copyright')
                                    ->maxLength(500),
                                Forms\Components\TextInput::make('title_faq')
                                    ->label('Titre (FAQ)')
                                    ->maxLength(255),
                            ]),
                        ]),

                ])
                ->persistTabInQueryString()
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('logo')
                    ->label('Logo')
                    ->html()
                    ->formatStateUsing(function ($state): string {
                        if (empty($state)) {
                            return '—';
                        }
                        $path = ltrim(str_replace('\\', '/', trim((string) $state)), '/');
                        if (str_starts_with($path, 'storage/')) {
                            $path = substr($path, 8);
                        }
                        if (! Storage::disk('public')->exists($path)) {
                            return '—';
                        }
                        $url = rtrim(Coordinate::originRootUrl(), '/') . '/storage/' . $path;

                        return '<img src="' . e($url) . '" style="height:48px;width:48px;object-fit:cover;border-radius:50%;">';
                    }),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Société')
                    ->searchable()
                    ->limit(30),
                Tables\Columns\TextColumn::make('abbreviation')
                    ->label('Abréviation'),
                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('phone_1')
                    ->label('Tél.'),
                Tables\Columns\TextColumn::make('adresse_fr')
                    ->label('Adresse')
                    ->limit(40),
            ])
            ->actions([
                Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageCoordinates::route('/'),
        ];
    }
}
