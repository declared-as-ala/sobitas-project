<?php

namespace App\Filament\Pages;

use App\Models\MediaLibraryItem;
use App\Services\Media\MediaLibraryItemService;
use App\Services\Media\MediaManagerService;
use Filament\Forms\Components\BaseFileUpload;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema as DbSchema;
use Illuminate\Support\Facades\Storage;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Livewire\WithFileUploads;
use RuntimeException;

class MediaPage extends Page implements HasForms
{
    use InteractsWithForms;
    use WithFileUploads;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-photo';

    protected static ?string $navigationLabel = 'Média';

    protected static ?string $title = 'Gestion des médias';

    protected static string | \UnitEnum | null $navigationGroup = 'Paramètres du site';

    protected static ?int $navigationSort = 10;

    protected string $view = 'filament.pages.media-page';

    public array $data = [];

    public string $currentPath = '';

    public string $search = '';

    public string $typeFilter = 'all';

    public ?string $selectedPath = null;

    public ?string $detailUrl = null;

    public string $detailAltText = '';

    public string $detailTitle = '';

    public string $detailCaption = '';

    public string $detailDescription = '';

    public string $detailMetaTitle = '';

    public string $detailMetaDescription = '';

    public $replacementFile = null;

    public function mount(): void
    {
        $this->form->fill();
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->schema([
                FileUpload::make('uploadedFiles')
                    ->label('Téléverser des fichiers')
                    ->multiple()
                    ->disk($this->media()->getDiskName())
                    ->directory(fn (): string => $this->currentPath)
                    ->visibility('public')
                    ->maxSize(10240)
                    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
                    ->helperText('Max 10 Mo par image. Le téléversement suit le dossier courant.')
                    ->saveUploadedFileUsing(function (BaseFileUpload $component, TemporaryUploadedFile $file): ?string {
                        try {
                            if (! $file->exists()) {
                                return null;
                            }
                        } catch (\Throwable) {
                            return null;
                        }

                        $storeMethod = $component->getVisibility() === 'public' ? 'storePubliclyAs' : 'storeAs';
                        $path = $file->{$storeMethod}(
                            $component->getDirectory(),
                            $component->getUploadedFileNameForStorage($file),
                            $component->getDiskName(),
                        );

                        if (is_string($path) && $path !== '') {
                            $this->library()->ensureFromDisk($component->getDiskName(), $path);
                        }

                        return $path;
                    }),
            ]);
    }

