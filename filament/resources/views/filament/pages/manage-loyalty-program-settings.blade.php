<x-filament-panels::page>
    <div class="max-w-4xl space-y-6">
        {{ $this->form }}
        <div class="mt-4">
            <x-filament::button type="button" wire:click="save" color="primary">
                Enregistrer
            </x-filament::button>
        </div>
        @php
            $m = \App\Models\LoyaltyProgramSetting::merged();
            $ppCur = (int) ($m['points_per_currency'] ?? 1);
            $ppDt = (int) ($m['points_per_dt'] ?? 10);
            $exEarn = 500 * $ppCur;
            $exDisc = round(500 / max(1, $ppDt), 3);
        @endphp
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
            <p class="font-semibold text-gray-900 dark:text-white mb-2">Aperçu</p>
            <p>500 DT payés (hors remise points) ≈ <strong>{{ $exEarn }}</strong> points gagnés.</p>
            <p>500 points ≈ <strong>{{ $exDisc }}</strong> DT de remise (si autorisé par le plafond).</p>
        </div>
    </div>
</x-filament-panels::page>
