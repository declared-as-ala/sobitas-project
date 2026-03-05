@php
    $coordinate = \App\Models\Coordinate::getCached();
    $logoPath = $coordinate?->logo_facture ?? null;
    if ($logoPath) {
        $logoUrl = filter_var($logoPath, FILTER_VALIDATE_URL)
            ? $logoPath
            : \Illuminate\Support\Facades\Storage::url($logoPath);
    } else {
        $logoUrl = null;
    }
@endphp
@if ($logoUrl)
    <img src="{{ $logoUrl }}" alt="{{ $coordinate?->abbreviation ?? 'SOBITAS' }}" class="h-full w-auto" onerror="this.style.display='none'" />
@else
    <span class="font-bold text-lg tracking-tight">{{ $coordinate?->abbreviation ?? 'SOBITAS' }}</span>
@endif
