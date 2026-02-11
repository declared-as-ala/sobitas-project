<x-filament::widget>
    <x-filament::card>
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Actions
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Create new transactions quickly
                    </p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {{ number_format($this->getTodayStats()['revenue'], 2) }} TND
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ $this->getTodayStats()['orders'] }} orders today
                    </div>
                </div>
            </div>

            <!-- Action Buttons Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                @foreach ($this->getActions() as $action)
                    <a 
                        href="{{ $action['url'] }}" 
                        class="group relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-{{ $action['color'] }}-50 to-{{ $action['color'] }}-100 dark:from-{{ $action['color'] }}-900/20 dark:to-{{ $action['color'] }}-800/20 rounded-xl border-2 border-{{ $action['color'] }}-200 dark:border-{{ $action['color'] }}-700 hover:border-{{ $action['color'] }}-400 dark:hover:border-{{ $action['color'] }}-500 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                        <div class="mb-3 p-3 bg-{{ $action['color'] }}-500 rounded-lg group-hover:scale-110 transition-transform duration-300">
                            <x-heroicon-o-document-text class="w-6 h-6 text-white" />
                        </div>
                        <div class="text-center">
                            <p class="font-semibold text-gray-900 dark:text-white mb-1">
                                {{ $action['label'] }}
                            </p>
                            <p class="text-xs text-gray-600 dark:text-gray-400">
                                {{ $action['description'] }}
                            </p>
                        </div>
                        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg class="w-4 h-4 text-{{ $action['color'] }}-600 dark:text-{{ $action['color'] }}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                            </svg>
                        </div>
                    </a>
                @endforeach
            </div>
        </div>
    </x-filament::card>
</x-filament::widget>
