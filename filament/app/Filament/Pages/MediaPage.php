<?php

namespace App\Filament\Pages;

use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Storage;

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
                    ->disk('public')
                    ->directory('media')
                    ->visibility('public')
                    ->maxSize(10240)
                    ->helperText('Max 10 Mo par fichier. Déposés dans storage/app/public/media'),
            ]);
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
        Notification::make()->title(count($files) . ' fichier(s) téléversé(s)')->success()->send();
    }

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'media';
    }

    public function getFiles(string $directory = ''): array
    {
        $disk = Storage::disk('public');
        $path = $directory ?: '';
        $files = [];
        try {
            $all = $disk->allFiles($path);
            foreach ($all as $file) {
                $files[] = [
                    'path' => $file,
                    'url'  => $disk->url($file),
                    'name' => basename($file),
                    'size' => $disk->size($file),
                    'last_modified' => $disk->lastModified($file),
                ];
            }
        } catch (\Throwable $e) {
            return [];
        }
        return collect($files)->sortByDesc('last_modified')->values()->all();
    }

    public function deleteFile(string $path): void
    {
        $disk = Storage::disk('public');
        if ($disk->exists($path)) {
            $disk->delete($path);
            Notification::make()->title('Fichier supprimé')->success()->send();
        } else {
            Notification::make()->title('Fichier introuvable')->danger()->send();
        }
    }

    public function getViewData(): array
    {
        return [
            'files' => $this->getFiles(),
        ];
    }
}
