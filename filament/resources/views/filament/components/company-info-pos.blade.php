@php
    $coordinate = \App\Models\Coordinate::getCached();
@endphp
<div class="flex items-center gap-6">
    @if($coordinate && $coordinate->logo)
        <img src="{{ Storage::url($coordinate->logo) }}" alt="Logo" style="max-height: 80px;" class="object-contain">
    @else
        <img src="/logo.png" alt="Logo" style="max-height: 80px;" class="object-contain">
    @endif
    <div style="font-size: 14px; line-height: 1.6; color: #334155;">
        <strong style="font-size: 16px; color: #0f172a; display: block; margin-bottom: 6px;">
            {{ $coordinate->name ?? 'STE SOBITAS' }}
        </strong>
        <div>{{ $coordinate->phone_1 ?? '+216 27 612 500' }} / {{ $coordinate->phone_2 ?? '+216 73 200 169' }}</div>
        <div>{{ $coordinate->address ?? 'Rue Ribat, 4000 Sousse Tunisie' }}</div>
        @if($coordinate && $coordinate->mf)
            <div class="mt-1 text-sm text-gray-500">M.F: {{ $coordinate->mf }}</div>
        @endif
    </div>
</div>