    public function openFolder(string $path): void
    {
        try {
            $this->currentPath = $this->media()->normalizePath($path);
            $this->selectedPath = null;
            $this->resetDetailFields();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function goToBreadcrumb(string $path = ''): void
    {
        $this->openFolder($path);
    }

    public function goUp(): void
    {
        if ($this->currentPath === '') {
            return;
        }

        $parts = explode('/', $this->currentPath);
        array_pop($parts);
        $this->currentPath = implode('/', $parts);
        $this->selectedPath = null;
        $this->resetDetailFields();
    }

    public function createFolder(string $name): void
    {
        try {
            $created = $this->media()->createFolder($this->currentPath, $name);
            Notification::make()->title('Dossier créé')->body($created)->success()->send();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function upload(): void
    {
        $data = $this->form->getState();
        $files = $data['uploadedFiles'] ?? [];

        if (empty($files)) {
            Notification::make()->title('Aucun fichier sélectionné')->warning()->send();

            return;
        }

        $this->form->fill(['uploadedFiles' => []]);

        Notification::make()
            ->title(count($files) . ' fichier(s) téléversé(s)')
            ->success()
            ->send();
    }

    public function deleteFile(string $path): void
    {
        try {
            $disk = $this->media()->getDiskName();
            $normalized = $this->library()->normalizeStoragePath($path);
            $this->media()->deleteFile($path);
            $this->library()->deleteByPath($disk, $normalized);
            if ($this->selectedPath === $normalized) {
                $this->selectedPath = null;
                $this->resetDetailFields();
            }
            Notification::make()->title('Fichier supprimé')->success()->send();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function deleteFolder(string $path): void
    {
        try {
            $disk = $this->media()->getDiskName();
            $normalized = $this->library()->normalizeStoragePath($path);
            $this->media()->deleteFolderIfEmpty($path);
            $this->library()->deleteByPath($disk, $normalized);
            Notification::make()->title('Dossier supprimé')->success()->send();

            if ($this->currentPath === $normalized) {
                $this->goUp();
            }
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function renameFile(string $path, string $newName): void
    {
        try {
            $disk = $this->media()->getDiskName();
            $from = $this->library()->normalizeStoragePath($path);
            $newPath = $this->media()->renameFile($path, $newName);
            $to = $this->library()->normalizeStoragePath($newPath);
            $this->library()->movePath($disk, $from, $to);
            if ($this->selectedPath === $from) {
                $this->selectedPath = $to;
            }
            Notification::make()->title('Fichier renommé')->success()->send();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function renameFolder(string $path, string $newName): void
    {
        try {
            $disk = $this->media()->getDiskName();
            $from = $this->library()->normalizeStoragePath($path);
            $newFolderPath = $this->media()->renameFolder($path, $newName);
            $to = $this->library()->normalizeStoragePath($newFolderPath);
            $this->library()->movePath($disk, $from, $to);
            if ($this->selectedPath === $from) {
                $this->selectedPath = $to;
            } elseif ($this->selectedPath !== null && str_starts_with($this->selectedPath, $from . '/')) {
                $this->selectedPath = $to . substr($this->selectedPath, strlen($from));
            }
            Notification::make()->title('Dossier renommé')->success()->send();

            if ($this->currentPath === $from || str_starts_with($this->currentPath, $from . '/')) {
                $suffix = substr($this->currentPath, strlen($from));
                $this->currentPath = ltrim($to . $suffix, '/');
            }
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function selectMedia(string $path): void
    {
        try {
            $disk = $this->media()->getDiskName();
            $normalized = $this->library()->normalizeStoragePath($path);
            if (! Storage::disk($disk)->exists($normalized)) {
                $this->notifyError('Fichier introuvable.');
                $this->selectedPath = null;
                $this->resetDetailFields();

                return;
            }
            $this->selectedPath = $normalized;
            $item = $this->library()->ensureFromDisk($disk, $normalized);
            $this->hydrateDetailFromItem($item, $disk);
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function clearSelection(): void
    {
        $this->selectedPath = null;
        $this->resetDetailFields();
    }

    public function saveMetadata(): void
    {
        if ($this->selectedPath === null || $this->selectedPath === '') {
            return;
        }

        $disk = $this->media()->getDiskName();
        if (! Storage::disk($disk)->exists($this->selectedPath)) {
            Notification::make()->title('Fichier introuvable sur le disque')->danger()->send();
            $this->clearSelection();

            return;
        }

        $validated = $this->validate([
            'detailAltText' => ['nullable', 'string', 'max:255'],
            'detailTitle' => ['nullable', 'string', 'max:255'],
            'detailCaption' => ['nullable', 'string', 'max:5000'],
            'detailDescription' => ['nullable', 'string', 'max:10000'],
            'detailMetaTitle' => ['nullable', 'string', 'max:255'],
            'detailMetaDescription' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->library()->updateMetadata($disk, $this->selectedPath, [
            'alt_text' => $validated['detailAltText'] ?? '',
            'title' => $validated['detailTitle'] ?? '',
            'caption' => $validated['detailCaption'] ?? '',
            'description' => $validated['detailDescription'] ?? '',
            'meta_title' => $validated['detailMetaTitle'] ?? '',
            'meta_description' => $validated['detailMetaDescription'] ?? '',
        ]);

        Notification::make()
            ->title('Informations enregistrées')
            ->success()
            ->send();
    }

    public function notifyUrlCopied(): void
    {
        Notification::make()
            ->title('URL copiée dans le presse-papiers')
            ->success()
            ->send();
    }

    public function replaceMedia(): void
    {
        if ($this->selectedPath === null || $this->selectedPath === '') {
            return;
        }

        $this->validate([
            'replacementFile' => ['required', 'file', 'max:10240', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/svg+xml'],
        ]);

        $disk = $this->media()->getDiskName();
        $path = $this->selectedPath;

        Storage::disk($disk)->delete($path);
        $binary = @file_get_contents($this->replacementFile->getRealPath() ?: '');
        if ($binary === false) {
            Notification::make()->title('Lecture du fichier impossible')->danger()->send();

            return;
        }
        Storage::disk($disk)->put($path, $binary);
        $this->replacementFile = null;

        $item = $this->library()->ensureFromDisk($disk, $path);
        $this->hydrateDetailFromItem($item, $disk);

        Notification::make()->title('Média remplacé')->success()->send();
    }

    public function updatedSearch(): void
    {
        $this->search = trim($this->search);
    }

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'media';
    }

    public function getViewData(): array
    {
        $listing = $this->media()->listContents($this->currentPath, $this->search, $this->typeFilter);
        $disk = $this->media()->getDiskName();
        $listing['files'] = $this->library()->mergeIntoFileRows($disk, $listing['files']);

        return array_merge($listing, [
            'typeOptions' => [
                'all' => 'Tous les médias',
                'images' => 'Images uniquement',
            ],
            'diskName' => $disk,
            'selectedItem' => $this->resolveSelectedItemForView($disk),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveSelectedItemForView(string $disk): ?array
    {
        if ($this->selectedPath === null || $this->selectedPath === '') {
            return null;
        }

        if (! Storage::disk($disk)->exists($this->selectedPath)) {
            return null;
        }

        $row = null;
        if (DbSchema::hasTable('media_library_items')) {
            $row = MediaLibraryItem::query()
                ->where('disk', $disk)
                ->where('path', $this->selectedPath)
                ->first();
        }

        $url = Storage::disk($disk)->url($this->selectedPath);
        $mime = $row?->mime_type;
        if ($mime === null) {
            try {
                $mime = Storage::disk($disk)->mimeType($this->selectedPath);
            } catch (\Throwable) {
                $mime = null;
            }
        }

        $size = $row?->size;
        if ($size === null) {
            try {
                $size = (int) Storage::disk($disk)->size($this->selectedPath);
            } catch (\Throwable) {
                $size = 0;
            }
        }

        [$w, $h] = MediaLibraryItem::readDimensions($disk, $this->selectedPath);

        $modifiedTs = Storage::disk($disk)->lastModified($this->selectedPath);

        return [
            'path' => $this->selectedPath,
            'url' => $url,
            'file_name' => basename($this->selectedPath),
            'mime_type' => $mime,
            'size' => $size,
            'width' => $row?->width ?? $w,
            'height' => $row?->height ?? $h,
            'created_at_label' => $row?->created_at
                ? $row->created_at->locale('fr')->translatedFormat('d M Y à H:i')
                : null,
            'modified_at_label' => Carbon::createFromTimestamp($modifiedTs)->locale('fr')->translatedFormat('d M Y à H:i'),
        ];
    }

    private function hydrateDetailFromItem(MediaLibraryItem $item, string $disk): void
    {
        $this->detailUrl = Storage::disk($disk)->url($item->path);
        $this->detailAltText = (string) ($item->alt_text ?? '');
        $this->detailTitle = (string) ($item->title ?? '');
        $this->detailCaption = (string) ($item->caption ?? '');
        $this->detailDescription = (string) ($item->description ?? '');
        $this->detailMetaTitle = (string) ($item->meta_title ?? '');
        $this->detailMetaDescription = (string) ($item->meta_description ?? '');
    }

    private function resetDetailFields(): void
    {
        $this->detailUrl = null;
        $this->detailAltText = '';
        $this->detailTitle = '';
        $this->detailCaption = '';
        $this->detailDescription = '';
        $this->detailMetaTitle = '';
        $this->detailMetaDescription = '';
        $this->replacementFile = null;
    }

    private function media(): MediaManagerService
    {
        return app(MediaManagerService::class);
    }

    private function library(): MediaLibraryItemService
    {
        return app(MediaLibraryItemService::class);
    }

    private function notifyError(string $message): void
    {
        Notification::make()->title($message)->danger()->send();
    }
}
