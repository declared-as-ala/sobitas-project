<x-filament-panels::page>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        .media-bootstrap .card {
            border-radius: .85rem;
            border: 1px solid #e5e7eb;
            transition: all .2s ease-in-out;
        }
        .media-bootstrap .card:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .08);
        }
        .media-bootstrap .thumb {
            aspect-ratio: 1/1;
            border-radius: .7rem;
            overflow: hidden;
            background: #f8fafc;
        }
        .media-bootstrap .thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .media-bootstrap .crumb-btn {
            border: none;
            background: transparent;
            color: #475569;
            font-weight: 500;
            padding: 0;
        }
        .media-bootstrap .crumb-btn:hover {
            color: #2563eb;
        }
    </style>

    <div class="media-bootstrap" x-data>
        <div class="card shadow-sm">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex flex-wrap align-items-center gap-2 mb-4 small text-secondary">
                    <button type="button" wire:click="goToBreadcrumb('')" class="crumb-btn">Dashboard / Media</button>
                    @foreach ($breadcrumbs as $breadcrumb)
                        <span>/</span>
                        <button type="button" wire:click="goToBreadcrumb({{ json_encode($breadcrumb['path']) }})" class="crumb-btn">
                            {{ $breadcrumb['name'] }}
                        </button>
                    @endforeach
                </div>

                <div class="row g-3 align-items-end mb-4">
                    <div class="col-lg-4">
                        <label class="form-label fw-semibold mb-1">Recherche</label>
                        <x-filament::input.wrapper>
                            <x-filament::input type="text" wire:model.live.debounce.400ms="search" placeholder="Rechercher dans ce dossier..." />
                        </x-filament::input.wrapper>
                    </div>
                    <div class="col-lg-3">
                        <label class="form-label fw-semibold mb-1">Filtre</label>
                        <x-filament::input.wrapper>
                            <x-filament::input.select wire:model.live="typeFilter">
                                @foreach ($typeOptions as $value => $label)
                                    <option value="{{ $value }}">{{ $label }}</option>
                                @endforeach
                            </x-filament::input.select>
                        </x-filament::input.wrapper>
                    </div>
                    <div class="col-lg-5 d-flex flex-wrap justify-content-lg-end gap-2">
                        <x-filament::button color="gray" icon="heroicon-o-arrow-up" wire:click="goUp" :disabled="$path === ''">
                            Dossier parent
                        </x-filament::button>
                        <x-filament::button
                            color="gray"
                            icon="heroicon-o-folder-plus"
                            x-on:click="const name = prompt('Nom du dossier'); if (name && name.trim() !== '') { $wire.createFolder(name.trim()); }"
                        >
                            Nouveau dossier
                        </x-filament::button>
                    </div>
                </div>

                <form wire:submit="upload" class="mb-4">
                    {{ $this->form }}
                    <div class="mt-3">
                        <x-filament::button type="submit" icon="heroicon-o-arrow-up-tray">
                            Téléverser dans ce dossier
                        </x-filament::button>
                    </div>
                </form>

                <div class="small text-secondary mb-3">
                    Dossier courant: <span class="fw-semibold">{{ $path === '' ? '/' : $path }}</span>
                </div>

                @if (count($directories) === 0 && count($files) === 0)
                    <div class="border border-secondary-subtle rounded-3 p-5 text-center text-secondary">
                        Aucun élément trouvé dans ce dossier.
                    </div>
                @else
                    @if (count($directories) > 0)
                        <h6 class="fw-bold mb-3">Dossiers</h6>
                        <div class="row g-3 mb-4">
                            @foreach ($directories as $directory)
                                <div class="col-6 col-md-4 col-xl-2">
                                    <div class="card h-100">
                                        <div class="card-body p-3">
                                            <button type="button" wire:click="openFolder({{ json_encode($directory['path']) }})" class="btn btn-link text-decoration-none text-start w-100 p-0">
                                                <div class="d-flex align-items-center gap-2 mb-2">
                                                    <x-filament::icon icon="heroicon-o-folder" class="h-7 w-7 text-primary-500" />
                                                    <span class="small fw-semibold text-truncate">{{ $directory['name'] }}</span>
                                                </div>
                                            </button>
                                            <div class="d-flex flex-wrap gap-1">
                                                <x-filament::button
                                                    size="xs"
                                                    color="gray"
                                                    x-on:click="const name = prompt('Nouveau nom du dossier', @js($directory['name'])); if (name && name.trim() !== '') { $wire.renameFolder(@js($directory['path']), name.trim()); }"
                                                >
                                                    Renommer
                                                </x-filament::button>
                                                <x-filament::button
                                                    size="xs"
                                                    color="danger"
                                                    wire:click="deleteFolder({{ json_encode($directory['path']) }})"
                                                    wire:confirm="Supprimer ce dossier vide ?"
                                                >
                                                    Supprimer
                                                </x-filament::button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    @endif

                    @if (count($files) > 0)
                        <h6 class="fw-bold mb-3">Fichiers</h6>
                        <div class="row g-3">
                            @foreach ($files as $file)
                                <div class="col-6 col-md-4 col-xl-2">
                                    <div class="card h-100">
                                        <div class="card-body p-3">
                                            <div class="thumb mb-2">
                                                @if ($file['is_image'])
                                                    <img src="{{ $file['url'] }}" alt="{{ $file['name'] }}" loading="lazy" />
                                                @else
                                                    <div class="d-flex align-items-center justify-content-center h-100">
                                                        <x-filament::icon icon="heroicon-o-document" class="h-10 w-10 text-gray-500" />
                                                    </div>
                                                @endif
                                            </div>
                                            <div class="small fw-semibold text-truncate">{{ $file['name'] }}</div>
                                            <div class="small text-secondary mb-2">{{ number_format($file['size'] / 1024, 1) }} Ko</div>
                                            <div class="d-flex flex-wrap gap-1">
                                                <x-filament::button size="xs" tag="a" href="{{ $file['url'] }}" target="_blank" color="gray">Aperçu</x-filament::button>
                                                <x-filament::button size="xs" color="gray" x-on:click="navigator.clipboard.writeText(@js($file['url']))">URL</x-filament::button>
                                                <x-filament::button
                                                    size="xs"
                                                    color="gray"
                                                    x-on:click="const name = prompt('Nouveau nom du fichier', @js($file['name'])); if (name && name.trim() !== '') { $wire.renameFile(@js($file['path']), name.trim()); }"
                                                >
                                                    Renommer
                                                </x-filament::button>
                                                <x-filament::button
                                                    size="xs"
                                                    color="danger"
                                                    wire:click="deleteFile({{ json_encode($file['path']) }})"
                                                    wire:confirm="Supprimer ce fichier ?"
                                                >
                                                    Supprimer
                                                </x-filament::button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    @endif
                @endif
            </div>
        </div>
    </div>
</x-filament-panels::page>
