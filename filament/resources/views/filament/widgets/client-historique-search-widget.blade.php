<style>
    /* ── Client Search Widget ── */
    .chs-wrap {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .chs-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .chs-header-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #eff6ff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .dark .chs-header-icon { background: rgba(59,130,246,0.15); }
    .chs-header-icon svg {
        width: 18px;
        height: 18px;
        color: #2563eb;
    }
    .chs-header-text {}
    .chs-title {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
        line-height: 1.3;
    }
    .dark .chs-title { color: #f9fafb; }
    .chs-subtitle {
        font-size: 0.75rem;
        color: #9ca3af;
        margin: 0;
    }

    /* Form row */
    .chs-form {
        display: grid;
        grid-template-columns: 1fr auto 1fr auto;
        gap: 0.75rem;
        align-items: end;
    }
    @media (max-width: 640px) {
        .chs-form { grid-template-columns: 1fr; }
        .chs-or-sep { display: none; }
    }

    /* OR separator */
    .chs-or-sep {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-bottom: 0.35rem;
    }
    .chs-or-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #f3f4f6;
        border: 1.5px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 700;
        color: #6b7280;
        letter-spacing: 0.02em;
        flex-shrink: 0;
    }
    .dark .chs-or-badge {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.12);
        color: #9ca3af;
    }

    .chs-field {}
    .chs-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.375rem;
    }
    .dark .chs-label { color: #9ca3af; }

    .chs-input-wrap {
        position: relative;
    }
    .chs-input-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: #9ca3af;
        pointer-events: none;
    }
    .chs-input {
        width: 100%;
        padding: 0.625rem 0.875rem 0.625rem 2.25rem;
        border: 1.5px solid #e5e7eb;
        border-radius: 10px;
        font-size: 0.875rem;
        color: #111827;
        background: #f9fafb;
        outline: none;
        transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        box-sizing: border-box;
    }
    .chs-input:focus {
        border-color: #2563eb;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
    }
    .dark .chs-input {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.1);
        color: #f3f4f6;
    }
    .dark .chs-input:focus {
        border-color: #3b82f6;
        background: rgba(255,255,255,0.09);
        box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .chs-input::placeholder { color: #9ca3af; }

    /* Buttons row */
    .chs-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .chs-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.625rem 1.25rem;
        border-radius: 10px;
        background: #2563eb;
        color: #fff;
        font-size: 0.875rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        white-space: nowrap;
    }
    .chs-btn-primary:hover:not(:disabled) {
        background: #1d4ed8;
        box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        transform: translateY(-1px);
    }
    .chs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .chs-btn-primary svg { width: 15px; height: 15px; }

    .chs-btn-ghost {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 0.875rem;
        border-radius: 10px;
        background: transparent;
        color: #6b7280;
        font-size: 0.8125rem;
        font-weight: 500;
        border: 1.5px solid #e5e7eb;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }
    .chs-btn-ghost:hover { background: #f3f4f6; color: #374151; border-color: #d1d5db; }
    .dark .chs-btn-ghost { border-color: rgba(255,255,255,0.1); color: #9ca3af; }
    .dark .chs-btn-ghost:hover { background: rgba(255,255,255,0.07); color: #d1d5db; }
    .chs-btn-ghost svg { width: 14px; height: 14px; }
</style>

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="chs-wrap">
            {{-- Header --}}
            <div class="chs-header">
                <div class="chs-header-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="chs-header-text">
                    <p class="chs-title">Recherche Client</p>
                    <p class="chs-subtitle">Tickets · BL · Factures · Devis</p>
                </div>
            </div>

            {{-- Nested Livewire: use wire:click (not form submit) so the action stays on this widget, not the Dashboard parent. --}}
            <div class="chs-form">
                <div class="chs-field">
                    <label for="chs-tel" class="chs-label">Téléphone</label>
                    <div class="chs-input-wrap">
                        <svg class="chs-input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <input
                            id="chs-tel"
                            type="tel"
                            wire:model="tel"
                            wire:keydown.enter.prevent="submitClientHistoriqueSearch"
                            wire:loading.attr="readonly"
                            placeholder="Ex: 97 991 266"
                            inputmode="numeric"
                            autocomplete="tel"
                            class="chs-input"
                        />
                    </div>
                </div>

                <div class="chs-or-sep">
                    <div class="chs-or-badge">OU</div>
                </div>

                <div class="chs-field">
                    <label for="chs-name" class="chs-label">Nom / Société</label>
                    <div class="chs-input-wrap">
                        <svg class="chs-input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <input
                            id="chs-name"
                            type="text"
                            wire:model="name"
                            wire:keydown.enter.prevent="submitClientHistoriqueSearch"
                            wire:loading.attr="readonly"
                            placeholder="Ex: Mohamed Trabelsi"
                            autocomplete="name"
                            class="chs-input"
                        />
                    </div>
                </div>

                <div class="chs-actions">
                    <button
                        type="submit"
                        wire:loading.attr="disabled"
                        wire:target="submitClientHistoriqueSearch"
                        class="chs-btn-primary"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"
                            wire:loading.class="animate-spin" wire:target="submitClientHistoriqueSearch">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span wire:loading.remove wire:target="submitClientHistoriqueSearch">Chercher</span>
                        <span wire:loading wire:target="submitClientHistoriqueSearch" style="display:none">…</span>
                    </button>

                    @if(trim((string) ($tel ?? '')) !== '' || trim((string) ($name ?? '')) !== '')
                        <button
                            type="button"
                            wire:click="clearClientHistoriqueFields"
                            class="chs-btn-ghost"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Effacer
                        </button>
                    @endif
                </div>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
