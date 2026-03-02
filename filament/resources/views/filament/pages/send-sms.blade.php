@php
    $sendSmsCssPath = resource_path('css/filament/send-sms.css');
    $sendSmsCss = is_file($sendSmsCssPath) ? file_get_contents($sendSmsCssPath) : '';
@endphp
<x-filament-panels::page>
    @if($sendSmsCss)
        <style>{!! $sendSmsCss !!}</style>
    @endif

    <div class="send-sms-page">
        <div class="send-sms-layout">
            <div class="send-sms-main">
                <x-filament::section heading="Destinataires">
                    <div class="fi-section-content-ctn">
                        <form wire:submit.prevent>
                            {{ $this->form }}
                        </form>

                        @if(($this->data['send_mode'] ?? 'one') === 'list')
                            @php $paginator = $this->getPaginatedSmsRecipients(); @endphp
                            <div class="send-sms-section-body" style="margin-top: 1rem;">
                                <div class="send-sms-dest-header">
                                    <span class="send-sms-dest-count">
                                        <strong>{{ $this->getRecipientCount() }}</strong> sélectionné(s) / {{ $this->getTotalAvailableRecipients() }} disponible(s)
                                    </span>
                                    <div class="send-sms-bulk-actions">
                                        <x-filament::button type="button" size="sm" wire:click="selectAllSmsCurrentPage">Sélectionner la page</x-filament::button>
                                        <x-filament::button type="button" size="sm" wire:click="selectAllSms">Tout sélectionner</x-filament::button>
                                        <x-filament::button type="button" size="sm" color="danger" outlined wire:click="deselectAllSms">Tout désélectionner</x-filament::button>
                                    </div>
                                </div>
                                <div class="send-sms-search-wrap">
                                    <input type="search" wire:model.live.debounce.300ms="recipientSearch" placeholder="Rechercher par nom ou téléphone…" />
                                </div>
                                <div class="send-sms-table-wrap">
                                    <div class="send-sms-table-scroll">
                                        <table class="send-sms-table">
                                            <thead>
                                                <tr>
                                                    <th class="send-sms-cell-checkbox"><span class="sr-only">Inclure</span></th>
                                                    <th>Téléphone</th>
                                                    <th>Nom</th>
                                                    <th>Source</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                @forelse($paginator->items() as $row)
                                                    <tr>
                                                        <td class="send-sms-cell-checkbox">
                                                            <input type="checkbox" wire:click="toggleSmsRecipient('{{ $row['row_id'] }}')" {{ in_array($row['row_id'], $this->selectedSmsRowIds, true) ? 'checked' : '' }} title="Sélectionner" />
                                                        </td>
                                                        <td>{{ $row['phone'] }}</td>
                                                        <td class="send-sms-cell-muted">{{ $row['name'] ?? '—' }}</td>
                                                        <td class="send-sms-cell-muted">{{ $row['source_label'] }}</td>
                                                        <td>
                                                            <x-filament::button size="xs" wire:click="sendToOneRecipient('{{ $row['row_id'] }}')" wire:confirm="Envoyer le SMS à {{ $row['phone'] }} ?" wire:key="send-one-{{ $row['row_id'] }}">
                                                                Envoyer à ce numéro
                                                            </x-filament::button>
                                                        </td>
                                                    </tr>
                                                @empty
                                                    <tr>
                                                        <td colspan="5" class="send-sms-empty">Aucun numéro trouvé (Clients, Utilisateurs, Contacts).</td>
                                                    </tr>
                                                @endforelse
                                            </tbody>
                                        </table>
                                    </div>
                                    @if($paginator->hasPages())
                                        <div class="send-sms-pagination">
                                            <div>
                                                <label for="send-sms-per-page">Par page :</label>
                                                <select id="send-sms-per-page" wire:model.live="smsRecipientPerPage">
                                                    <option value="10">10</option>
                                                    <option value="25">25</option>
                                                    <option value="50">50</option>
                                                    <option value="100">100</option>
                                                </select>
                                                <span class="send-sms-pagination-total">({{ $paginator->total() }} au total)</span>
                                            </div>
                                            <div>
                                                @if($paginator->onFirstPage())
                                                    <span aria-disabled="true">Préc.</span>
                                                @else
                                                    <button type="button" wire:click="setSmsRecipientPage({{ $paginator->currentPage() - 1 }})">Préc.</button>
                                                @endif
                                                <span style="margin: 0 0.5rem;">{{ $paginator->currentPage() }} / {{ $paginator->lastPage() }}</span>
                                                @if($paginator->hasMorePages())
                                                    <button type="button" wire:click="setSmsRecipientPage({{ $paginator->currentPage() + 1 }})">Suiv.</button>
                                                @else
                                                    <span aria-disabled="true">Suiv.</span>
                                                @endif
                                            </div>
                                        </div>
                                    @endif
                                </div>
                            </div>
                        @endif
                    </div>
                </x-filament::section>
            </div>

            <div>
                <x-filament::section heading="Aperçu" wire:key="sms-preview-{{ md5($this->getPreviewBody()) }}">
                    <div class="fi-section-content-ctn">
                        <div class="send-sms-preview-box">
                            <div class="send-sms-preview-inner">
                                <p class="send-sms-preview-text">{{ $this->getPreviewBody() ?: '— Choisissez un template ou saisissez un message —' }}</p>
                            </div>
                        </div>
                        @php $len = $this->getPreviewCharCount(); $segments = $this->getPreviewSegments(); @endphp
                        <p style="margin-top: 0.75rem; font-size: 0.875rem; color: var(--sms-text-muted, #6b7280);">
                            {{ $len }} caractère(s){{ $len > 160 ? ' · plus d\'un SMS' : '' }} · {{ $segments }} segment(s) · <strong>{{ $this->getRecipientCount() }}</strong> destinataire(s)
                        </p>
                    </div>
                </x-filament::section>
            </div>
        </div>

        <x-filament::section class="send-sms-section" style="margin-top: 1rem;">
            <div class="fi-section-content-ctn send-sms-actions-bar">
                <x-filament::button
                    wire:click="send"
                    wire:loading.attr="disabled"
                    wire:confirm="Confirmer l'envoi à {{ $this->getRecipientCount() }} destinataire(s) ?"
                    :disabled="$this->getRecipientCount() === 0"
                >
                    <x-filament::loading-indicator wire:loading wire:target="send" class="size-5" />
                    <span wire:loading.remove wire:target="send">Envoyer</span>
                    <span wire:loading wire:target="send">Envoi en cours...</span>
                </x-filament::button>
                <x-filament::button color="gray" outlined wire:click="resetForm">Réinitialiser</x-filament::button>
            </div>
        </x-filament::section>
    </div>
</x-filament-panels::page>
