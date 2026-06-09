<x-filament-panels::page>

    {{-- Bootstrap 5 + Icons CDN (scoped to this page only) --}}
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <style>
        .mno-wrap * { box-sizing: border-box; }
        .mno-wrap { font-family: 'Inter', system-ui, sans-serif; }
        .mno-row-active { background-color: #fff5f5 !important; border-left: 3px solid #dc3545 !important; }
        .mno-row { border-left: 3px solid transparent; transition: background .15s; cursor: pointer; }
        .mno-row:hover { background-color: #f8f9fa; }
        .mno-chevron { transition: transform .2s ease; display: inline-block; }
        .mno-chevron.open { transform: rotate(90deg); }
        .mno-sub-panel { background: #fff9f9; border-top: 1px solid #fecaca; }
        .btn-reorder { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
        .btn-reorder:disabled { opacity: .35; cursor: not-allowed; }
        .badge-pos { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
                     border-radius: 8px; font-weight: 700; font-size: .75rem; }
    </style>

    @php
        $categories     = $this->getCategories();
        $sousCategories = $this->getSousCategories();
        $totalCats      = $categories->count();
    @endphp

    <div class="mno-wrap">

        {{-- Info alert --}}
        <div class="alert alert-info d-flex align-items-start gap-2 mb-4" role="alert">
            <i class="bi bi-info-circle-fill fs-5 flex-shrink-0 mt-1"></i>
            <div class="mb-0" style="font-size:.875rem">
                Utilisez les boutons <strong>↑ ↓</strong> pour réordonner les catégories.
                Cliquez sur une ligne pour afficher et réordonner ses sous-catégories.
                Les changements sont enregistrés immédiatement dans le menu du site.
            </div>
        </div>

        {{-- Main card --}}
        <div class="card shadow-sm border-0">

            {{-- Card header --}}
            <div class="card-header bg-white d-flex align-items-center gap-3 py-3 border-bottom">
                <div class="rounded-3 d-flex align-items-center justify-content-center"
                     style="width:40px;height:40px;background:#fef2f2;flex-shrink:0">
                    <i class="bi bi-grid-3x3-gap-fill text-danger fs-5"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-semibold text-dark">Catégories du menu navbar</h6>
                    <small class="text-muted">
                        {{ $totalCats }} catégorie{{ $totalCats !== 1 ? 's' : '' }} —
                        cliquez sur une ligne pour voir ses sous-catégories
                    </small>
                </div>
                <span class="badge bg-danger rounded-pill">{{ $totalCats }}</span>
            </div>

            {{-- Category rows --}}
            <ul class="list-group list-group-flush">
                @foreach($categories as $index => $categ)
                    @php $isSelected = $selectedCategId === $categ->id; @endphp

                    {{-- Category row --}}
                    <li class="list-group-item px-4 py-3 mno-row {{ $isSelected ? 'mno-row-active' : '' }}"
                        wire:click="selectCategory({{ $categ->id }})"
                        style="user-select:none">
                        <div class="d-flex align-items-center gap-3">

                            {{-- Position badge --}}
                            <span class="badge-pos {{ $isSelected ? 'bg-danger text-white' : 'bg-light text-secondary' }}">
                                {{ $index + 1 }}
                            </span>

                            {{-- Name + slug --}}
                            <div class="flex-grow-1 min-w-0">
                                <span class="fw-semibold {{ $isSelected ? 'text-danger' : 'text-dark' }}"
                                      style="font-size:.9rem">
                                    {{ $categ->designation_fr }}
                                </span>
                                <code class="ms-2 text-muted d-none d-sm-inline"
                                      style="font-size:.75rem">/{{ $categ->slug }}</code>
                            </div>

                            {{-- Up / Down --}}
                            <div class="d-flex gap-1" wire:click.stop="">
                                <button type="button"
                                        wire:click.stop="moveCategoryUp({{ $categ->id }})"
                                        @disabled($index === 0)
                                        class="btn btn-outline-secondary btn-sm btn-reorder"
                                        title="Monter">
                                    <i class="bi bi-chevron-up" style="font-size:.75rem"></i>
                                </button>
                                <button type="button"
                                        wire:click.stop="moveCategoryDown({{ $categ->id }})"
                                        @disabled($loop->last)
                                        class="btn btn-outline-secondary btn-sm btn-reorder"
                                        title="Descendre">
                                    <i class="bi bi-chevron-down" style="font-size:.75rem"></i>
                                </button>
                            </div>

                            {{-- Expand chevron --}}
                            <i class="bi bi-chevron-right text-muted mno-chevron {{ $isSelected ? 'open' : '' }}"
                               style="font-size:.85rem;flex-shrink:0"></i>
                        </div>
                    </li>

                    {{-- Subcategories panel --}}
                    @if($isSelected)
                        <li class="list-group-item px-4 py-3 mno-sub-panel">

                            @if($sousCategories->isEmpty())
                                <p class="text-muted fst-italic small mb-0 ps-4">
                                    <i class="bi bi-dash-circle me-1"></i>
                                    Aucune sous-catégorie pour <strong>{{ $categ->designation_fr }}</strong>
                                </p>
                            @else
                                <div class="d-flex align-items-center gap-2 mb-3 ps-3">
                                    <i class="bi bi-diagram-3 text-danger"></i>
                                    <span class="text-uppercase fw-semibold text-danger"
                                          style="font-size:.7rem;letter-spacing:.05em">
                                        Sous-catégories — {{ $categ->designation_fr }}
                                    </span>
                                    <span class="badge bg-danger-subtle text-danger rounded-pill ms-1">
                                        {{ $sousCategories->count() }}
                                    </span>
                                </div>

                                <div class="d-flex flex-column gap-2 ps-4">
                                    @foreach($sousCategories as $si => $sub)
                                        <div class="card border shadow-none"
                                             style="border-color:#fecaca !important;border-radius:10px">
                                            <div class="card-body d-flex align-items-center gap-3 px-3 py-2">

                                                {{-- Sub position --}}
                                                <span class="badge bg-danger-subtle text-danger fw-bold rounded"
                                                      style="min-width:24px;text-align:center">
                                                    {{ $si + 1 }}
                                                </span>

                                                {{-- Name + slug --}}
                                                <div class="flex-grow-1 min-w-0">
                                                    <span class="text-dark" style="font-size:.875rem">
                                                        {{ $sub->designation_fr }}
                                                    </span>
                                                    <code class="ms-2 text-muted d-none d-sm-inline"
                                                          style="font-size:.72rem">/{{ $sub->slug }}</code>
                                                </div>

                                                {{-- Sub Up / Down --}}
                                                <div class="d-flex gap-1">
                                                    <button type="button"
                                                            wire:click="moveSubUp({{ $sub->id }})"
                                                            @disabled($si === 0)
                                                            class="btn btn-outline-danger btn-sm btn-reorder"
                                                            style="width:24px;height:24px"
                                                            title="Monter">
                                                        <i class="bi bi-chevron-up" style="font-size:.65rem"></i>
                                                    </button>
                                                    <button type="button"
                                                            wire:click="moveSubDown({{ $sub->id }})"
                                                            @disabled($loop->last)
                                                            class="btn btn-outline-danger btn-sm btn-reorder"
                                                            style="width:24px;height:24px"
                                                            title="Descendre">
                                                        <i class="bi bi-chevron-down" style="font-size:.65rem"></i>
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            @endif

                        </li>
                    @endif

                @endforeach
            </ul>
            {{-- /list-group --}}

        </div>
        {{-- /card --}}

    </div>

</x-filament-panels::page>
