<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use App\Support\PublicSlug;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
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
                ->afterStateUpdated(function ($state, $set, $get): void {
                    if (blank($get('slug'))) {
                        $set('slug', Str::slug($state));
                    }
                }),

            Forms\Components\TextInput::make('slug')
                ->label('Slug (URL)')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true)
                ->rules(['alpha_dash:ascii'])
                ->rule(function (?Page $record): \Closure {
                    return function (string $attribute, mixed $value, \Closure $fail) use ($record): void {
                        $conflicts = PublicSlug::conflictsForPageSlug((string) $value, $record?->getKey());

                        if ($conflicts !== []) {
                            $fail('Ce slug est deja utilise par: ' . implode(', ', $conflicts) . '. Choisissez un slug unique pour eviter un conflit URL public.');
                        }
                    };
                })
                ->helperText('Les pages publiques peuvent aussi etre accessibles en /slug. Evitez les slugs de categories, marques et routes systeme.'),

            Forms\Components\Textarea::make('excerpt')
                ->label('Extrait')
                ->rows(2)
                ->columnSpanFull(),

            Forms\Components\Select::make('body_editor_type')
                ->label('Type d editeur')
                ->options([
                    'html' => 'HTML (code brut)',
                    'rich' => 'Editeur visuel (Rich Editor)',
                ])
                ->default('html')
                ->live(),

            Section::make('Contenu')
                ->description('Saisissez le corps de la page en HTML brut ou utilisez l editeur visuel. L apercu applique Bootstrap 5 au rendu.')
                ->schema(function ($get): array {
                    $editorType = $get('body_editor_type') ?? 'html';

                    if ($editorType === 'html') {
                        return [
                            Forms\Components\Textarea::make('body')
                                ->label('Code HTML')
                                ->rows(18)
                                ->columnSpanFull()
                                ->live(debounce: 600)
                                ->helperText('Exemples : <h2>Titre</h2>, <p>Paragraphe</p>, <ul><li>...</li></ul>, classes Bootstrap.')
                                ->extraInputAttributes([
                                    'class' => 'font-monospace text-sm',
                                    'spellcheck' => 'false',
                                    'style' => 'min-height: 280px;',
                                ]),
                            Forms\Components\ViewField::make('_body_html_preview')
                                ->label('Apercu')
                                ->view('filament.forms.components.page-body-html-preview')
                                ->dehydrated(false)
                                ->columnSpanFull(),
                        ];
                    }

                    return [
                        Forms\Components\RichEditor::make('body')
                            ->label('Contenu')
                            ->fileAttachmentsDisk('public')
                            ->fileAttachmentsDirectory('pages/editor')
                            ->columnSpanFull(),
                    ];
                })
                ->columnSpanFull(),

            FileUpload::make('image')
                ->label('Image')
                ->disk('public')
                ->directory('pages')
                ->image()
                ->imageEditor()
                ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                    $path = $file->store('pages', 'public');
                    if (! $path) {
                        $ext = $file->getClientOriginalExtension() ?: 'jpg';
                        $path = $file->storeAs('pages', Str::uuid() . '.' . $ext, 'public');
                    }

                    return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                }),

            Forms\Components\Select::make('status')
                ->label('Statut')
                ->options(Page::getStatusOptions())
                ->default(Page::STATUS_ACTIVE)
                ->required(),

            Section::make('SEO')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('meta_title')
                            ->label('Meta title')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('canonical_url')
                            ->label('URL canonique')
                            ->maxLength(1024)
                            ->helperText('Laissez vide pour utiliser https://protein.tn/{slug}.'),
                        Forms\Components\Textarea::make('meta_description')
                            ->label('Meta description')
                            ->rows(2)
                            ->maxLength(500)
                            ->columnSpanFull(),
                        Forms\Components\TextInput::make('meta_keywords')
                            ->label('Meta mots-cles')
                            ->maxLength(500)
                            ->columnSpanFull(),
                        Forms\Components\Toggle::make('robots_index')
                            ->label('Indexable')
                            ->default(true)
                            ->inline(false),
                        Forms\Components\Toggle::make('robots_follow')
                            ->label('Follow')
                            ->default(true)
                            ->inline(false),
                        Forms\Components\TextInput::make('og_title')
                            ->label('Open Graph title')
                            ->maxLength(255),
                        Forms\Components\Textarea::make('og_description')
                            ->label('Open Graph description')
                            ->rows(2),
                        FileUpload::make('og_image')
                            ->label('Open Graph image')
                            ->disk('public')
                            ->directory('pages/og')
                            ->image()
                            ->imageEditor()
                            ->saveUploadedFileUsing(function (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string {
                                $path = $file->store('pages/og', 'public');
                                if (! $path) {
                                    $ext = $file->getClientOriginalExtension() ?: 'jpg';
                                    $path = $file->storeAs('pages/og', Str::uuid() . '.' . $ext, 'public');
                                }

                                return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                            })
                            ->columnSpanFull(),
                    ]),
                ])
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
                    ->color(fn (string $state): string => $state === Page::STATUS_ACTIVE ? 'success' : 'gray')
                    ->sortable(),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Modifie le')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->actions([
                Actions\ViewAction::make()->slideOver(),
                Actions\EditAction::make()->slideOver(),
                Actions\DeleteAction::make(),
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
