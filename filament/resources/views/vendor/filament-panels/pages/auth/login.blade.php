@php
    $title = __('filament-panels::pages/auth/login.title');
    $logoUrl = \App\Models\Coordinate::publicBrandLogoUrl();
@endphp

<x-filament-panels::page.simple
    :title="$title"
    class="fi-auth-page auth-page-layout"
>
    <div class="auth-card">
        <div class="auth-logo-wrapper">
            <img
                src="{{ $logoUrl }}"
                alt="{{ config('app.name', 'Sobitas') }}"
                class="auth-logo"
            >
        </div>

        <form wire:submit="authenticate" id="form" class="fi-form grid gap-y-6">
            {{ $this->form }}

            <x-filament::button type="submit" form="form" class="w-full">
                Se connecter
            </x-filament::button>
        </form>
    </div>
</x-filament-panels::page.simple>

