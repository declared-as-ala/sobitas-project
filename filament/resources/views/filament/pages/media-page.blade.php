<x-filament-panels::page>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <style>
        .media-bootstrap .card {
            border-radius: .85rem;
            border: 1px solid #e5e7eb;
            transition: all .2s ease-in-out;
        }
        .media-bootstrap .card-thumb {
            cursor: pointer;
            transition: all .2s ease-in-out;
        }
        .media-bootstrap .card-thumb:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .08);
        }
        .media-bootstrap .card-thumb.is-selected {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .25);
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
        .media-bootstrap .detail-panel {
            max-height: calc(100vh - 8rem);
            overflow-y: auto;
        }
        @media (min-width: 992px) {
            .media-bootstrap .detail-panel-sticky {
                position: sticky;
                top: 1rem;
            }
        }
        .media-bootstrap .char-hint {
            font-size: .75rem;
            color: #64748b;
        }
        .media-bootstrap .char-hint.over-reco {
            color: #b45309;
        }
        .media-bootstrap .sel-badge {
            position: absolute;
            top: .35rem;
            right: .35rem;
            width: 1.35rem;
            height: 1.35rem;
            border-radius: .25rem;
            background: #2563eb;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: .75rem;
        }
    </style>

    <div class="media-bootstrap" x-data>
        <div class="row g-4">
            <div class="col-lg-8">
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
                            <div class="col-md-6 col-xl-4">
                                <label class="form-label fw-semibold mb-1">Recherche</label>
                                <x-filament::input.wrapper>
                                    <x-filament::input type="text" wire:model.live.debounce.400ms="search" placeholder="Rechercher dans ce dossier…" />
                                </x-filament::input.wrapper>
                            </div>
                            <div class="col-md-6 col-xl-3">
                                <label class="form-label fw-semibold mb-1">Filtre</label>
                                <x-filament::input.wrapper>
                                    <x-filament::input.select wire:model.live="typeFilter">
                                        @foreach ($typeOptions as $value => $label)
                                            <option value="{{ $value }}">{{ $label }}</option>
                                        @endforeach
                                    </x-filament::input.select>
                                </x-filament::input.wrapper>
                            </div>
                            <div class="col-xl-5 d-flex flex-wrap justify-content-xl-end gap-2">
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
                            Dossier courant : <span class="fw-semibold">{{ $path === '' ? '/' : $path }}</span>
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
                                        <div class="col-6 col-md-4 col-xl-3">
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
                                        <div class="col-6 col-md-4 col-xl-3">
                                            <div
                                                class="card h-100 card-thumb border {{ $selectedPath === $file['path'] ? 'is-selected border-2 border-primary' : '' }}"
                                                wire:click="selectMedia({{ json_encode($file['path']) }})"
                                                wire:key="media-file-{{ $file['path'] }}"
                                            >
                                                <div class="card-body p-3 position-relative">
                                                    @if ($selectedPath === $file['path'])
                                                        <span class="sel-badge" aria-hidden="true">✓</span>
                                                    @endif
                                                    <div class="thumb mb-2">
                                                        @if ($file['is_image'])
                                                            <img src="{{ $file['url'] }}" alt="" loading="lazy" />
                                                        @else
                                                            <div class="d-flex align-items-center justify-content-center h-100">
                                                                <x-filament::icon icon="heroicon-o-document" class="h-10 w-10 text-gray-500" />
                                                            </div>
                                                        @endif
                                                    </div>
                                                    <div class="small fw-semibold text-truncate">{{ $file['name'] }}</div>
                                                    <div class="small text-secondary mb-2">{{ number_format($file['size'] / 1024, 1) }} Ko</div>
                                                    <div class="d-flex flex-wrap gap-1" wire:click.stop>
                                                        <x-filament::button size="xs" tag="a" href="{{ $file['url'] }}" target="_blank" color="gray">Aperçu</x-filament::button>
                                                        <x-filament::button size="xs" color="gray" x-on:click="navigator.clipboard.writeText(@js($file['url'])); $wire.notifyUrlCopied()">Copier l’URL</x-filament::button>
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

            <div class="col-lg-4">
                <div class="card shadow-sm detail-panel-sticky">
                    <div class="card-body p-4 detail-panel">
                        @if ($selectedItem === null)
                            <div class="text-center text-secondary py-5 px-2">
                                <x-filament::icon icon="heroicon-o-photo" class="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p class="mb-0 fw-medium">Sélectionnez un média pour modifier ses informations.</p>
                            </div>
                        @else
                            <div class="ratio ratio-1x1 border rounded-3 overflow-hidden bg-light mb-3">
                                @if (str_starts_with((string) ($selectedItem['mime_type'] ?? ''), 'image/'))
                                    <img src="{{ $selectedItem['url'] }}" alt="" class="w-100 h-100" style="object-fit: contain;" />
                                @else
                                    <div class="d-flex align-items-center justify-content-center h-100 text-secondary small">Aperçu non disponible</div>
                                @endif
                            </div>

                            <h6 class="fw-bold border-bottom pb-2 mb-3">Informations du fichier</h6>
                            <dl class="row small mb-4">
                                <dt class="col-5 text-secondary">Nom du fichier</dt>
                                <dd class="col-7 mb-2 text-break">{{ $selectedItem['file_name'] }}</dd>
                                <dt class="col-5 text-secondary">Type de fichier</dt>
                                <dd class="col-7 mb-2">{{ $selectedItem['mime_type'] ?: '—' }}</dd>
                                <dt class="col-5 text-secondary">Taille du fichier</dt>
                                <dd class="col-7 mb-2">{{ number_format($selectedItem['size'] / 1024, 1) }} Ko</dd>
                                <dt class="col-5 text-secondary">Dimensions</dt>
                                <dd class="col-7 mb-2">
                                    @if (($selectedItem['width'] ?? null) && ($selectedItem['height'] ?? null))
                                        {{ $selectedItem['width'] }} × {{ $selectedItem['height'] }} px
                                    @else
                                        —
                                    @endif
                                </dd>
                                <dt class="col-5 text-secondary">Date d’ajout</dt>
                                <dd class="col-7 mb-2">{{ $selectedItem['created_at_label'] ?: '—' }}</dd>
                                <dt class="col-5 text-secondary">Modifié</dt>
                                <dd class="col-7 mb-2">{{ $selectedItem['modified_at_label'] }}</dd>
                            </dl>

                            <div class="mb-3">
                                <label class="form-label fw-semibold small">URL du fichier</label>
                                <input type="text" class="form-control form-control-sm font-monospace" readonly value="{{ $selectedItem['url'] }}" />
                                <x-filament::button class="mt-2" size="sm" color="gray" x-on:click="navigator.clipboard.writeText(@js($selectedItem['url'])); $wire.notifyUrlCopied()">
                                    Copier l’URL
                                </x-filament::button>
                            </div>

                            <h6 class="fw-bold border-bottom pb-2 mb-3">Métadonnées &amp; SEO</h6>

                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Texte alternatif</label>
                                <textarea class="form-control form-control-sm" rows="2" wire:model.live.debounce.300ms="detailAltText" maxlength="255"></textarea>
                                <div class="char-hint {{ strlen($detailAltText) > 200 ? 'over-reco' : '' }}">{{ strlen($detailAltText) }} / 255</div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Titre</label>
                                <input type="text" class="form-control form-control-sm" wire:model.live.debounce.300ms="detailTitle" maxlength="255" />
                                <div class="char-hint">{{ strlen($detailTitle) }} / 255</div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Légende</label>
                                <textarea class="form-control form-control-sm" rows="2" wire:model.live.debounce.300ms="detailCaption"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Description</label>
                                <textarea class="form-control form-control-sm" rows="3" wire:model.live.debounce.300ms="detailDescription"></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Meta title</label>
                                <input type="text" class="form-control form-control-sm" wire:model.live.debounce.300ms="detailMetaTitle" maxlength="255" />
                                <div class="char-hint {{ strlen($detailMetaTitle) > 60 ? 'over-reco' : '' }}">{{ strlen($detailMetaTitle) }} / 255 <span class="text-muted">(recommandé ≤ 60)</span></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold small">Meta description</label>
                                <textarea class="form-control form-control-sm" rows="3" wire:model.live.debounce.300ms="detailMetaDescription" maxlength="1000"></textarea>
                                <div class="char-hint {{ strlen($detailMetaDescription) > 160 ? 'over-reco' : '' }}">{{ strlen($detailMetaDescription) }} / 1000 <span class="text-muted">(recommandé ≤ 160)</span></div>
                            </div>

                            <div class="d-grid gap-2 mb-3">
                                <x-filament::button wire:click="saveMetadata" icon="heroicon-o-check">
                                    Enregistrer les informations
                                </x-filament::button>
                                <x-filament::button tag="a" href="{{ $selectedItem['url'] }}" target="_blank" color="gray" icon="heroicon-o-arrow-top-right-on-square">
                                    Ouvrir l’image
                                </x-filament::button>
                                <x-filament::button
                                    color="danger"
                                    icon="heroicon-o-trash"
                                    wire:click="deleteFile({{ json_encode($selectedItem['path']) }})"
                                    wire:confirm="Supprimer ce média ?"
                                >
                                    Supprimer le média
                                </x-filament::button>
                                <x-filament::button color="gray" wire:click="clearSelection" outlined>
                                    Désélectionner
                                </x-filament::button>
                            </div>

                            <div class="border-top pt-3">
                                <label class="form-label fw-semibold small">Remplacer le fichier</label>
                                <input type="file" class="form-control form-control-sm" wire:model="replacementFile" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" />
                                @error('replacementFile')
                                    <div class="text-danger small mt-1">{{ $message }}</div>
                                @enderror
                                <x-filament::button class="mt-2" size="sm" wire:click="replaceMedia">
                                    Remplacer le média
                                </x-filament::button>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-filament-panels::page>
