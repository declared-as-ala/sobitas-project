<x-filament-panels::page>
    <form wire:submit="save" class="space-y-6">
        {{ $this->form }}
        <div class="flex justify-end">
            <button type="submit" wire:loading.attr="disabled"
                    class="fi-btn fi-btn-size-md fi-btn-color-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60">
                Enregistrer
            </button>
        </div>
    </form>
</x-filament-panels::page>
