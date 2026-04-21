<x-filament-panels::page>
    <div class="space-y-6" x-data>
        <x-filament::section>
            <x-slot name="heading">Media</x-slot>

            <div class="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <button type="button" wire:click="goToBreadcrumb('')" class="hover:text-primary-600">
                    Dashboard / Media
                </button>

                @foreach ($breadcrumbs as $breadcrumb)
                    <span>/</span>
                    <button
                        type="button"
                        wire:click="goToBreadcrumb({{ json_encode($breadcrumb['path']) }})"
                        class="hover:text-primary-600"
                    >
                        {{ $breadcrumb['name'] }}
                    </button>
                @endforeach
            </div>

            <div class="mb-4 grid gap-3 md:grid-cols-12">
                <div class="md:col-span-4">
                    <x-filament::input.wrapper>
                        <x-filament::input
                            type="text"
                            wire:model.live.debounce.400ms="search"
                            placeholder="Rechercher dans ce dossier..."
                        />
                    </x-filament::input.wrapper>
                </div>

                <div class="md:col-span-3">
                    <x-filament::input.wrapper>
                        <x-filament::input.select wire:model.live="typeFilter">
                            @foreach ($typeOptions as $value => $label)
                                <option value="{{ $value }}">{{ $label }}</option>
                            @endforeach
                        </x-filament::input.select>
                    </x-filament::input.wrapper>
                </div>

                <div class="md:col-span-5 flex flex-wrap justify-end gap-2">
                    <x-filament::button color="gray" icon="heroicon-o-arrow-up" wire:click="goUp" :disabled="$path === ''">
                        Dossier parent
                    </x-filament::button>

                    <x-filament::button
                        color="gray"
                        icon="heroicon-o-folder-plus"
                        x-on:click="
                            const name = prompt('Nom du dossier');
                            if (name && name.trim() !== '') {
                                $wire.createFolder(name.trim());
                            }
                        "
                    >
                        Nouveau dossier
                    </x-filament::button>
                </div>
            </div>

            <form wire:submit="upload" class="mb-6">
                {{ $this->form }}
                <div class="mt-3">
                    <x-filament::button type="submit" icon="heroicon-o-arrow-up-tray">
                        Televerser dans ce dossier
                    </x-filament::button>
                </div>
            </form>

            <div class="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Dossier courant: <span class="font-medium">{{ $path === '' ? '/' : $path }}</span>
            </div>

            @if (count($directories) === 0 && count($files) === 0)
                <div class="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Aucun element trouve dans ce dossier.
                </div>
            @else
                @if (count($directories) > 0)
                    <div class="mb-3 text-sm font-semibold">Dossiers</div>
                    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        @foreach ($directories as $directory)
                            <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-primary-300 hover:shadow dark:border-gray-800 dark:bg-gray-900/50">
                                <button
                                    type="button"
                                    wire:click="openFolder({{ json_encode($directory['path']) }})"
                                    class="block w-full text-left"
                                >
                                    <div class="mb-2 flex items-center gap-2">
                                        <x-filament::icon icon="heroicon-o-folder" class="h-7 w-7 text-primary-500" />
                                        <span class="truncate text-sm font-medium">{{ $directory['name'] }}</span>
                                    </div>
                                </button>
                                <div class="mt-2 flex gap-1">
                                    <x-filament::button
                                        size="xs"
                                        color="gray"
                                        x-on:click="
                                            const name = prompt('Nouveau nom du dossier', @js($directory['name']));
                                            if (name && name.trim() !== '') {
                                                $wire.renameFolder(@js($directory['path']), name.trim());
                                            }
                                        "
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
                        @endforeach
                    </div>
                @endif

                @if (count($files) > 0)
                    <div class="mb-3 text-sm font-semibold">Fichiers</div>
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        @foreach ($files as $file)
                            <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-primary-300 hover:shadow dark:border-gray-800 dark:bg-gray-900/50">
                                <div class="mb-2 aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                                    @if ($file['is_image'])
                                        <img src="{{ $file['url'] }}" alt="{{ $file['name'] }}" class="h-full w-full object-cover" loading="lazy" />
                                    @else
                                        <div class="flex h-full items-center justify-center">
                                            <x-filament::icon icon="heroicon-o-document" class="h-10 w-10 text-gray-500" />
                                        </div>
                                    @endif
                                </div>

                                <div class="truncate text-sm font-medium">{{ $file['name'] }}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">{{ number_format($file['size'] / 1024, 1) }} Ko</div>

                                <div class="mt-2 flex flex-wrap gap-1">
                                    <x-filament::button size="xs" tag="a" href="{{ $file['url'] }}" target="_blank" color="gray">
                                        Apercu
                                    </x-filament::button>

                                    <x-filament::button
                                        size="xs"
                                        color="gray"
                                        x-on:click="navigator.clipboard.writeText(@js($file['url']))"
                                    >
                                        URL
                                    </x-filament::button>

                                    <x-filament::button
                                        size="xs"
                                        color="gray"
                                        x-on:click="
                                            const name = prompt('Nouveau nom du fichier', @js($file['name']));
                                            if (name && name.trim() !== '') {
                                                $wire.renameFile(@js($file['path']), name.trim());
                                            }
                                        "
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
                        @endforeach
                    </div>
                @endif
            @endif
        </x-filament::section>
    </div>
</x-filament-panels::page>
