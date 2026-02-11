<x-filament-panels::page>
    <form wire:submit="send">
        {{ $this->form }}

        <div class="mt-6">
            <x-filament::button type="submit" wire:loading.attr="disabled">
                <x-filament::loading-indicator wire:loading wire:target="send" class="h-5 w-5" />
                <span wire:loading.remove wire:target="send">Envoyer les SMS</span>
                <span wire:loading wire:target="send">Envoi en cours...</span>
            </x-filament::button>
        </div>
    </form>
</x-filament-panels::page>
