{{--
    Sidebar Dropdown Navigation
    
    @param string $id            - Unique ID for the dropdown
    @param string $label         - Display text
    @param string $icon          - SVG path data (Heroicon outline)
    @param array  $items         - Array of ['href' => '...', 'label' => '...', 'routeIs' => '...']
    @param string $activePattern - Route pattern to check for active state (comma-separated)
    @param bool   $defaultOpen   - Whether dropdown is open by default (optional)
--}}

@php
    $patterns = isset($activePattern) ? explode(',', $activePattern) : [];
    $isActive = false;
    foreach ($patterns as $pattern) {
        if (request()->routeIs(trim($pattern))) {
            $isActive = true;
            break;
        }
    }
@endphp

<div class="sidebar-dropdown">
    {{-- Toggle Button --}}
    <button
        type="button"
        onclick="toggleDropdown('{{ $id }}')"
        class="group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 {{ $isActive ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]' }}"
        aria-expanded="false"
        aria-controls="dropdown-{{ $id }}"
    >
        {{-- Icon --}}
        <span class="flex-shrink-0 w-5 h-5 {{ $isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-400' }} transition-colors">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                {!! $icon !!}
            </svg>
        </span>

        {{-- Label --}}
        <span class="flex-1 text-left truncate">{{ $label }}</span>

        {{-- Chevron --}}
        <svg id="chevron-{{ $id }}" class="dropdown-chevron w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
        </svg>

        {{-- Active indicator --}}
        @if($isActive)
            <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-400 rounded-r-full"></span>
        @endif
    </button>

    {{-- Dropdown Content --}}
    <div
        id="dropdown-{{ $id }}"
        class="sidebar-dropdown-content"
        data-default-open="{{ ($defaultOpen ?? false) ? '1' : '0' }}"
    >
        <div class="ml-4 pl-4 border-l border-white/[0.06] mt-1 space-y-0.5">
            @foreach($items as $item)
                @php
                    $itemActive = isset($item['routeIs']) && request()->routeIs($item['routeIs']);
                @endphp
                <a
                    href="{{ $item['href'] }}"
                    class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150 {{ $itemActive ? 'text-primary-400 bg-primary-600/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]' }}"
                    aria-current="{{ $itemActive ? 'page' : 'false' }}"
                >
                    {{-- Dot indicator --}}
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 {{ $itemActive ? 'bg-primary-400' : 'bg-slate-600' }}"></span>
                    <span class="truncate">{{ $item['label'] }}</span>
                </a>
            @endforeach
        </div>
    </div>
</div>
