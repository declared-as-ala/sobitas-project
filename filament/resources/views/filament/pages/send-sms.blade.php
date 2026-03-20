@php
    $sendSmsCssPath = resource_path('css/filament/send-sms.css');
    $sendSmsCss = is_file($sendSmsCssPath) ? file_get_contents($sendSmsCssPath) : '';
    $body          = $this->getPreviewBody();
    $charCount     = $this->getPreviewCharCount();
    $segments      = $this->getPreviewSegments();
    $recipientCount = $this->getRecipientCount();
    $isListMode    = $this->sendMode === 'list';
@endphp

<x-filament-panels::page>
    @if($sendSmsCss)
        <style>{!! $sendSmsCss !!}</style>
    @endif

    <div class="sms-page">
        <div class="sms-layout">

            {{-- ════ LEFT COLUMN ════ --}}
            <div class="sms-left">

                {{-- ── RECIPIENTS CARD ── --}}
                <div class="sms-card">
                    <div class="sms-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                        <span>Destinataires</span>
                        @if($recipientCount > 0)
                            <span class="sms-badge-count">{{ $recipientCount }}</span>
                        @endif
                    </div>

                    <div class="sms-card-body">

                        {{-- Mode toggle --}}
                        <div class="sms-mode-toggle">
                            <button
                                type="button"
                                wire:click="$set('sendMode', 'one')"
                                class="sms-mode-btn {{ !$isListMode ? 'sms-mode-btn--active' : '' }}"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 0a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-.75.75m-3 0v.75m3-.75v.75m-3 3a.75.75 0 0 0-.75.75V15a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75m-3 0h3" /></svg>
                                Numéro direct
                            </button>
                            <button
                                type="button"
                                wire:click="$set('sendMode', 'list')"
                                class="sms-mode-btn {{ $isListMode ? 'sms-mode-btn--active' : '' }}"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                                Clients / Contacts
                            </button>
                        </div>

                        {{-- ── SINGLE PHONE MODE ── --}}
                        @if(!$isListMode)
                            <div class="sms-phone-field">
                                <label class="sms-label">Numéro de téléphone</label>
                                <div class="sms-phone-input-wrap">
                                    <span class="sms-phone-prefix">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon-sm"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" /></svg>
                                    </span>
                                    <input
                                        type="tel"
                                        wire:model.live.debounce.400ms="onePhone"
                                        placeholder="+216 XX XXX XXX"
                                        class="sms-phone-input"
                                    />
                                </div>
                                <p class="sms-hint">Ex: 97991266 ou +216 97 991 266</p>
                            </div>

                        {{-- ── LIST / MULTI MODE ── --}}
                        @else
                            @php $selectedRows = $this->getSelectedRows(); @endphp

                            {{-- Chips of selected recipients --}}
                            @if($selectedRows->isNotEmpty())
                                <div class="sms-chips-wrap">
                                    <div class="sms-chips">
                                        @foreach($selectedRows as $row)
                                            <span class="sms-chip">
                                                <span class="sms-chip-body">
                                                    <span class="sms-chip-name">{{ $row['name'] ?? $row['phone'] }}</span>
                                                    <span class="sms-chip-phone">{{ $row['phone'] }}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    wire:click="removeSelectedRecipient('{{ $row['row_id'] }}')"
                                                    class="sms-chip-remove"
                                                    title="Retirer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </span>
                                        @endforeach
                                    </div>
                                </div>
                            @endif

                            {{-- Search + bulk actions row --}}
                            <div class="sms-controls-row">
                                <div class="sms-search-wrap">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-search-icon"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                    <input
                                        type="search"
                                        wire:model.live.debounce.300ms="recipientSearch"
                                        placeholder="Rechercher par nom ou numéro…"
                                        class="sms-search"
                                    />
                                </div>
                                <div class="sms-bulk-actions">
                                    <button type="button" wire:click="selectAllSmsCurrentPage" class="sms-btn-xs">Page</button>
                                    <button type="button" wire:click="selectAllSms" class="sms-btn-xs">Tout</button>
                                    <button type="button" wire:click="deselectAllSms" class="sms-btn-xs sms-btn-xs--danger">Aucun</button>
                                </div>
                            </div>

                            {{-- Stats bar --}}
                            <div class="sms-stats-bar">
                                <span class="sms-stats-bar-text">
                                    <strong>{{ $this->getRecipientCount() }}</strong> sélectionné(s)
                                    <span class="sms-stats-bar-sep">·</span>
                                    {{ $this->getTotalAvailableRecipients() }} disponible(s)
                                </span>
                            </div>

                            {{-- Recipients table --}}
                            @php $paginator = $this->getPaginatedSmsRecipients(); @endphp
                            <div class="sms-table-wrap">
                                <table class="sms-table">
                                    <thead>
                                        <tr>
                                            <th class="sms-th-check"></th>
                                            <th>Nom</th>
                                            <th>Téléphone</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @forelse($paginator->items() as $row)
                                            @php $isSelected = in_array($row['row_id'], $this->selectedSmsRowIds, true); @endphp
                                            <tr
                                                wire:click="toggleSmsRecipient('{{ $row['row_id'] }}')"
                                                wire:key="row-{{ $row['row_id'] }}"
                                                class="sms-tr {{ $isSelected ? 'sms-tr--selected' : '' }}"
                                            >
                                                <td class="sms-td-check">
                                                    <span class="sms-checkbox {{ $isSelected ? 'sms-checkbox--checked' : '' }}">
                                                        @if($isSelected)
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                                        @endif
                                                    </span>
                                                </td>
                                                <td class="sms-td-name">{{ $row['name'] ?? '—' }}</td>
                                                <td class="sms-td-phone">{{ $row['phone'] }}</td>
                                                <td>
                                                    <span class="sms-source-badge sms-source-badge--{{ $row['source'] }}">
                                                        {{ $row['source_label'] }}
                                                    </span>
                                                </td>
                                            </tr>
                                        @empty
                                            <tr>
                                                <td colspan="4" class="sms-empty">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24" style="margin-bottom:0.5rem;opacity:0.4"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                                                    <div>Aucun destinataire trouvé</div>
                                                </td>
                                            </tr>
                                        @endforelse
                                    </tbody>
                                </table>
                            </div>

                            {{-- Pagination --}}
                            @if($paginator->hasPages())
                                <div class="sms-pagination">
                                    <div class="sms-pagination-perpage">
                                        <label>Par page :</label>
                                        <select wire:model.live="smsRecipientPerPage">
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                    <div class="sms-pagination-nav">
                                        @if($paginator->onFirstPage())
                                            <span class="sms-page-btn sms-page-btn--disabled">‹</span>
                                        @else
                                            <button type="button" wire:click="setSmsRecipientPage({{ $paginator->currentPage() - 1 }})" class="sms-page-btn">‹</button>
                                        @endif
                                        <span class="sms-page-info">{{ $paginator->currentPage() }} / {{ $paginator->lastPage() }}</span>
                                        @if($paginator->hasMorePages())
                                            <button type="button" wire:click="setSmsRecipientPage({{ $paginator->currentPage() + 1 }})" class="sms-page-btn">›</button>
                                        @else
                                            <span class="sms-page-btn sms-page-btn--disabled">›</span>
                                        @endif
                                    </div>
                                </div>
                            @endif

                        @endif {{-- end list mode --}}

                    </div>{{-- /card-body --}}
                </div>{{-- /recipients card --}}

                {{-- ── MESSAGE CARD ── --}}
                <div class="sms-card sms-message-card">
                    <div class="sms-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                        <span>Message</span>
                        @if($charCount > 0)
                            <span class="sms-char-badge {{ $charCount > 160 ? 'sms-char-badge--warn' : 'sms-char-badge--ok' }}">
                                {{ $charCount }}
                            </span>
                        @endif
                    </div>
                    <div class="sms-card-body">
                        <form wire:submit.prevent>
                            {{ $this->form }}
                        </form>
                        <div class="sms-counter-row">
                            <span class="sms-counter-item {{ $charCount > 160 ? 'sms-counter-warn' : '' }}">
                                {{ $charCount }} / 160 car.
                            </span>
                            <span class="sms-counter-sep">·</span>
                            <span class="sms-counter-item">{{ $segments }} segment(s)</span>
                            @if($charCount > 160)
                                <span class="sms-counter-sep">·</span>
                                <span class="sms-counter-item sms-counter-warn">SMS long ({{ $segments }} x)</span>
                            @endif
                        </div>
                    </div>
                </div>

                {{-- ── ACTION BAR ── --}}
                <div class="sms-action-bar">
                    <button
                        type="button"
                        wire:click="send"
                        wire:loading.attr="disabled"
                        wire:confirm="Envoyer à {{ $recipientCount }} destinataire(s) ?"
                        class="sms-btn-send"
                        {{ $recipientCount === 0 ? 'disabled' : '' }}
                    >
                        <span wire:loading.remove wire:target="send" class="sms-btn-send-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                            Envoyer
                            @if($recipientCount > 0)
                                <span class="sms-btn-count">{{ $recipientCount }}</span>
                            @endif
                        </span>
                        <span wire:loading wire:target="send" class="sms-btn-send-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18" class="sms-spin"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            Envoi en cours…
                        </span>
                    </button>
                    <button type="button" wire:click="resetForm" class="sms-btn-reset">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Réinitialiser
                    </button>
                </div>

            </div>{{-- /sms-left --}}

            {{-- ════ RIGHT COLUMN — PREVIEW ════ --}}
            <div class="sms-right">
                <div class="sms-card sms-preview-card">
                    <div class="sms-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="sms-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        <span>Aperçu</span>
                    </div>
                    <div class="sms-card-body sms-preview-body">

                        {{-- Phone mockup --}}
                        <div class="sms-phone">
                            <div class="sms-phone-frame">
                                <div class="sms-phone-notch">
                                    <div class="sms-phone-speaker"></div>
                                </div>
                                <div class="sms-phone-screen">
                                    <div class="sms-phone-topbar">
                                        <div class="sms-phone-topbar-back">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                        </div>
                                        <div class="sms-phone-topbar-contact">
                                            <div class="sms-phone-avatar">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                            </div>
                                            <span>SMS</span>
                                        </div>
                                        <div class="sms-phone-topbar-actions">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" /></svg>
                                        </div>
                                    </div>

                                    <div class="sms-phone-messages">
                                        @if($body !== '')
                                            <div class="sms-bubble">
                                                {{ $body }}
                                                <div class="sms-bubble-time">{{ now()->format('H:i') }}</div>
                                            </div>
                                        @else
                                            <div class="sms-bubble-placeholder">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20" style="opacity:0.3"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                                                <span>Votre message apparaîtra ici…</span>
                                            </div>
                                        @endif
                                    </div>
                                </div>
                                <div class="sms-phone-home"></div>
                            </div>
                        </div>

                        {{-- Stats grid --}}
                        <div class="sms-preview-stats">
                            <div class="sms-stat-box">
                                <div class="sms-stat-val {{ $charCount > 160 ? 'sms-stat-val--warn' : '' }}">{{ $charCount }}</div>
                                <div class="sms-stat-label">Caractères</div>
                            </div>
                            <div class="sms-stat-box">
                                <div class="sms-stat-val">{{ $segments ?: '—' }}</div>
                                <div class="sms-stat-label">Segment(s)</div>
                            </div>
                            <div class="sms-stat-box">
                                <div class="sms-stat-val sms-stat-val--primary">{{ $recipientCount }}</div>
                                <div class="sms-stat-label">Destinataire(s)</div>
                            </div>
                        </div>

                    </div>{{-- /preview-body --}}
                </div>{{-- /preview-card --}}
            </div>{{-- /sms-right --}}

        </div>{{-- /sms-layout --}}
    </div>{{-- /sms-page --}}
</x-filament-panels::page>
