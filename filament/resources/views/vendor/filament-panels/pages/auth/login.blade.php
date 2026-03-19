@php
    $title   = __('filament-panels::pages/auth/login.title');
    $logoUrl = \App\Models\Coordinate::publicBrandLogoUrl();
@endphp

<x-filament-panels::page.simple
    :title="$title"
    class="fi-auth-page auth-page-layout"
>
    <div class="auth-card">
        <div class="auth-logo-wrapper">
            @if ($logoUrl)
                <img
                    src="{{ $logoUrl }}"
                    alt="{{ config('app.name', 'Sobitas') }}"
                    class="auth-logo"
                >
            @else
                <span class="auth-logo-text">{{ config('app.name', 'Sobitas') }}</span>
            @endif
        </div>

        <form wire:submit="authenticate" id="form" class="fi-form grid gap-y-6">
            {{ $this->form }}

            <x-filament::button type="submit" form="form" class="w-full">
                Se connecter
            </x-filament::button>
        </form>
    </div>
</x-filament-panels::page.simple>

