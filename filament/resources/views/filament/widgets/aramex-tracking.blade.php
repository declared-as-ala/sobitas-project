<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2z"/>
                </svg>
                Suivi Aramex
            </div>
        </x-slot>
        <x-slot name="headerEnd">
            <x-filament::button
                wire:click="refreshAll"
                wire:loading.attr="disabled"
                color="gray"
                size="sm"
                icon="heroicon-o-arrow-path"
            >
                <span wire:loading.remove wire:target="refreshAll">Rafraîchir tout</span>
                <span wire:loading wire:target="refreshAll">Mise à jour...</span>
            </x-filament::button>
        </x-slot>

        @php $shipments = $this->getShipments(); @endphp

        @if($shipments->isEmpty())
            <div class="py-8 text-center text-sm text-gray-400">
                Aucune expédition Aramex pour le moment.
            </div>
        @else
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 uppercase">
                            <th class="py-2 px-3 text-left font-medium">BL</th>
                            <th class="py-2 px-3 text-left font-medium">Client</th>
                            <th class="py-2 px-3 text-left font-medium">HAWB</th>
                            <th class="py-2 px-3 text-left font-medium">Statut</th>
                            <th class="py-2 px-3 text-left font-medium">Envoyé le</th>
                            <th class="py-2 px-3 text-left font-medium">Montant</th>
                            <th class="py-2 px-3 text-left font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                        @foreach($shipments as $bl)
                            @php
                                $statusCode = $bl->aramex_status ?? '';
                                $color = \App\Filament\Widgets\AramexTrackingWidget::statusColor($statusCode);
                                $label = $statusCode ? \App\Filament\Widgets\AramexTrackingWidget::statusLabel($statusCode) : 'En attente';
                            @endphp
                            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td class="py-2 px-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                                    <a href="{{ route('filament.admin.resources.factures.edit', $bl->id) }}" class="hover:underline text-primary-600">
                                        {{ $bl->numero ?? '#'.$bl->id }}
                                    </a>
                                </td>
                                <td class="py-2 px-3 text-gray-700 dark:text-gray-300">
                                    {{ $bl->client?->name ?? '—' }}
                                </td>
                                <td class="py-2 px-3 font-mono text-xs">
                                    <span class="cursor-pointer select-all text-gray-800 dark:text-gray-200"
                                          title="Cliquer pour copier"
                                          onclick="navigator.clipboard.writeText('{{ $bl->aramex_hawb }}')">
                                        {{ $bl->aramex_hawb }}
                                    </span>
                                </td>
                                <td class="py-2 px-3">
                                    @if($statusCode)
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                            @if($color === 'green') bg-green-100 text-green-700
                                            @elseif($color === 'blue') bg-blue-100 text-blue-700
                                            @elseif($color === 'indigo') bg-indigo-100 text-indigo-700
                                            @elseif($color === 'orange') bg-orange-100 text-orange-700
                                            @elseif($color === 'red') bg-red-100 text-red-700
                                            @else bg-gray-100 text-gray-700
                                            @endif">
                                            {{ $label }}
                                        </span>
                                    @else
                                        <span class="text-gray-400 text-xs">—</span>
                                    @endif
                                    @if($bl->aramex_error && !$bl->aramex_hawb)
                                        <span class="ml-1 text-red-500 text-xs" title="{{ $bl->aramex_error }}">⚠</span>
                                    @endif
                                </td>
                                <td class="py-2 px-3 text-xs text-gray-500">
                                    {{ $bl->aramex_pushed_at ? \Carbon\Carbon::parse($bl->aramex_pushed_at)->format('d/m H:i') : '—' }}
                                </td>
                                <td class="py-2 px-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {{ number_format((float)$bl->net_a_payer, 3, '.', ' ') }} DT
                                </td>
                                <td class="py-2 px-3">
                                    <div class="flex gap-1.5">
                                        @if($bl->aramex_label_url)
                                            <a href="{{ route('factures.aramex-label', $bl->id) }}"
                                               target="_blank"
                                               class="inline-flex items-center rounded px-2 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200"
                                               title="Voir étiquette">
                                                🏷️ Étiquette
                                            </a>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
