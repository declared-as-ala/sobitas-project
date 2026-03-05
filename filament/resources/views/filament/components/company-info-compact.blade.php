{{-- Compact company block for document edit pages: small logo + name + one-line contact, collapsible details --}}
@php
    $name = $coordinate->abbreviation ?? 'STE SOBITAS';
    $phone = trim(($coordinate->phone_1 ?? '') . (!empty($coordinate->phone_2) ? ' / ' . $coordinate->phone_2 : ''));
    $adresse = $coordinate->adresse_fr ?? '';
@endphp
<div class="doc-company-compact text-sm" x-data="{ open: false }">
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div class="shrink-0" style="height: 4.5rem; display: flex; align-items: center;">
            <style>
                .custom-logo-wrapper img {
                    max-height: 100%;
                    width: auto;
                    object-fit: contain;
                    display: block;
                }
            </style>
            <div class="custom-logo-wrapper h-full">
                @include('filament.app.logo')
            </div>
        </div>
        <div class="min-w-0 flex-1">
            <p class="font-bold text-gray-900 dark:text-white text-base">{{ $name }}</p>
            @if($phone || $adresse)
                <div class="text-gray-600 dark:text-gray-400 text-sm mt-1 leading-relaxed">
                    @if($phone)<p>{{ $phone }}</p>@endif
                    @if($adresse)<p class="break-words">{{ $adresse }}</p>@endif
                </div>
            @endif
        </div>
    </div>
</div>
