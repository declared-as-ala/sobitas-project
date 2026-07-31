<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SlideResource\Pages;
use App\Filament\Support\ImagePath;
use App\Models\Slide;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use App\Services\Media\ConvertUploadedImageToWebp;
use Illuminate\Support\Facades\Log;
// Aliased: `Schema` is already taken by Filament\Schemas\Schema (the form() signature).
use Illuminate\Support\Facades\Schema as DbSchema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SlideResource extends Resource
{
    protected static ?string $model = Slide::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-photo';
    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';
    protected static ?int $navigationSort = 2;
    protected static ?string $modelLabel = 'Slide';
    protected static ?string $pluralModelLabel = 'Slides';

    /**
     * Store an upload under slides/ and convert it to WebP.
     * Shared by both the desktop and mobile upload fields so they can never drift.
     */
    private static function storeAsWebp(\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string
    {
        $path = $file->store('slides', 'public');
        if (! $path) {
            $ext  = $file->getClientOriginalExtension() ?: 'jpg';
            $path = $file->storeAs('slides', Str::uuid() . '.' . $ext, 'public');
        }

        return (new ConvertUploadedImageToWebp())->convertStoredPathToWebp((string) $path) ?? (string) $path;
    }

    /**
     * Delete BOTH stored crops when a slide is removed. The mobile image is a separate
     * upload, so cleaning up only `image` would orphan a file on disk for every slide
     * that had a dedicated phone crop.
     */
    private static function purgeImages(Slide $record, string $context, array $deletingIds = []): void
    {
        $deletingIds = $deletingIds ?: [$record->getKey()];

        foreach (['image', 'image_mobile'] as $attribute) {
            $path = ImagePath::normalize($record->{$attribute} ?? null);

            if (! $path) {
                continue;
            }

            // NEVER delete a file another surviving slide still points at. Two rows can legitimately
            // reference one asset (a hand-made duplicate, or a legacy row whose file could not be
            // copied during the mobile→image_mobile merge). Without this guard, deleting the
            // seemingly-redundant row would purge the live slide's image — unrecoverably.
            //
            // Compared in PHP after ImagePath::normalize() rather than with a SQL LIKE, because
            // this table stores full https://admin.protein.tn/storage/... URLs alongside bare
            // relative paths, so raw equality misses matches. A `LIKE '%'.$path` would fix that
            // but is both unescaped (a literal _ or % in a filename becomes a wildcard) and
            // unanchored ('%slides/a.webp' also matches 'slides/xa.webp'), silently keeping files
            // forever. `slides` holds a handful of rows, so normalizing them all is exact and cheap.
            $stillReferenced = Slide::query()
                ->whereNotIn('id', $deletingIds)
                ->get(['id', 'image', 'image_mobile'])
                ->contains(fn (Slide $other) => ImagePath::normalize($other->image) === $path
                    || ImagePath::normalize($other->image_mobile) === $path);

            if ($stillReferenced) {
                Log::info('media.delete_skipped_shared', [
                    'context'   => $context,
                    'attribute' => $attribute,
                    'path'      => $path,
                    'record_id' => $record->id,
                    'reason'    => 'another slide still references this file',
                ]);

                continue;
            }

            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                Log::info('media.manual_delete', [
                    'context'   => $context,
                    'disk'      => 'public',
                    'attribute' => $attribute,
                    'path'      => $path,
                    'record_id' => $record->id,
                ]);
            }
        }
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->columns(1)->schema([
            Section::make('Images')
                ->description('Un slide = une ligne. L\'image mobile est optionnelle mais recommandée : une photo panoramique recadrée sur un téléphone perd souvent le sujet.')
                ->schema([
                    FileUpload::make('image')
                        ->label('Image (ordinateur)')
                        ->disk('public')
                        ->directory('slides')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios([null, '21:9', '16:9', '4:3'])
                        ->imagePreviewHeight('280')
                        ->maxSize(4096)
                        ->required()
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                        ->helperText('2400 × 1000 px recommandé. Gardez les 40% de gauche calmes : c\'est là que le titre s\'affiche. N\'incrustez aucun texte dans l\'image. Max 4 Mo.')
                        ->deletable(true)
                        ->downloadable(false)
                        ->openable(false)
                        ->visibility('public')
                        ->preserveFilenames(false)
                        ->columnSpanFull()
                        ->saveUploadedFileUsing(fn (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string => self::storeAsWebp($file)),

                    FileUpload::make('image_mobile')
                        ->label('Image (mobile) — optionnel')
                        ->disk('public')
                        ->directory('slides')
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios([null, '4:5', '3:4', '1:1'])
                        ->imagePreviewHeight('280')
                        ->maxSize(4096)
                        ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                        ->helperText('1200 × 1500 px recommandé (portrait). Sujet dans les 55% du haut, bas calme pour le texte. Si vide, l\'image ordinateur est utilisée. Max 4 Mo.')
                        ->deletable(true)
                        ->downloadable(false)
                        ->openable(false)
                        ->visibility('public')
                        ->preserveFilenames(false)
                        ->columnSpanFull()
                        ->saveUploadedFileUsing(fn (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string => self::storeAsWebp($file)),
                ]),

            Section::make('Texte affiché sur l\'image')
                ->description('Laissez vide pour un slide sans texte. Le texte est ajouté par-dessus l\'image — ne l\'incrustez pas dans la photo.')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('badge')
                            ->label('Badge (petite pastille)')
                            ->maxLength(24)
                            ->placeholder('Ex. : Nouveauté')
                            ->helperText('Court. Affiché en pastille orange au-dessus du titre. Vide = aucune pastille.')
                            ->columnSpan(2),
                        // Textarea, not TextInput: the hero renders the FIRST line white and the
                        // rest in accent orange, which is what produces the two-tone headline in
                        // the approved design — and a single-line input cannot hold that newline.
                        Forms\Components\Textarea::make('titre')
                            ->label('Titre')
                            ->rows(2)
                            ->maxLength(255)
                            ->placeholder("Alimente\nTa performance")
                            ->helperText('Astuce : passez à la ligne pour couper le titre en deux — la 1ʳᵉ ligne s\'affiche en blanc, la suite en orange.')
                            ->columnSpan(2),
                        Forms\Components\Textarea::make('sous_titre')
                            ->label('Sous-titre')
                            ->rows(2)
                            ->maxLength(500)
                            ->placeholder('Une phrase courte. Ex. : Whey, créatine et compléments 100% authentiques.')
                            ->columnSpan(2),
                        Forms\Components\TextInput::make('cta_label')
                            ->label('Texte du bouton')
                            ->maxLength(120)
                            ->placeholder('Ex. : Découvrir la gamme'),
                        Forms\Components\TextInput::make('lien')
                            ->label('Lien du bouton')
                            ->maxLength(500)
                            ->placeholder('/shop/proteines')
                            ->helperText('Chemin interne (/shop/proteines) ou URL complète.'),
                    ]),
                ]),

            Section::make('Affichage')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\Toggle::make('is_active')
                            ->label('Actif')
                            ->helperText('Décochez pour retirer le slide du site sans le supprimer.')
                            ->default(true),
                        Forms\Components\TextInput::make('ordre')
                            ->label('Ordre d\'affichage')
                            ->numeric()
                            ->minValue(0)
                            // Continue the sequence instead of defaulting to 0. The migration
                            // backfills existing rows to 1..N, so a literal 0 would sort a newly
                            // created slide AHEAD of everything and silently hijack the main hero
                            // slot — the opposite of what "le plus petit passe en premier" implies
                            // to someone adding a secondary banner. max+1 puts it last.
                            //
                            // hasColumn-guarded for the same reason as ApisController::slides():
                            // this resource can render before the migration has added the column.
                            ->default(fn (): int => DbSchema::hasColumn('slides', 'ordre')
                                ? ((int) Slide::max('ordre')) + 1
                                : 0)
                            ->helperText('Le plus petit chiffre passe en premier. Vous pouvez aussi glisser-déposer les lignes.'),
                        Forms\Components\TextInput::make('alt')
                            ->label('Texte alternatif (SEO)')
                            ->maxLength(255)
                            ->placeholder('Ex. : Athlète tenant un pot de whey Protein.tn')
                            ->helperText('Décrit l\'image pour Google et les lecteurs d\'écran. Important pour le référencement.')
                            ->columnSpan(2),
                    ]),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image')
                    ->label('Couverture')
                    ->getStateUsing(fn ($record) => ImagePath::normalizeExisting($record->image))
                    ->disk('public')
                    ->height(60)
                    ->width(120)
                    ->extraImgAttributes(['style' => 'object-fit:cover;border-radius:6px;']),
                Tables\Columns\TextColumn::make('titre')
                    ->label('Titre')
                    ->searchable()
                    ->sortable()
                    ->default('—'),
                Tables\Columns\IconColumn::make('image_mobile')
                    ->label('Mobile')
                    ->boolean()
                    ->getStateUsing(fn ($record) => filled($record->image_mobile))
                    ->trueIcon('heroicon-o-device-phone-mobile')
                    ->falseIcon('heroicon-o-minus-small')
                    ->tooltip(fn ($record) => filled($record->image_mobile)
                        ? 'Image mobile dédiée'
                        : 'Utilise l\'image ordinateur sur mobile'),
                // Read-only indicator rather than an inline ToggleColumn: this repo's Filament
                // build has no CI lint, and IconColumn is already proven in use across several
                // other resources. State is changed via the "Actif" toggle in the edit form.
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Actif')
                    ->boolean(),
                Tables\Columns\TextColumn::make('lien')
                    ->label('Lien')
                    ->limit(40)
                    ->copyable()
                    ->copyMessage('Lien copié !')
                    ->toggleable(),
            ])
            ->filters([
                // Deliberately NOT defaulted to "active only": hiding deactivated slides would
                // make them look deleted to a non-technical admin. Safe to show them, because
                // the merge copies the asset and purgeImages is reference-guarded, so removing
                // the deactivated legacy row can no longer destroy a live slide's image.
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Actif'),
            ])
            // Drag-and-drop ordering — the owner reorders the hero without typing numbers.
            ->reorderable('ordre')
            ->defaultSort('ordre', 'asc')
            ->actions([
                Actions\EditAction::make()
                    ->slideOver()
                    // Normalize BEFORE the form hydrates. This table historically stores full
                    // https://admin.protein.tn/storage/... URLs alongside bare relative paths,
                    // and Filament's FileUpload runs an exists() check on the raw stored value:
                    // a URL fails that check and the component silently drops the file. With
                    // `image` required that hard-blocks saving ANY edit (titre, ordre, actif)
                    // without re-uploading, and `image_mobile` would dehydrate to NULL, wiping
                    // the crop and orphaning the file.
                    //
                    // Deliberately NOT ->afterStateHydrated(): that replaces BaseFileUpload's own
                    // hydration closure, which builds the [uuid => path] array the uploader UI
                    // needs, leaving state as a raw string. Mutating the record data instead
                    // hands the component a clean path and leaves its internals untouched.
                    ->mutateRecordDataUsing(function (array $data): array {
                        $data['image']        = ImagePath::normalize($data['image'] ?? null);
                        $data['image_mobile'] = ImagePath::normalize($data['image_mobile'] ?? null);

                        return $data;
                    }),
                Actions\DeleteAction::make()
                    ->before(fn (Slide $record) => self::purgeImages($record, 'slide.delete')),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make()
                    ->before(function ($records): void {
                        // Pass the whole batch: `before()` fires while every selected row still
                        // exists, so without this each row would see its siblings as live
                        // references and skip the purge, orphaning files on disk forever.
                        $ids = collect($records)->pluck('id')->all();

                        foreach ($records as $record) {
                            self::purgeImages($record, 'slide.bulk_delete', $ids);
                        }
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageSlides::route('/'),
        ];
    }
}
