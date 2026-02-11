<style>
    /* ── Alerts stack ── */
    .alerts-stack { display: flex; flex-direction: column; gap: 0.75rem; }

    /* ── Single alert item ── */
    .alert-row {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 0.75rem;
        border: 1px solid;
    }

    /* ── Icon circle ── */
    .alert-icon-circle {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }
    .alert-icon-circle svg { width: 1.25rem; height: 1.25rem; }

    /* ── Content area ── */
    .alert-body { flex: 1; min-width: 0; }
    .alert-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
    .alert-title { font-size: 0.875rem; font-weight: 700; color: #111827; margin: 0; }
    .dark .alert-title { color: #f3f4f6; }

    /* Badge */
    .alert-badge {
        flex-shrink: 0;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: #ffffff;
        white-space: nowrap;
    }

    /* Description */
    .alert-desc { font-size: 0.75rem; color: #6b7280; margin: 0 0 0.5rem 0; }
    .dark .alert-desc { color: #9ca3af; }

    /* Footer */
    .alert-foot { display: flex; align-items: center; justify-content: space-between; }
    .alert-metric { font-size: 1.25rem; font-weight: 900; color: #111827; }
    .dark .alert-metric { color: #f3f4f6; }

    /* CTA button */
    .alert-btn {
        padding: 0.375rem 0.875rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ffffff;
        text-decoration: none;
        display: inline-block;
        transition: opacity 0.15s, transform 0.15s;
        white-space: nowrap;
    }
    .alert-btn:hover { opacity: 0.9; transform: translateY(-1px); }

    /* ── CRITICAL (red) ── */
    .alert-critical      { background: #fee2e2; border-color: #fecaca; }
    .alert-critical-icon { background: #ffffff; color: #ef4444; }
    .alert-critical-badge { background: #ef4444; }
    .alert-critical-btn  { background: #ef4444; }

    .dark .alert-critical      { background: rgba(69, 10, 10, 0.35); border-color: rgba(153, 27, 27, 0.4); }
    .dark .alert-critical-icon { background: rgba(127, 29, 29, 0.4); color: #f87171; }

    /* ── ATTENTION (orange) ── */
    .alert-attention      { background: #ffedd5; border-color: #fed7aa; }
    .alert-attention-icon { background: #ffffff; color: #f97316; }
    .alert-attention-badge { background: #f97316; }
    .alert-attention-btn  { background: #f97316; }

    .dark .alert-attention      { background: rgba(67, 20, 7, 0.35); border-color: rgba(154, 52, 18, 0.4); }
    .dark .alert-attention-icon { background: rgba(124, 45, 18, 0.4); color: #fb923c; }

    /* ── INFO (blue) ── */
    .alert-info      { background: #dbeafe; border-color: #bfdbfe; }
    .alert-info-icon { background: #ffffff; color: #3b82f6; }
    .alert-info-badge { background: #3b82f6; }
    .alert-info-btn  { background: #3b82f6; }

    .dark .alert-info      { background: rgba(23, 37, 84, 0.35); border-color: rgba(30, 64, 175, 0.4); }
    .dark .alert-info-icon { background: rgba(30, 58, 138, 0.4); color: #60a5fa; }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <x-slot name="heading">
            Alertes &amp; Notifications
        </x-slot>

        <div class="alerts-stack">
            @foreach($alerts as $key => $alert)
                @php
                    $prefix = match($key) {
                        'critical'  => 'alert-critical',
                        'attention' => 'alert-attention',
                        default     => 'alert-info',
                    };
                @endphp

                <div class="alert-row {{ $prefix }}">
                    {{-- Icon --}}
                    <div class="alert-icon-circle {{ $prefix }}-icon">
                        <x-filament::icon :icon="$alert['icon']" />
                    </div>

                    {{-- Content --}}
                    <div class="alert-body">
                        <div class="alert-head">
                            <h3 class="alert-title">{{ $alert['title'] }}</h3>
                            <span class="alert-badge {{ $prefix }}-badge">{{ $alert['badge_label'] }}</span>
                        </div>

                        <p class="alert-desc">{{ $alert['description'] }}</p>

                        <div class="alert-foot">
                            <span class="alert-metric">{{ $alert['metric'] }}</span>
                            <a href="{{ $alert['button_url'] }}" class="alert-btn {{ $prefix }}-btn">
                                {{ $alert['button_label'] }}
                            </a>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
