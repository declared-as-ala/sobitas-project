<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use Filament\Forms;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Components\Section;
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
                ->afterStateUpdated(function ($state, $set, $get) {
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
            Forms\Components\Select::make('body_editor_type')
                ->label('Type d\'éditeur')
                ->options([
                    'html' => 'HTML (code brut)',
                    'rich' => 'Éditeur visuel (Rich Editor)',
                ])
                ->default('html')
                ->live(),
            Section::make('Contenu')
                ->description('Saisissez le corps de la page en HTML brut ou utilisez l\'éditeur visuel. L\'aperçu ci-dessous applique Bootstrap 5 au rendu (les balises <script> sont retirées dans l\'aperçu uniquement).')
                ->schema(function ($get) {
                    $editorType = $get('body_editor_type') ?? 'html';
                    
                    if ($editorType === 'html') {
                        return [
                            Forms\Components\Textarea::make('body')
                                ->label('Code HTML')
                                ->rows(18)
                                ->columnSpanFull()
                                ->live(debounce: 600)
                                ->helperText('Exemples : <h2>Titre</h2>, <p>Paragraphe</p>, <ul><li>…</li></ul>, <a href="…">lien</a>, classes Bootstrap : <div class="alert alert-info">…</div>.')
                                ->extraInputAttributes([
                                    'class' => 'font-monospace text-sm',
                                    'spellcheck' => 'false',
                                    'style' => 'min-height: 280px;',
                                ]),
                            Forms\Components\ViewField::make('_body_html_preview')
                                ->label('Aperçu')
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
                        $ext  = $file->getClientOriginalExtension() ?: 'jpg';
                        $path = $file->storeAs('pages', \Illuminate\Support\Str::uuid() . '.' . $ext, 'public');
                    }
                    return (new \App\Services\Media\ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
                }),
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
