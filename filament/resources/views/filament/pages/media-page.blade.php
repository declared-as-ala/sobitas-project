<x-filament-panels::page>
    <div class="space-y-6">
        <x-filament::section>
            <x-slot name="heading">Téléverser des fichiers</x-slot>
            <form wire:submit="upload">
                {{ $this->form }}
                <div class="mt-4">
                    <x-filament::button type="submit">
                        Téléverser
                    </x-filament::button>
                </div>
            </form>
        </x-filament::section>

        <x-filament::section>
            <x-slot name="heading">Fichiers (storage/app/public)</x-slot>
            <div class="overflow-x-auto">
                <table class="fi-ta-table w-full table-auto divide-y divide-gray-200 dark:divide-white/5">
                    <thead class="divide-y divide-gray-200 dark:divide-white/5">
                        <tr class="bg-gray-50 dark:bg-white/5">
                            <th class="px-3 py-3.5 text-start text-sm font-semibold text-gray-950 dark:text-white">Fichier</th>
                            <th class="px-3 py-3.5 text-start text-sm font-semibold text-gray-950 dark:text-white">Taille</th>
                            <th class="px-3 py-3.5 text-end text-sm font-semibold text-gray-950 dark:text-white">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-white/5">
                        @forelse($this->getFiles() as $file)
                            <tr class="hover:bg-gray-50 dark:hover:bg-white/5">
                                <td class="px-3 py-3.5">
                                    <a href="{{ $file['url'] }}" target="_blank" rel="noopener" class="text-primary-600 hover:underline">
                                        {{ $file['name'] }}
                                    </a>
                                    <span class="text-gray-500 text-xs block">{{ $file['path'] }}</span>
                                </td>
                                <td class="px-3 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                                    {{ number_format($file['size'] / 1024, 1) }} Ko
                                </td>
                                <td class="px-3 py-3.5 text-end">
                                    <x-filament::button color="danger" size="sm" wire:click="deleteFile({{ json_encode($file['path']) }})" wire:confirm="Supprimer ce fichier ?">
                                        Supprimer
                                    </x-filament::button>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3" class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                                    Aucun fichier dans le stockage public.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </x-filament::section>
    </div>
</x-filament-panels::page>
