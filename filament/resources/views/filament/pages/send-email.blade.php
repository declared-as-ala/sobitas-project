@php
    $sendEmailCssPath = resource_path('css/filament/send-email.css');
    $sendEmailCss = is_file($sendEmailCssPath) ? file_get_contents($sendEmailCssPath) : '';
@endphp
<x-filament-panels::page :max-content-width="'7xl'">
    @if($sendEmailCss)
        <style>{!! $sendEmailCss !!}</style>
    @endif

    <div class="send-email-page">
        @php $activeCampaign = $this->getActiveCampaign(); @endphp
        @if($activeCampaign)
            @php
                $pct = $activeCampaign->total > 0 ? (int) round(($activeCampaign->sent + $activeCampaign->failed) / $activeCampaign->total * 100) : 0;
                $sentTotal = $activeCampaign->sent + $activeCampaign->failed;
            @endphp
            <x-filament::section wire:poll.1s="checkCampaignProgress" class="send-email-campaign fi-section-progress">
                <div class="fi-section-content">
                    <div class="send-email-dest-header">
                        <div>
                            <x-filament::badge :color="match($activeCampaign->status) {
                                'queued' => 'warning',
                                'sending' => 'info',
                                'done' => 'success',
                                'failed' => 'danger',
                                'cancelled' => 'gray',
                                default => 'gray'
                            }">
                                {{ match($activeCampaign->status) {
                                    'queued' => 'En file',
                                    'sending' => 'Envoi en cours…',
                                    'done' => 'Terminée',
                                    'failed' => 'Échec',
                                    'cancelled' => 'Annulée',
                                    default => $activeCampaign->status
                                } }}
                            </x-filament::badge>
                            <span class="send-email-dest-count">
                                @if($activeCampaign->total > 0)
                                    Envoi en cours… {{ $pct }}% ({{ $sentTotal }}/{{ $activeCampaign->total }})
                                    @if($activeCampaign->failed > 0)
                                        · <span class="text-danger-600 dark:text-danger-400">{{ $activeCampaign->failed }} échec(s)</span>
                                    @endif
                                @else
                                    {{ $activeCampaign->sent }} / {{ $activeCampaign->total }} envoyés
                                @endif
                            </span>
                        </div>
                        @if($activeCampaign->isActive())
                            <x-filament::button size="sm" color="gray" outlined wire:click="cancelCampaign({{ $activeCampaign->id }})" wire:confirm="Arrêter cette campagne ?">Arrêter</x-filament::button>
                        @endif
                    </div>
                    @if($activeCampaign->total > 0)
                        <div class="send-email-progress-track" role="progressbar" aria-valuenow="{{ $pct }}" aria-valuemin="0" aria-valuemax="100">
                            <div class="send-email-progress-fill" style="width: {{ min(100, $pct) }}%"></div>
                        </div>
                    @endif
                </div>
            </x-filament::section>
        @endif

        @if(config('app.debug') && $this->showDiagnostics)
            @php $diagnostics = $this->getMailDiagnostics(); @endphp
            <x-filament::section heading="Diagnostics (debug)" class="send-email-campaign">
                <ul class="fi-section-content-ctn text-sm font-mono">
                    <li><strong>mail.default</strong> {{ $diagnostics['mail_default'] ?? '—' }}</li>
                    <li><strong>mail.mailers.smtp.host</strong> {{ $diagnostics['mail_host'] ?? '—' }}</li>
                    <li><strong>mail.from.address</strong> {{ $diagnostics['mail_from_address'] ?? '—' }}</li>
                    <li><strong>queue.default</strong> {{ $diagnostics['queue_default'] ?? '—' }}</li>
                </ul>
            </x-filament::section>
        @endif

        @if($mailWarning = $this->getMailDriverWarning())
            <x-filament::section class="send-email-campaign">
                <div class="fi-section-content-ctn text-sm text-danger-600 dark:text-danger-400">
                    <strong>⚠️ Configuration email :</strong> {{ $mailWarning }}
                </div>
            </x-filament::section>
        @endif

        <p class="send-email-steps" aria-hidden="true">
            <span>Destinataires</span><span>Template</span><span>Aperçu</span><span>Envoyer</span>
        </p>

        <div class="send-email-layout">
            <div class="send-email-main">
                {{-- 1. Destinataires --}}
                <div class="send-email-section">
                    <h2 class="send-email-section-heading">Destinataires</h2>
                    <div class="send-email-section-body">
                        <div class="send-email-dest-header">
                            <span class="send-email-dest-count">
                                <strong>{{ $this->getRecipientCount() }}</strong> sélectionné(s) / {{ $this->getTotalAvailableRecipients() }} disponible(s)
                            </span>
                            <div class="send-email-dest-header-actions">
                                <x-filament::button type="button" size="sm" wire:click="selectAll">Sélectionner tous</x-filament::button>
                                <x-filament::button type="button" size="sm" color="gray" outlined wire:click="deselectAll">Désélectionner</x-filament::button>
                                @if($this->getRecipientCount() > 0)
                                    <x-filament::button type="button" size="sm" color="danger" outlined wire:click="clearRecipientSelection">Tout effacer</x-filament::button>
                                @endif
                            </div>
                        </div>

                        <div class="send-email-manual-wrap">
                            <label class="send-email-manual-label" for="send-email-manual-input">Ajouter des emails manuellement</label>
                            <textarea
                                id="send-email-manual-input"
                                wire:model.live.debounce.300ms="manualEmails"
                                rows="3"
                                class="send-email-textarea fi-input block w-full rounded-lg border border-gray-300 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white sm:text-sm"
                                placeholder="Un email par ligne ou séparés par virgule :&#10;email1@example.com&#10;email2@example.com, email3@example.com"
                            ></textarea>
                            <p class="send-email-manual-hint">Un email par ligne ou séparés par virgule. Les adresses valides apparaissent dans le tableau ci-dessous (Source = Manuel).</p>
                            @php $manualCounts = $this->getManualEmailCounts(); @endphp
                            @if($manualCounts['invalid'] > 0)
                                <p class="send-email-manual-hint send-email-manual-warning">{{ $manualCounts['invalid'] }} adresse(s) invalide(s) ignorée(s).</p>
                            @endif
                        </div>

                        <div class="send-email-controls">
                            <div class="send-email-search-wrap">
                                <x-filament::input.wrapper>
                                    <x-filament::input type="search" wire:model.live.debounce.300ms="recipientSearch" placeholder="Rechercher par email ou nom..." />
                                </x-filament::input.wrapper>
                            </div>
                        </div>

                        @php
                            $manualRows = $this->getManualRecipientRows();
                            $dbPaginator = $this->getPaginatedAllRecipientsFromDb();
                        @endphp
                        <div class="send-email-table-wrap">
                            <div class="send-email-table-scroll">
                                <table class="send-email-table fi-ta-table">
                                    <thead>
                                        <tr>
                                            <th class="send-email-cell-checkbox"><span class="sr-only">Inclure</span></th>
                                            <th>Email</th>
                                            <th>Nom</th>
                                            <th>Source</th>
                                            <th class="send-email-cell-actions"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($manualRows as $row)
                                            <tr class="send-email-row-manual">
                                                <td class="send-email-cell-checkbox"><span class="send-email-cell-included" title="Inclus (manuel)">✓</span></td>
                                                <td>{{ $row['email'] }}</td>
                                                <td class="send-email-cell-muted">—</td>
                                                <td class="send-email-cell-muted">{{ $row['source_label'] }}</td>
                                                <td class="send-email-cell-actions">
                                                    <x-filament::icon-button icon="heroicon-o-x-mark" size="sm" color="gray" wire:click="removeRecipient('{{ $row['row_id'] }}')" title="Retirer" />
                                                </td>
                                            </tr>
                                        @endforeach
                                        @foreach($dbPaginator->items() as $row)
                                            <tr>
                                                <td class="send-email-cell-checkbox">
                                                    <input type="checkbox" class="send-email-row-checkbox" wire:click="toggleRecipient('{{ $row['row_id'] }}')" {{ $row['is_selected'] ? 'checked' : '' }} title="{{ $row['is_selected'] ? 'Décocher pour exclure' : 'Cocher pour inclure' }}" />
                                                </td>
                                                <td>{{ $row['email'] }}</td>
                                                <td class="send-email-cell-muted">{{ $row['name'] ?? '—' }}</td>
                                                <td class="send-email-cell-muted">{{ $row['source_label'] }}</td>
                                                <td class="send-email-cell-actions">
                                                    @if($row['is_selected'])
                                                        <x-filament::icon-button icon="heroicon-o-x-mark" size="sm" color="gray" wire:click="removeRecipient('{{ $row['row_id'] }}')" title="Retirer" />
                                                    @endif
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            @if($dbPaginator->total() === 0 && count($manualRows) === 0)
                                <p class="send-email-empty">Aucun destinataire disponible (clients, utilisateurs, contacts avec email). Ajoutez des emails manuellement ci-dessus.</p>
                            @else
                                <div class="send-email-pagination">
                                    <div>
                                        <label for="send-email-per-page" class="send-email-filters-label">Par page :</label>
                                        <select id="send-email-per-page" wire:model.live="recipientPerPage">
                                            @foreach([10, 25, 50, 100] as $n)
                                                <option value="{{ $n }}">{{ $n }}</option>
                                            @endforeach
                                        </select>
                                        <span class="send-email-pagination-total">({{ $dbPaginator->total() }} au total)</span>
                                    </div>
                                    <div class="send-email-pagination-nav">
                                        <x-filament::button type="button" size="sm" color="gray" outlined :disabled="$dbPaginator->onFirstPage()" wire:click="setRecipientPage({{ $dbPaginator->currentPage() - 1 }})">Préc.</x-filament::button>
                                        <span>{{ $dbPaginator->currentPage() }} / {{ max(1, $dbPaginator->lastPage()) }}</span>
                                        <x-filament::button type="button" size="sm" color="gray" outlined :disabled="!$dbPaginator->hasMorePages()" wire:click="setRecipientPage({{ $dbPaginator->currentPage() + 1 }})">Suiv.</x-filament::button>
                                    </div>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>

                {{-- 2. Template + subject --}}
                <div class="send-email-section">
                    <h2 class="send-email-section-heading">Template</h2>
                    <div class="send-email-section-body send-email-template-group">
                        <div>
                            {{ $this->form }}
                        </div>
                    </div>
                </div>
            </div>

            {{-- 3. Sidebar: single Aperçu (one preview only) --}}
            <div class="send-email-sidebar" x-data="{
                maximized: false,
                widthKey: '600',
                widths: { '375': 375, '600': 600, '700': 700, '800': 800 }
            }">
                <div class="send-email-section send-email-preview-section" :class="{ 'send-email-preview-maximized': maximized }" wire:key="email-preview-{{ $this->data['template_key'] ?? '' }}-{{ md5(json_encode($this->data['template_vars'] ?? [])) }}">
                    <div class="send-email-preview-heading-row">
                        <h2 class="send-email-section-heading">Aperçu</h2>
                        <div class="send-email-preview-toolbar">
                            <span class="send-email-preview-toolbar-label">Largeur :</span>
                            <select class="send-email-preview-width-select" x-model="widthKey">
                                <option value="375">375px (mobile)</option>
                                <option value="600">600px</option>
                                <option value="700">700px</option>
                                <option value="800">800px</option>
                            </select>
                            <button type="button" class="send-email-preview-toolbar-btn" :class="{ 'is-active': maximized }" @click="maximized = !maximized" x-text="maximized ? 'Réduire' : 'Maximiser'">Maximiser</button>
                        </div>
                    </div>
                    <div class="send-email-section-body send-email-preview-body">
                        <div class="send-email-preview-outer">
                            <div class="send-email-preview-frame" :style="'max-width: ' + (maximized ? '100%' : (widths[widthKey] || 600) + 'px')">
                                <iframe
                                    src="{{ $this->getPreviewUrl() }}"
                                    sandbox="allow-same-origin allow-popups allow-forms"
                                    class="send-email-preview-iframe"
                                    title="Aperçu email"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</x-filament-panels::page>
