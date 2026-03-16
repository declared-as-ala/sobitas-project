@php
    $title = __('filament-panels::pages/auth/login.title');
    $logoPath = public_path('logo.png');
    $hasLogo = is_file($logoPath);
@endphp

<x-filament-panels::page.simple
    :title="$title"
    class="fi-auth-page auth-page-layout"
>
    <div class="auth-card">
        <div class="auth-logo-wrapper">
            @if($hasLogo)
                <img
                    src="{{ asset('logo.png') }}"
                    alt="{{ config('app.name', 'Sobitas') }}"
                    class="auth-logo"
                >
            @else
                <span class="auth-logo-fallback">{{ config('app.name', 'Sobitas') }}</span>
            @endif
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

