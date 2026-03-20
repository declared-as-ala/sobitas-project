@php
    $seCssPath = resource_path('css/filament/send-email.css');
    $seCss = is_file($seCssPath) ? file_get_contents($seCssPath) : '';

    $activeCampaign   = $this->getActiveCampaign();
    $mailWarning      = $this->getMailDriverWarning();
    $recipientCount   = $this->getRecipientCount();
    $bySource         = $this->getRecipientCountBySource();
    $sourceCounts     = $this->getSourceCounts();
    $manualCounts     = $this->getManualEmailCounts();
    $manualRows       = $this->getManualRecipientRows();
    $dbPaginator      = $this->getPaginatedAllRecipientsFromDb();
    $previewSubject   = $this->getPreviewSubject();
    $previewUrl       = $this->getPreviewUrl();
@endphp

<x-filament-panels::page :max-content-width="'7xl'">
    @if($seCss)
        <style>{!! $seCss !!}</style>
    @endif

    <div class="se-page">

        {{-- ── Campaign progress banner ── --}}
        @if($activeCampaign)
            @php
                $pct = $activeCampaign->total > 0
                    ? (int) round(($activeCampaign->sent + $activeCampaign->failed) / $activeCampaign->total * 100)
                    : 0;
            @endphp
            <div class="se-banner se-banner--campaign" wire:poll.2s="checkCampaignProgress">
                <div class="se-banner-left">
                    <span class="se-campaign-dot {{ in_array($activeCampaign->status, ['queued','sending']) ? 'se-campaign-dot--pulse' : '' }}"></span>
                    <span class="se-campaign-status-badge se-campaign-status-badge--{{ $activeCampaign->status }}">
                        {{ match($activeCampaign->status) {
                            'queued'   => 'En file',
                            'sending'  => 'Envoi en cours',
                            'done'     => 'Terminée',
                            'failed'   => 'Échec',
                            'cancelled'=> 'Annulée',
                            default    => $activeCampaign->status
                        } }}
                    </span>
                    <span class="se-campaign-info">
                        @if($activeCampaign->total > 0)
                            {{ $pct }}% &mdash; {{ $activeCampaign->sent + $activeCampaign->failed }} / {{ $activeCampaign->total }} emails
                            @if($activeCampaign->failed > 0)
                                &middot; <span class="se-text-danger">{{ $activeCampaign->failed }} échec(s)</span>
                            @endif
                        @else
                            En attente…
                        @endif
                    </span>
                </div>
                @if($activeCampaign->isActive())
                    <button type="button" wire:click="cancelCampaign({{ $activeCampaign->id }})" wire:confirm="Arrêter cette campagne ?" class="se-btn-sm se-btn-sm--danger">
                        Arrêter
                    </button>
                @endif
                @if($activeCampaign->total > 0)
                    <div class="se-progress-wrap">
                        <div class="se-progress-track">
                            <div class="se-progress-fill" style="width: {{ min(100, $pct) }}%"></div>
                        </div>
                    </div>
                @endif
            </div>
        @endif

        {{-- ── Mail driver warning ── --}}
        @if($mailWarning)
            <div class="se-banner se-banner--warning">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                <strong>Configuration email :</strong> {{ $mailWarning }}
            </div>
        @endif

        {{-- ── Debug diagnostics ── --}}
        @if(config('app.debug') && $this->showDiagnostics)
            @php $diag = $this->getMailDiagnostics(); @endphp
            <div class="se-card se-diag-card">
                <div class="se-card-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="se-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.867.966 1.867 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.867-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.778 3.778 0 0 1 .4-2.25m0 0a24.347 24.347 0 0 1 4.874 0m-4.875 0a8.998 8.998 0 0 0-1.6 5.53" /></svg>
                    Diagnostics (debug)
                </div>
                <div class="se-card-body se-diag-body">
                    @foreach($diag as $k => $v)
                        <div class="se-diag-row"><span class="se-diag-key">{{ $k }}</span><span class="se-diag-val">{{ $v ?? '—' }}</span></div>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- ════ MAIN LAYOUT ════ --}}
        <div class="se-layout">

            {{-- ── LEFT COLUMN ── --}}
            <div class="se-left">

                {{-- ════ RECIPIENTS CARD ════ --}}
                <div class="se-card">
                    <div class="se-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="se-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                        <span>Destinataires</span>
                        @if($recipientCount > 0)
                            <span class="se-badge-count">{{ $recipientCount }}</span>
                        @endif
                        <div class="se-card-header-actions">
                            <button type="button" wire:click="selectAll" class="se-btn-xs">Tout sélectionner</button>
                            <button type="button" wire:click="deselectAll" class="se-btn-xs se-btn-xs--danger">Tout décocher</button>
                        </div>
                    </div>

                    <div class="se-card-body">

                        {{-- ── Summary chips by source ── --}}
                        @if($recipientCount > 0)
                            <div class="se-summary-chips">
                                @if($bySource['clients'] > 0)
                                    <span class="se-source-chip se-source-chip--client">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                        {{ $bySource['clients'] }} Client(s)
                                    </span>
                                @endif
                                @if($bySource['users'] > 0)
                                    <span class="se-source-chip se-source-chip--user">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                                        {{ $bySource['users'] }} Utilisateur(s)
                                    </span>
                                @endif
                                @if($bySource['contacts'] > 0)
                                    <span class="se-source-chip se-source-chip--contact">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" /></svg>
                                        {{ $bySource['contacts'] }} Contact(s)
                                    </span>
                                @endif
                                @if($bySource['manual'] > 0)
                                    <span class="se-source-chip se-source-chip--manual">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                        {{ $bySource['manual'] }} Manuel(s)
                                    </span>
                                @endif
                                <span class="se-summary-total">= {{ $recipientCount }} total</span>
                            </div>
                        @endif

                        {{-- ── Manual email input ── --}}
                        <div class="se-manual-section">
                            <div class="se-manual-header">
                                <label class="se-label" for="se-manual-input">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                    Emails manuels
                                </label>
                                @if($manualCounts['valid'] > 0 || $manualCounts['invalid'] > 0)
                                    <div class="se-manual-stats">
                                        @if($manualCounts['valid'] > 0)
                                            <span class="se-badge-valid">{{ $manualCounts['valid'] }} valide(s)</span>
                                        @endif
                                        @if($manualCounts['invalid'] > 0)
                                            <span class="se-badge-invalid">{{ $manualCounts['invalid'] }} invalide(s)</span>
                                        @endif
                                    </div>
                                @endif
                            </div>
                            <textarea
                                id="se-manual-input"
                                wire:model.live.debounce.300ms="manualEmails"
                                rows="3"
                                class="se-textarea"
                                placeholder="Entrez des emails, un par ligne ou séparés par virgule :&#10;client@example.com&#10;autre@email.com, test@gmail.com"
                            ></textarea>
                            {{-- Manual email chips --}}
                            @if(count($manualRows) > 0)
                                <div class="se-manual-chips">
                                    @foreach($manualRows as $row)
                                        <span class="se-email-chip">
                                            <span class="se-email-chip-addr">{{ $row['email'] }}</span>
                                            <button type="button" wire:click="removeRecipient('{{ $row['row_id'] }}')" class="se-email-chip-remove" title="Retirer">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="9" height="9"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    @endforeach
                                </div>
                            @endif
                        </div>

                        {{-- ── Search + source filter ── --}}
                        <div class="se-controls-row">
                            <div class="se-search-wrap">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="se-search-icon"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                <input
                                    type="search"
                                    wire:model.live.debounce.300ms="recipientSearch"
                                    placeholder="Rechercher par email ou nom…"
                                    class="se-search"
                                />
                            </div>
                            <div class="se-source-tabs">
                                @foreach([
                                    'all'     => ['label' => 'Tous',          'count' => $sourceCounts['all']],
                                    'client'  => ['label' => 'Clients',       'count' => $sourceCounts['client']],
                                    'user'    => ['label' => 'Utilisateurs',  'count' => $sourceCounts['user']],
                                    'contact' => ['label' => 'Contacts',      'count' => $sourceCounts['contact']],
                                ] as $key => $tab)
                                    <button
                                        type="button"
                                        wire:click="setSourceFilter('{{ $key }}')"
                                        class="se-source-tab {{ $this->sourceFilter === $key ? 'se-source-tab--active' : '' }}"
                                    >
                                        {{ $tab['label'] }}
                                        <span class="se-source-tab-count">{{ $tab['count'] }}</span>
                                    </button>
                                @endforeach
                            </div>
                        </div>

                        {{-- ── Recipients table ── --}}
                        <div class="se-table-wrap">
                            <table class="se-table">
                                <thead>
                                    <tr>
                                        <th class="se-th-check"></th>
                                        <th>Email</th>
                                        <th>Nom</th>
                                        <th>Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @forelse($dbPaginator->items() as $row)
                                        @php $sel = $row['is_selected']; @endphp
                                        <tr
                                            wire:click="toggleRecipient('{{ $row['row_id'] }}')"
                                            wire:key="row-{{ $row['row_id'] }}"
                                            class="se-tr {{ $sel ? 'se-tr--selected' : '' }}"
                                        >
                                            <td class="se-td-check">
                                                <span class="se-checkbox {{ $sel ? 'se-checkbox--checked' : '' }}">
                                                    @if($sel)
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                                    @endif
                                                </span>
                                            </td>
                                            <td class="se-td-email">{{ $row['email'] }}</td>
                                            <td class="se-td-name">{{ $row['name'] ?? '—' }}</td>
                                            <td>
                                                <span class="se-source-badge se-source-badge--{{ $row['source'] }}">{{ $row['source_label'] }}</span>
                                            </td>
                                        </tr>
                                    @empty
                                        <tr>
                                            <td colspan="4" class="se-empty">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="28" height="28" style="opacity:.3;margin-bottom:.5rem"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                                <div>Aucun destinataire trouvé</div>
                                                <div style="font-size:0.75rem;margin-top:.25rem">Modifiez votre recherche ou filtre, ou ajoutez des emails manuellement.</div>
                                            </td>
                                        </tr>
                                    @endforelse
                                </tbody>
                            </table>
                        </div>

                        {{-- ── Pagination ── --}}
                        @if($dbPaginator->total() > 0)
                            <div class="se-pagination">
                                <div class="se-pagination-left">
                                    <label class="se-pagination-label">Par page :</label>
                                    <select wire:model.live="recipientPerPage" class="se-pagination-select">
                                        @foreach([10, 25, 50, 100] as $n)
                                            <option value="{{ $n }}">{{ $n }}</option>
                                        @endforeach
                                    </select>
                                    <span class="se-pagination-total">{{ $dbPaginator->total() }} au total</span>
                                </div>
                                <div class="se-pagination-nav">
                                    @if($dbPaginator->onFirstPage())
                                        <span class="se-page-btn se-page-btn--disabled">‹</span>
                                    @else
                                        <button type="button" wire:click="setRecipientPage({{ $dbPaginator->currentPage() - 1 }})" class="se-page-btn">‹</button>
                                    @endif
                                    <span class="se-page-info">{{ $dbPaginator->currentPage() }} / {{ max(1, $dbPaginator->lastPage()) }}</span>
                                    @if($dbPaginator->hasMorePages())
                                        <button type="button" wire:click="setRecipientPage({{ $dbPaginator->currentPage() + 1 }})" class="se-page-btn">›</button>
                                    @else
                                        <span class="se-page-btn se-page-btn--disabled">›</span>
                                    @endif
                                </div>
                            </div>
                        @endif

                    </div>{{-- /card-body --}}
                </div>{{-- /recipients card --}}

                {{-- ════ TEMPLATE & SUBJECT CARD ════ --}}
                <div class="se-card">
                    <div class="se-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="se-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                        <span>Template &amp; Sujet</span>
                        @if($previewSubject !== '—' && $previewSubject !== '')
                            <span class="se-subject-preview" title="Objet de l'email">{{ \Illuminate\Support\Str::limit($previewSubject, 55) }}</span>
                        @endif
                    </div>
                    <div class="se-card-body">
                        <form wire:submit.prevent>
                            {{ $this->form }}
                        </form>
                    </div>
                </div>

                {{-- ════ SEND ACTION BAR ════ --}}
                <div class="se-action-bar">
                    <button
                        type="button"
                        wire:click="openConfirmSend"
                        wire:loading.attr="disabled"
                        class="se-btn-send {{ $recipientCount === 0 ? 'se-btn-send--disabled' : '' }}"
                        {{ $recipientCount === 0 ? 'disabled' : '' }}
                    >
                        <span wire:loading.remove wire:target="openConfirmSend,send" class="se-btn-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                            Envoyer la campagne
                            @if($recipientCount > 0)
                                <span class="se-btn-count">{{ $recipientCount }}</span>
                            @endif
                        </span>
                        <span wire:loading wire:target="openConfirmSend,send" class="se-btn-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="18" height="18" class="se-spin"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            Préparation…
                        </span>
                    </button>
                    <button type="button" wire:click="clearRecipientSelection" class="se-btn-reset">
                        Réinitialiser
                    </button>
                </div>

                {{-- Confirm modal --}}
                @if($this->confirmSendOpen)
                    <div class="se-modal-backdrop">
                        <div class="se-modal">
                            <div class="se-modal-header">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                Confirmer l'envoi
                            </div>
                            <div class="se-modal-body">
                                <p>Vous allez envoyer l'email <strong>« {{ $this->getTemplateName() }} »</strong> à <strong>{{ $recipientCount }} destinataire(s)</strong>.</p>
                                <p class="se-modal-subject">Objet : {{ $previewSubject }}</p>
                                <p class="se-modal-hint">Cette action est irréversible. L'envoi peut prendre quelques instants pour de grandes listes.</p>
                            </div>
                            <div class="se-modal-actions">
                                <button type="button" wire:click="closeConfirmSend" class="se-btn-reset">Annuler</button>
                                <button type="button" wire:click="confirmAndSend" class="se-btn-send">
                                    <span class="se-btn-inner">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                        Envoyer maintenant
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                @endif

            </div>{{-- /se-left --}}

            {{-- ── RIGHT COLUMN — PREVIEW ── --}}
            <div class="se-right" x-data="{
                widthKey: '600',
                widths: { '375': 375, '600': 600, '700': 700, '800': 800 },
                maximized: false
            }">
                <div class="se-card se-preview-card">
                    <div class="se-card-header">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="se-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        <span>Aperçu</span>
                        <div class="se-preview-toolbar">
                            <span class="se-preview-label">Largeur :</span>
                            <select x-model="widthKey" class="se-preview-select">
                                <option value="375">375px (mobile)</option>
                                <option value="600">600px</option>
                                <option value="700">700px</option>
                                <option value="800">800px</option>
                            </select>
                            <button type="button" @click="maximized = !maximized" class="se-preview-btn" :class="{'se-preview-btn--active': maximized}">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                                <span x-text="maximized ? 'Réduire' : 'Agrandir'"></span>
                            </button>
                        </div>
                    </div>

                    {{-- Subject bar --}}
                    @if($previewSubject && $previewSubject !== '—')
                        <div class="se-subject-bar">
                            <span class="se-subject-bar-label">Objet :</span>
                            <span class="se-subject-bar-value">{{ $previewSubject }}</span>
                        </div>
                    @endif

                    <div class="se-preview-body">
                        <div class="se-preview-outer" :class="{'se-preview-outer--max': maximized}">
                            <div
                                class="se-preview-frame"
                                :style="maximized ? 'max-width:100%' : 'max-width:' + (widths[widthKey] || 600) + 'px'"
                                wire:key="preview-{{ $this->data['template_key'] ?? '' }}-{{ md5(json_encode($this->data['template_vars'] ?? [])) }}"
                            >
                                <iframe
                                    src="{{ $previewUrl }}"
                                    sandbox="allow-same-origin allow-popups allow-forms"
                                    class="se-preview-iframe"
                                    :style="maximized ? 'min-height:85vh;height:85vh' : ''"
                                    title="Aperçu email"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>{{-- /se-right --}}

        </div>{{-- /se-layout --}}
    </div>{{-- /se-page --}}
</x-filament-panels::page>
