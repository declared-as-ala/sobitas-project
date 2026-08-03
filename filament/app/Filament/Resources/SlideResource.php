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
use Filament\Notifications\Notification;
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
                ->description('Un slide = une image, rien d\'autre. Tout le texte (titre, accroche, bouton) doit être intégré DANS l\'image au moment du design. L\'image mobile est optionnelle mais fortement recommandée : une image panoramique recadrée sur un téléphone perd presque toujours le sujet et le texte.')
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
                        // Reversed instruction (owner, 2026-08-03). It used to say "n'incrustez
                        // aucun texte" because the site painted its own overlay; the site no
                        // longer paints anything, so the opposite is now true and leaving the old
                        // sentence would produce blank-looking banners.
                        ->helperText('2400 × 1000 px recommandé. Le texte doit être intégré dans l\'image — le site n\'ajoute plus aucun texte par-dessus. Évitez de placer du texte dans les 60 px de gauche et de droite : les flèches du carrousel s\'y affichent. Max 4 Mo.')
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
                        ->helperText('1200 × 1500 px recommandé (portrait), texte intégré dans l\'image. Si vide, l\'image ordinateur est utilisée — elle sera alors recadrée et une partie du texte peut disparaître sur téléphone. Max 4 Mo.')
                        ->deletable(true)
                        ->downloadable(false)
                        ->openable(false)
                        ->visibility('public')
                        ->preserveFilenames(false)
                        ->columnSpanFull()
                        ->saveUploadedFileUsing(fn (\Livewire\Features\SupportFileUploads\TemporaryUploadedFile $file): string => self::storeAsWebp($file)),
                ]),

            /*
             * THE "TEXTE AFFICHÉ SUR L'IMAGE" SECTION IS GONE.
             *
             * It held Badge, Titre, Sous-titre and Texte du bouton, and the storefront painted all
             * four over the artwork on a dark plate. Owner, 2026-08-03, after reviewing with a
             * client: "take off all the text shown on the slide — generate an image in any
             * graphic-design tool and put it in the slider, and that's all."
             *
             * The four COLUMNS are deliberately left in the database and still returned by the
             * API. Dropping them would be an irreversible migration on a table whose schema is not
             * in version control (see the 2026_08_03 migration and Phase 0), to delete text the
             * owner spent time writing. Removing the FIELDS is enough: nothing writes them and
             * nothing renders them, and `titre` is still read once — as a fallback source for the
             * alt text, so existing slides keep a real description instead of a generic one.
             */
            Section::make('Destination et référencement')
                ->description('Les deux seules informations texte d\'un slide. Aucune des deux ne s\'affiche sur l\'image.')
                ->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('lien')
                            ->label('Lien du slide')
                            ->maxLength(500)
                            ->placeholder('Ex. : /proteine-whey')
                            // The whole banner is the link now that there is no button, so this
                            // matters MORE than it did, not less. Left empty the slide still goes
                            // somewhere (/shop), which is why a blank link is invisible in testing
                            // and only shows up as every banner sending traffic to one generic page.
                            ->helperText('Toute l\'image est cliquable. Vide = le slide envoie vers /shop. Chemin interne (/proteine-whey) ou URL complète.')
                            ->columnSpan(2),
                        Forms\Components\TextInput::make('alt')
                            ->label('Texte alternatif (SEO)')
                            ->maxLength(255)
                            ->placeholder('Ex. : Athlète tenant un pot de whey Protein.tn')
                            // Now the ONLY text a slide carries, and the only thing Google and a
                            // screen reader can read from the banner — so it is worth more than it
                            // was when a headline was also in the HTML.
                            ->helperText('Décrit l\'image pour Google et les lecteurs d\'écran. C\'est désormais le seul texte du slide : décrivez ce que montre l\'image, y compris le texte qui y est intégré.')
                            ->columnSpan(2),
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
                    ]),
                ]),
        ]);
    }

    /**
     * The fields whose loss must be REPORTED rather than swallowed.
     *
     * Keyed by form field → human label, so the warning names what the admin actually typed. Down
     * to the two that remain on the form; the removed editorial fields cannot fail to save because
     * nothing writes them any more. `lien` stays because it is one of the two columns proven to be
     * missing from every migration — the original silent-write-failure this guard was built for.
     */
    private const VERIFIED_TEXT_FIELDS = [
        'lien' => 'Lien du slide',
        'alt'  => 'Texte alternatif',
    ];

    /**
     * Read the row back after a save and shout if something the admin typed did not persist.
     *
     * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────
     * The owner's report was "it says it saved, but it's not showing". That sentence describes a
     * SILENT WRITE FAILURE, and it is the single most expensive kind of bug to own: the admin has
     * no way to distinguish "the field did not save" from "the field saved but the site is
     * cached" from "the field saved and I am looking at the wrong slide". They retype it, it
     * fails again, and they lose trust in the panel.
     *
     * Filament's green "Enregistré" toast reports that the SQL statement ran, not that the value
     * landed. When a column is missing, or is silently truncated, or a mutator drops the value,
     * the statement can succeed while the attribute does not survive. This re-reads the row from
     * the database and compares it to what was submitted.
     *
     * It is deliberately a WARNING, not an exception: the rest of the slide did save, and
     * throwing here would roll that back and make things worse. It stays on screen (persistent)
     * because the whole point is that a transient green toast is what hid this for weeks.
     *
     * Cost is one indexed primary-key SELECT per save of a table with a handful of rows.
     */
    public static function verifyPersisted(Slide $record, array $data): void
    {
        $fresh = $record->fresh();

        if (! $fresh) {
            return;
        }

        $lost = [];

        foreach (self::VERIFIED_TEXT_FIELDS as $column => $label) {
            $submitted = trim((string) ($data[$column] ?? ''));

            if ($submitted === '') {
                continue; // Cleared on purpose, or never filled — nothing to verify.
            }

            $stored = trim((string) ($fresh->getAttribute($column) ?? ''));

            if ($stored === '') {
                $lost[] = $label;
                Log::error('slides.field_did_not_persist', [
                    'record_id' => $record->getKey(),
                    'column'    => $column,
                    'submitted' => mb_substr($submitted, 0, 120),
                    'exists'    => DbSchema::hasColumn('slides', $column),
                ]);
            }
        }

        if ($lost === []) {
            return;
        }

        Notification::make()
            ->danger()
            ->title('Certains champs n\'ont PAS été enregistrés')
            ->body(
                'Le reste du slide est enregistré, mais ces champs sont revenus vides : '
                . implode(', ', $lost)
                . '. Ce n\'est pas une erreur de votre part — signalez-le au développeur.'
            )
            ->persistent()
            ->send();
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
                // `alt` rather than `titre`: the title is no longer displayed anywhere, so a list
                // keyed on it would identify rows by a field the admin can no longer edit.
                Tables\Columns\TextColumn::make('alt')
                    ->label('Description (SEO)')
                    ->limit(50)
                    ->searchable()
                    ->sortable()
                    ->placeholder('— manquant —'),
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
                    })
                    // Re-read the row and warn if anything the admin typed did not land. See
                    // verifyPersisted() — "it says saved but it's not showing" is exactly the
                    // report this makes impossible to get again without a diagnosis attached.
                    ->after(fn (Slide $record, array $data) => self::verifyPersisted($record, $data)),
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
