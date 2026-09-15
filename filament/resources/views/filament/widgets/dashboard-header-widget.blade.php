<x-filament-widgets::widget>
{{--
    Redesigned header: the old "Protein.tn — Admin" brand block was redundant (you are already
    inside the admin). It is replaced by a USEFUL orientation line — a time-aware greeting with the
    signed-in name, the live date, and the active period — plus a cleaner segmented period control.
    The Alpine/Livewire preset mechanism is unchanged: updatedPreset() skipRender()s and dispatches
    dashboardFilterUpdated, so clicking a preset never morphs sibling widgets.
--}}
<style>
    .dh2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .dh2-greet { display: flex; align-items: center; gap: .8rem; min-width: 0; }
    .dh2-icon {
        width: 44px; height: 44px;
        border-radius: 13px;
        display: grid; place-items: center;
        flex-shrink: 0;
        background: linear-gradient(135deg, #D53B04 0%, #f2691f 100%);
        box-shadow: 0 6px 16px rgba(213,59,4,.28);
    }
    .dh2-icon svg { width: 22px; height: 22px; color: #fff; }
    .dh2-hello { font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; letter-spacing: -.01em; }
    .dark .dh2-hello { color: #f1f5f9; }
    .dh2-sub { font-size: .8rem; color: #94a3b8; margin: .12rem 0 0; }
    .dh2-sub b { color: #D53B04; font-weight: 600; }
    .dark .dh2-sub b { color: #ff8a4c; }

    .dh2-controls { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .dh2-seg {
        display: inline-flex; align-items: center;
        background: #f1f5f9; border-radius: 11px; padding: 3px; gap: 2px;
    }
    .dark .dh2-seg { background: rgba(255,255,255,.06); }
    .dh2-seg button {
        padding: .38rem .72rem; border-radius: 8px;
        font-size: .8rem; font-weight: 500; line-height: 1;
        color: #64748b; border: none; background: transparent;
        cursor: pointer; white-space: nowrap; transition: all .15s ease;
    }
    .dh2-seg button:hover { color: #0f172a; }
    .dark .dh2-seg button { color: #94a3b8; }
    .dark .dh2-seg button:hover { color: #f1f5f9; }
    .dh2-seg button.dh2-active {
        background: #fff; color: #0f172a; font-weight: 600;
        box-shadow: 0 1px 3px rgba(16,24,40,.12), 0 0 0 1px rgba(16,24,40,.03);
    }
    .dark .dh2-seg button.dh2-active { background: rgba(255,255,255,.14); color: #f1f5f9; box-shadow: none; }

    .dh2-refresh {
        display: inline-grid; place-items: center;
        width: 38px; height: 38px; border-radius: 10px;
        border: 1px solid #e2e8f0; background: #fff; color: #475569;
        cursor: pointer; transition: all .15s ease;
    }
    .dh2-refresh:hover:not(:disabled) { border-color: #D53B04; color: #D53B04; background: #fff7ed; }
    .dh2-refresh:disabled { opacity: .5; cursor: not-allowed; }
    .dh2-refresh svg { width: 17px; height: 17px; }
    .dark .dh2-refresh { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.1); color: #cbd5e1; }
    .dark .dh2-refresh:hover:not(:disabled) { border-color: #D53B04; color: #ff8a4c; background: rgba(213,59,4,.12); }

    @media (max-width: 640px) {
        .dh2 { align-items: flex-start; }
        .dh2-controls { width: 100%; justify-content: space-between; }
        .dh2-seg { flex-wrap: wrap; }
    }
</style>

@php
    $hour = now()->hour;
    $greeting = $hour < 5 ? 'Bonne nuit' : ($hour < 18 ? 'Bonjour' : 'Bonsoir');
    $name = \Illuminate\Support\Facades\Auth::user()?->name;
    $first = $name ? \Illuminate\Support\Str::of($name)->trim()->explode(' ')->first() : null;
    try {
        $today = \Carbon\Carbon::now()->locale('fr')->isoFormat('dddd D MMMM YYYY');
        $today = \Illuminate\Support\Str::ucfirst($today);
    } catch (\Throwable $e) {
        $today = \Carbon\Carbon::now()->format('d/m/Y');
    }
    $greetIcon = $hour < 5 || $hour >= 18 ? 'heroicon-o-moon' : 'heroicon-o-sun';
@endphp

    <x-filament::section>
        <div
            class="dh2"
            x-data="{ preset: '{{ $this->preset }}', labels: @js($this->getPresets()) }"
        >
            <div class="dh2-greet">
                <div class="dh2-icon"><x-filament::icon :icon="$greetIcon" /></div>
                <div>
                    <p class="dh2-hello">{{ $greeting }}{{ $first ? ', ' . $first : '' }}</p>
                    <p class="dh2-sub">{{ $today }} · <b x-text="labels[preset] || preset"></b></p>
                </div>
            </div>

            <div class="dh2-controls">
                <div class="dh2-seg">
                    @foreach($this->getPresets() as $value => $label)
                        <button
                            type="button"
                            @click="preset = '{{ $value }}'; $wire.set('preset', '{{ $value }}')"
                            :class="{ 'dh2-active': preset === '{{ $value }}' }"
                        >{{ $label }}</button>
                    @endforeach
                </div>

                <button
                    type="button"
                    class="dh2-refresh"
                    wire:click="refreshStats"
                    wire:loading.attr="disabled"
                    wire:target="refreshStats"
                    title="Actualiser"
                >
                    <x-filament::icon icon="heroicon-o-arrow-path" wire:loading.class="animate-spin" wire:target="refreshStats" />
                </button>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
