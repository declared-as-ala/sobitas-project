@php
    $title = __('filament-panels::pages/auth/login.title');
@endphp

<x-filament-panels::page.simple
    :title="$title"
    class="fi-auth-page auth-page-layout"
>
    <div class="auth-card">
        <div class="auth-logo-wrapper">
            <img
                src="{{ asset('logo.png') }}"
                alt="{{ config('app.name', 'Sobitas') }}"
                class="auth-logo"
            >
        </div>

        <x-filament-panels::form
            wire:submit="authenticate"
            id="form"
        >
            {{ $this->form }}

            <x-filament::button type="submit" form="form" class="w-full">
                Se connecter
            </x-filament::button>
        </x-filament-panels::form>
    </div>
</x-filament-panels::page.simple>

