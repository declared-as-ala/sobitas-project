<?php

namespace App\Filament\Pages;

use App\Services\Media\MediaManagerService;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use RuntimeException;

class MediaPage extends Page implements HasForms
{
    use InteractsWithForms;

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

    public function mount(): void
    {
        $this->form->fill();
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->statePath('data')
            ->schema([
                \Filament\Forms\Components\FileUpload::make('uploadedFiles')
                    ->label('Téléverser des fichiers')
                    ->multiple()
                    ->disk($this->media()->getDiskName())
                    ->directory(fn (): string => $this->currentPath)
                    ->visibility('public')
                    ->maxSize(10240)
                    ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
                    ->helperText('Max 10 Mo par image. Le televersement suit le dossier courant.'),
            ]);
    }

    public function openFolder(string $path): void
    {
        try {
            $this->currentPath = $this->media()->normalizePath($path);
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
    }

    public function createFolder(string $name): void
    {
        try {
            $created = $this->media()->createFolder($this->currentPath, $name);
            Notification::make()->title('Dossier cree')->body($created)->success()->send();
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
            ->title(count($files) . ' fichier(s) televerse(s)')
            ->success()
            ->send();
    }

    public function deleteFile(string $path): void
    {
        try {
            $this->media()->deleteFile($path);
            Notification::make()->title('Fichier supprime')->success()->send();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function deleteFolder(string $path): void
    {
        try {
            $this->media()->deleteFolderIfEmpty($path);
            Notification::make()->title('Dossier supprime')->success()->send();

            if ($this->currentPath === $path) {
                $this->goUp();
            }
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function renameFile(string $path, string $newName): void
    {
        try {
            $this->media()->renameFile($path, $newName);
            Notification::make()->title('Fichier renomme')->success()->send();
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
    }

    public function renameFolder(string $path, string $newName): void
    {
        try {
            $newPath = $this->media()->renameFolder($path, $newName);
            Notification::make()->title('Dossier renomme')->success()->send();

            if ($this->currentPath === $path || str_starts_with($this->currentPath, $path . '/')) {
                $suffix = substr($this->currentPath, strlen($path));
                $this->currentPath = ltrim($newPath . $suffix, '/');
            }
        } catch (RuntimeException $e) {
            $this->notifyError($e->getMessage());
        }
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

        return array_merge($listing, [
            'typeOptions' => [
                'all' => 'Tous les medias',
                'images' => 'Images uniquement',
            ],
        ]);
    }

    private function media(): MediaManagerService
    {
        return app(MediaManagerService::class);
    }

    private function notifyError(string $message): void
    {
        Notification::make()->title($message)->danger()->send();
    }
}
