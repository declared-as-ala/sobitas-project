{{--
    Sidebar Navigation Item (Single Link)
    
    @param string $label       - Display text
    @param string $icon        - SVG path data (Heroicon outline)
    @param string $route       - Named route (optional, either $route or $href)
    @param string $href        - Direct URL (optional)
    @param string|null $badge  - Badge text (optional)
    @param string $badgeColor  - Badge color class (optional, default: 'bg-primary-500')
--}}

@php
    $url = isset($route) ? route($route) : ($href ?? '#');
    $isActive = isset($route) ? request()->routeIs($route . '*') : false;
@endphp

<a
    href="{{ $url }}"
    class="group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 {{ $isActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]' }}"
    aria-current="{{ $isActive ? 'page' : 'false' }}"
>
    {{-- Icon --}}
    <span class="flex-shrink-0 w-5 h-5 {{ $isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-400' }} transition-colors">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            {!! $icon !!}
        </svg>
    </span>

    {{-- Label --}}
    <span class="flex-1 truncate">{{ $label }}</span>

    {{-- Badge --}}
    @if(!empty($badge))
        <span class="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white {{ $badgeColor ?? 'bg-primary-500' }} badge-pulse">
            {{ $badge }}
        </span>
    @endif

    {{-- Active indicator --}}
    @if($isActive)
        <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-400 rounded-r-full"></span>
    @endif
</a>
