<?php

namespace App\Filament\Pages;

use App\Jobs\ProcessCampaignJob;
use App\Mail\MarketingEmailMailable;
use App\Models\Client;
use App\Models\Contact;
use App\Models\MarketingCampaign;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Services\DefaultEmailTemplates;
use App\Services\MarketingService;
use App\Services\RecipientResolver;
use Filament\Actions\Action;
use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendEmail extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-envelope';
    protected static ?string $navigationLabel = 'Envoyer Email';
    protected static ?string $title = 'Envoyer Email';
    protected static string | \UnitEnum | null $navigationGroup = 'Marketing';
    protected static ?int $navigationSort = 15;
    protected static ?string $slug = 'send-email';

    protected string $view = 'filament.pages.send-email';

    public array $data = [];

    /** @var int[] */
    public array $selectedClientIds = [];

    /** @var int[] */
    public array $selectedUserIds = [];

    /** @var int[] */
    public array $selectedContactIds = [];

    public string $manualEmails = '';

    public string $recipientSearch = '';

    /** Per-page for recipients table: 10, 25, 50, 100 */
    public int $recipientPerPage = 25;

    public int $recipientPage = 1;

    public bool $showDiagnostics = false;

    public bool $confirmSendOpen = false;

    /** Track last campaign we sent a "finished" notification for, to avoid duplicates. */
    public ?int $lastNotifiedCampaignId = null;

    /** Filter the recipients table by source: all | client | user | contact */
    public string $sourceFilter = 'all';

    public function mount(): void
    {
        $keys = array_keys(DefaultEmailTemplates::options());
        $firstKey = $keys[0] ?? null;
        if ($firstKey) {
            $this->data['template_key'] = $firstKey;
            $this->data['template_vars'] = DefaultEmailTemplates::getDefaultVariables($firstKey);
        }
    }

    public function form(Schema $schema): Schema
    {
        $templateOptions = DefaultEmailTemplates::options();
        $firstKey = array_key_first($templateOptions);

        return $schema->statePath('data')->schema([
            Forms\Components\Select::make('template_key')
                ->label('Template')
                ->options($templateOptions)
                ->default($firstKey)
                ->live()
                ->required()
                ->afterStateUpdated(fn ($state, $set) => $this->fillTemplateDefaults($state, $set)),

            Forms\Components\TextInput::make('subject_override')
                ->label('Objet (optionnel)')
                ->placeholder('Laissez vide pour utiliser l\'objet du template')
                ->maxLength(255)
                ->columnSpanFull(),

            Forms\Components\KeyValue::make('template_vars')
                ->label('Variables du template')
                ->keyLabel('Variable')
                ->valueLabel('Valeur')
                ->live()
                ->helperText(fn () => $this->getTemplateVariablesHint())
                ->visible(fn ($get) => (bool) $get('template_key') && count(DefaultEmailTemplates::getVariableNames($get('template_key') ?? '')) > 0),
        ])->columns(1);
    }

    protected function fillTemplateDefaults(?string $templateKey, $set): void
    {
        if (!$templateKey) {
            return;
        }
        $defaults = DefaultEmailTemplates::getDefaultVariables($templateKey);
        $current = $this->data['template_vars'] ?? [];
        $set('template_vars', array_merge($defaults, $current));
    }

    public function getTemplateVariablesHint(): string
    {
        $key = $this->data['template_key'] ?? null;
        if (!$key) {
            return '';
        }
        $names = DefaultEmailTemplates::getVariableNames($key);
        if ($names === []) {
            return 'Aucune variable pour ce template.';
        }
        return 'Variables utilisées: ' . implode(', ', array_map(fn ($n) => '{{' . $n . '}}', $names));
    }

    public function getClientRecipientsForPicker(): Collection
    {
        $q = Client::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->whereNull('email_unsubscribed_at')
            ->select('id', 'name', 'email', 'phone_1')
            ->orderBy('name');
        if ($this->recipientSearch !== '') {
            $term = '%' . $this->recipientSearch . '%';
            $q->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
            });
        }
        return $q->limit(500)->get();
    }

    public function getUserRecipientsForPicker(): Collection
    {
        $q = User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('id', 'name', 'email', 'phone')
            ->orderBy('name');
        if ($this->recipientSearch !== '') {
            $term = '%' . $this->recipientSearch . '%';
            $q->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
            });
        }
        return $q->limit(500)->get();
    }

    public function getContactRecipientsForPicker(): Collection
    {
        $q = Contact::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->select('id', 'name', 'email')
            ->orderBy('name');
        if ($this->recipientSearch !== '') {
            $term = '%' . $this->recipientSearch . '%';
            $q->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
            });
        }
        return $q->limit(500)->get();
    }

    public function getResolvedRecipients(): Collection
    {
        return RecipientResolver::resolve(
            $this->selectedClientIds,
            $this->selectedUserIds,
            $this->manualEmails,
            $this->selectedContactIds
        );
    }

    public function getRecipientCount(): int
    {
        return $this->getResolvedRecipients()->count();
    }

    public function getManualEmailCounts(): array
    {
        $parsed = RecipientResolver::parseManualEmails($this->manualEmails);
        return ['valid' => count($parsed['valid']), 'invalid' => count($parsed['invalid'])];
    }

    /** Counts by source (for summary chips). Total is deduplicated. */
    public function getRecipientCountBySource(): array
    {
        $clients = RecipientResolver::resolve($this->selectedClientIds, [], '', [])->count();
        $users = RecipientResolver::resolve([], $this->selectedUserIds, '', [])->count();
        $contacts = RecipientResolver::resolve([], [], '', $this->selectedContactIds)->count();
        $manual = count(RecipientResolver::parseManualEmails($this->manualEmails)['valid']);
        return [
            'clients' => $clients,
            'users' => $users,
            'contacts' => $contacts,
            'manual' => $manual,
            'total' => $this->getRecipientCount(),
        ];
    }

    /** Total available recipients (clients + users + contacts with valid email). */
    public function getTotalAvailableRecipients(): int
    {
        $clients = Client::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->whereNull('email_unsubscribed_at')
            ->count();
        $users = User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->count();
        $contacts = Contact::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->count();
        return $clients + $users + $contacts;
    }

    /** Source labels for display. */
    private static function sourceLabels(): array
    {
        return ['client' => 'Client', 'user' => 'Utilisateur', 'contact' => 'Contact', 'manual' => 'Manuel'];
    }

    /**
     * All recipients from DB (clients + users + contacts) paginated, with is_selected flag.
     * Table always shows this list so user can see and select recipients.
     *
     * @return LengthAwarePaginator<array{row_id: string, email: string, name: string|null, source: string, source_label: string, is_selected: bool}>
     */
    public function getPaginatedAllRecipientsFromDb(): LengthAwarePaginator
    {
        $term = $this->recipientSearch !== '' ? strtolower($this->recipientSearch) : null;
        $search = fn ($q, $fields) => $term ? $q->where(function ($q) use ($term, $fields) {
            foreach ($fields as $f) {
                $q->orWhere($f, 'like', '%' . $term . '%');
            }
        }) : $q;

        $clients = Client::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->whereNull('email_unsubscribed_at')
            ->when($term, fn ($q) => $search($q, ['name', 'email']))
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'row_id' => 'client_' . $c->id,
                'email' => $c->email,
                'name' => $c->name,
                'source' => 'client',
                'source_label' => 'Client',
                'is_selected' => in_array($c->id, $this->selectedClientIds, true),
            ]);

        $users = User::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->when($term, fn ($q) => $search($q, ['name', 'email']))
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'row_id' => 'user_' . $u->id,
                'email' => $u->email,
                'name' => $u->name,
                'source' => 'user',
                'source_label' => 'Utilisateur',
                'is_selected' => in_array($u->id, $this->selectedUserIds, true),
            ]);

        $contacts = Contact::query()
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->when($term, fn ($q) => $search($q, ['name', 'email']))
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'row_id' => 'contact_' . $c->id,
                'email' => $c->email,
                'name' => $c->name,
                'source' => 'contact',
                'source_label' => 'Contact',
                'is_selected' => in_array($c->id, $this->selectedContactIds, true),
            ]);

        $rows = $clients->concat($users)->concat($contacts)->sortBy('name')->values();

        if ($this->sourceFilter !== 'all') {
            $rows = $rows->filter(fn ($r) => $r['source'] === $this->sourceFilter)->values();
        }
        $total = $rows->count();
        $page = max(1, (int) $this->recipientPage);
        $perPage = in_array($this->recipientPerPage, [10, 25, 50, 100], true) ? $this->recipientPerPage : 25;
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->values()->all();
        return new LengthAwarePaginator($items, $total, $perPage, $page, ['path' => request()->url(), 'pageName' => 'recipientPage']);
    }

    /**
     * Manual-only rows for the table (from textarea). Shown in same table or above.
     *
     * @return array<int, array{row_id: string, email: string, name: string|null, source: string, source_label: string, is_selected: true}>
     */
    public function getManualRecipientRows(): array
    {
        $parsed = RecipientResolver::parseManualEmails($this->manualEmails);
        $labels = self::sourceLabels();
        return array_map(fn ($email) => [
            'row_id' => 'manual_' . md5(strtolower($email)),
            'email' => $email,
            'name' => null,
            'source' => 'manual',
            'source_label' => $labels['manual'],
            'is_selected' => true,
        ], $parsed['valid']);
    }

    /**
     * Paginated recipients for the "selected only" view (legacy). Prefer showing all DB + manual.
     *
     * @return LengthAwarePaginator<array{row_id: string, email: string, name: string|null, source: string, source_label: string, status: string}>
     */
    public function getPaginatedRecipientsForTable(): LengthAwarePaginator
    {
        $all = $this->getResolvedRecipients();
        if ($this->recipientSearch !== '') {
            $term = strtolower($this->recipientSearch);
            $all = $all->filter(function ($r) use ($term) {
                return str_contains(strtolower($r['email'] ?? ''), $term)
                    || str_contains(strtolower($r['name'] ?? ''), $term);
            })->values();
        }
        $rows = $all->map(function ($r) {
            $sourceLabels = self::sourceLabels();
            return [
                'row_id' => $r['row_id'],
                'email' => $r['email'],
                'name' => $r['name'] ?? '—',
                'source' => $r['source'],
                'source_label' => $sourceLabels[$r['source']] ?? $r['source'],
                'status' => 'Valide',
            ];
        });
        $total = $rows->count();
        $page = max(1, (int) $this->recipientPage);
        $perPage = in_array($this->recipientPerPage, [10, 25, 50, 100], true) ? $this->recipientPerPage : 25;
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->values()->all();
        return new LengthAwarePaginator($items, $total, $perPage, $page, ['path' => request()->url(), 'pageName' => 'recipientPage']);
    }

    /** Toggle one DB recipient in/out of selection (by row_id). */
    public function toggleRecipient(string $rowId): void
    {
        if (str_starts_with($rowId, 'client_')) {
            $id = (int) substr($rowId, 7);
            if (in_array($id, $this->selectedClientIds, true)) {
                $this->selectedClientIds = array_values(array_filter($this->selectedClientIds, fn ($i) => $i !== $id));
            } else {
                $this->selectedClientIds = array_merge($this->selectedClientIds, [$id]);
            }
            return;
        }
        if (str_starts_with($rowId, 'user_')) {
            $id = (int) substr($rowId, 5);
            if (in_array($id, $this->selectedUserIds, true)) {
                $this->selectedUserIds = array_values(array_filter($this->selectedUserIds, fn ($i) => $i !== $id));
            } else {
                $this->selectedUserIds = array_merge($this->selectedUserIds, [$id]);
            }
            return;
        }
        if (str_starts_with($rowId, 'contact_')) {
            $id = (int) substr($rowId, 8);
            if (in_array($id, $this->selectedContactIds, true)) {
                $this->selectedContactIds = array_values(array_filter($this->selectedContactIds, fn ($i) => $i !== $id));
            } else {
                $this->selectedContactIds = array_merge($this->selectedContactIds, [$id]);
            }
        }
    }

    public function removeRecipient(string $rowId): void
    {
        if (str_starts_with($rowId, 'client_')) {
            $id = (int) substr($rowId, 7);
            $this->selectedClientIds = array_values(array_filter($this->selectedClientIds, fn ($i) => $i !== $id));
            return;
        }
        if (str_starts_with($rowId, 'user_')) {
            $id = (int) substr($rowId, 5);
            $this->selectedUserIds = array_values(array_filter($this->selectedUserIds, fn ($i) => $i !== $id));
            return;
        }
        if (str_starts_with($rowId, 'contact_')) {
            $id = (int) substr($rowId, 8);
            $this->selectedContactIds = array_values(array_filter($this->selectedContactIds, fn ($i) => $i !== $id));
            return;
        }
        if (str_starts_with($rowId, 'manual_')) {
            $hash = substr($rowId, 7);
            $parsed = RecipientResolver::parseManualEmails($this->manualEmails);
            $valid = array_filter($parsed['valid'], fn ($email) => md5(strtolower($email)) === $hash);
            $toRemove = reset($valid);
            if ($toRemove !== false) {
                $newValid = array_values(array_filter($parsed['valid'], fn ($e) => strtolower($e) !== strtolower($toRemove)));
                $this->manualEmails = implode("\n", array_merge($parsed['invalid'], $newValid));
            }
        }
    }

    public function selectAllCurrentPage(): void
    {
        $paginator = $this->getPaginatedRecipientsForTable();
        foreach ($paginator->items() as $row) {
            $this->addRecipientByRowId($row['row_id']);
        }
    }

    public function deselectAllCurrentPage(): void
    {
        $paginator = $this->getPaginatedRecipientsForTable();
        foreach ($paginator->items() as $row) {
            $this->removeRecipient($row['row_id']);
        }
    }

    /** Add a single recipient by row_id (for "select all on page" we only add; for "select all filtered" we need to add from available pool). */
    protected function addRecipientByRowId(string $rowId): void
    {
        if (str_starts_with($rowId, 'client_')) {
            $id = (int) substr($rowId, 7);
            if (!in_array($id, $this->selectedClientIds, true)) {
                $this->selectedClientIds = array_merge($this->selectedClientIds, [$id]);
            }
            return;
        }
        if (str_starts_with($rowId, 'user_')) {
            $id = (int) substr($rowId, 5);
            if (!in_array($id, $this->selectedUserIds, true)) {
                $this->selectedUserIds = array_merge($this->selectedUserIds, [$id]);
            }
            return;
        }
        if (str_starts_with($rowId, 'contact_')) {
            $id = (int) substr($rowId, 8);
            if (!in_array($id, $this->selectedContactIds, true)) {
                $this->selectedContactIds = array_merge($this->selectedContactIds, [$id]);
            }
            return;
        }
    }

    /** Select all available recipients (all clients + users + contacts). */
    public function selectAll(): void
    {
        $this->selectedClientIds = $this->getClientRecipientsForPicker()->pluck('id')->values()->all();
        $this->selectedUserIds = $this->getUserRecipientsForPicker()->pluck('id')->values()->all();
        $this->selectedContactIds = $this->getContactRecipientsForPicker()->pluck('id')->values()->all();
    }

    public function deselectAll(): void
    {
        $this->clearRecipientSelection();
    }

    public function setRecipientPage(int $page): void
    {
        $this->recipientPage = max(1, $page);
    }

    public function setSourceFilter(string $filter): void
    {
        $this->sourceFilter = in_array($filter, ['all', 'client', 'user', 'contact'], true) ? $filter : 'all';
        $this->recipientPage = 1;
    }

    /** Counts per source from the full (unfiltered, unsearched) DB pool. */
    public function getSourceCounts(): array
    {
        $clients = Client::query()
            ->whereNotNull('email')->where('email', '!=', '')->whereNull('email_unsubscribed_at')
            ->count();
        $users = User::query()
            ->whereNotNull('email')->where('email', '!=', '')
            ->count();
        $contacts = Contact::query()
            ->whereNotNull('email')->where('email', '!=', '')
            ->count();
        return ['all' => $clients + $users + $contacts, 'client' => $clients, 'user' => $users, 'contact' => $contacts];
    }

    public function getTemplateName(): string
    {
        $key = $this->data['template_key'] ?? null;
        if (!$key) {
            return '—';
        }
        $t = DefaultEmailTemplates::get($key);
        return $t['name'] ?? $key;
    }

    public function getPreviewSubject(): string
    {
        $data = $this->data;
        $override = trim($data['subject_override'] ?? '');
        if ($override !== '') {
            return $override;
        }
        $key = $data['template_key'] ?? null;
        if (!$key) {
            return '—';
        }
        $vars = array_merge(DefaultEmailTemplates::getDefaultVariables($key), $data['template_vars'] ?? []);
        return DefaultEmailTemplates::renderSubject($key, $vars);
    }

    public function getPreviewHtml(): string
    {
        $data = $this->data;
        $key = $data['template_key'] ?? null;
        if (!$key) {
            return '';
        }
        $vars = array_merge(DefaultEmailTemplates::getDefaultVariables($key), $data['template_vars'] ?? []);
        $vars['logo_url'] = config('marketing.preview_logo_url', rtrim(config('app.url'), '/') . '/logo.png');
        $vars['unsubscribe_url'] = MarketingService::unsubscribeUrl('email', 'preview@example.com');
        return DefaultEmailTemplates::renderHtml($key, $vars);
    }

    /**
     * Preview HTML with entities decoded so the iframe renders correctly (no visible &quot; &nbsp; etc).
     */
    public function getPreviewHtmlForIframe(): string
    {
        $html = $this->getPreviewHtml();
        return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * URL for the email preview iframe (renders full HTML via EmailPreviewController).
     */
    public function getPreviewUrl(): string
    {
        $template = $this->data['template_key'] ?? '';
        $vars = $this->data['template_vars'] ?? [];
        return route('email-campaign.preview') . '?template=' . urlencode($template) . '&vars=' . urlencode(json_encode($vars));
    }

    public function getActiveCampaign(): ?MarketingCampaign
    {
        return MarketingCampaign::where('type', 'email')
            ->whereIn('status', [MarketingCampaign::STATUS_QUEUED, MarketingCampaign::STATUS_SENDING])
            ->orderByDesc('id')
            ->first();
    }

    public function cancelCampaign(int $id): void
    {
        $campaign = MarketingCampaign::find($id);
        if ($campaign && $campaign->type === 'email' && $campaign->isActive()) {
            $campaign->cancel();
            Notification::make()->title('Campagne annulée')->success()->send();
        }
    }

    public function getMailDiagnostics(): array
    {
        return [
            'mail_default' => config('mail.default'),
            'mail_host' => config('mail.mailers.smtp.host'),
            'mail_from_address' => config('mail.from.address'),
            'mail_from_name' => config('mail.from.name'),
            'queue_default' => config('queue.default'),
        ];
    }

    public function getCampaignLogsUrl(?int $campaignId = null): string
    {
        $base = rtrim(config('filament.path', 'admin'), '/');
        $path = '/' . $base . '/campaign-logs';
        if ($campaignId !== null) {
            $path .= '?campaign_id=' . (int) $campaignId;
        }
        return url($path);
    }

    public function openConfirmSend(): void
    {
        Log::info('SendEmail: openConfirmSend called', ['recipient_count' => $this->getRecipientCount(), 'template_key' => $this->data['template_key'] ?? null]);

        if ($this->getRecipientCount() === 0) {
            Notification::make()->title('Aucun destinataire')->body('Sélectionnez au moins un destinataire (cochez des lignes dans le tableau ou ajoutez des emails manuellement).')->warning()->send();
            return;
        }
        $templateKey = $this->data['template_key'] ?? null;
        if (!$templateKey || !DefaultEmailTemplates::get($templateKey)) {
            Notification::make()->title('Template requis')->body('Choisissez un template d\'email.')->danger()->send();
            return;
        }
        $this->confirmSendOpen = true;
    }

    public function closeConfirmSend(): void
    {
        $this->confirmSendOpen = false;
    }

    public function confirmAndSend(): void
    {
        $this->closeConfirmSend();
        $this->send();
    }

    public function send(): void
    {
        Log::info('SendEmail: send() called');

        $recipients = $this->getResolvedRecipients();
        $count = $recipients->count();
        if ($count === 0) {
            Notification::make()->title('Aucun destinataire')->warning()->send();
            return;
        }

        $data = $this->form->getState();
        $templateKey = $data['template_key'] ?? null;
        if (!$templateKey || !DefaultEmailTemplates::get($templateKey)) {
            Notification::make()->title('Template requis')->danger()->send();
            return;
        }

        $vars = array_merge(DefaultEmailTemplates::getDefaultVariables($templateKey), $data['template_vars'] ?? []);
        $subjectOverride = trim($data['subject_override'] ?? '');
        $subject = $subjectOverride !== '' ? $subjectOverride : DefaultEmailTemplates::renderSubject($templateKey, $vars);
        $recipientList = RecipientResolver::toCampaignRecipients($recipients);

        Log::info('Campaign send', array_merge($this->getMailDiagnostics(), ['campaign_template' => $templateKey, 'recipient_count' => $count]));

        $campaign = MarketingCampaign::create([
            'type' => 'email',
            'template_key' => $templateKey,
            'template_vars' => $vars,
            'subject' => $subject,
            'recipients' => $recipientList,
            'total' => $count,
            'sent' => 0,
            'failed' => 0,
            'status' => MarketingCampaign::STATUS_QUEUED,
        ]);

        $syncThreshold = (int) config('marketing.sync_threshold', 20);
        $useSync = $count <= $syncThreshold;

        if ($useSync) {
            $campaign->markSending();
            $campaignIdStr = (string) $campaign->id;
            foreach ($recipientList as $r) {
                $email = $r['email'] ?? '';
                $clientId = $r['client_id'] ?? null;
                if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $campaign->incrementFailed();
                    MarketingService::createLog('email', null, 'email', $email, $clientId, 'failed', $campaignIdStr, null, 'Invalid email');
                    continue;
                }
                $vars['logo_url'] = MarketingService::logoUrl();
                $unsub = MarketingService::unsubscribeUrl('email', $email, $clientId);
                $vars['unsubscribe_url'] = $unsub;
                $html = DefaultEmailTemplates::renderHtml($templateKey, $vars);
                try {
                    Mail::to($email)->send(new MarketingEmailMailable($subject, $html, $unsub));
                    $campaign->incrementSent();
                    MarketingService::createLog('email', null, 'email', $email, $clientId, 'sent', $campaignIdStr);
                } catch (\Throwable $e) {
                    Log::error('Campaign email send failed', ['email' => $email, 'campaign_id' => $campaign->id, 'error' => $e->getMessage()]);
                    $campaign->incrementFailed();
                    MarketingService::createLog('email', null, 'email', $email, $clientId, 'failed', $campaignIdStr, null, $e->getMessage());
                }
            }
            $campaign->refresh();
            $sent = $campaign->sent;
            $failed = $campaign->failed;
            if ($failed > 0) {
                Notification::make()->title('Campagne terminée')->body($sent . ' envoyé(s), ' . $failed . ' échec(s).')->warning()->send();
            } else {
                Notification::make()->title('Campagne terminée')->body($sent . ' email(s) envoyés.')->success()->send();
            }
            $this->selectedClientIds = [];
            $this->selectedUserIds = [];
            $this->selectedContactIds = [];
            $this->manualEmails = '';
        } else {
            ProcessCampaignJob::dispatch($campaign->id, false);
            Notification::make()->title('Campagne démarrée')->body($count . ' email(s) en file. Suivez la progression ci-dessous.')->success()->send();
            $this->selectedClientIds = [];
            $this->selectedUserIds = [];
            $this->selectedContactIds = [];
            $this->manualEmails = '';
        }
    }

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'send-email';
    }

    public function getMaxContentWidth(): ?string
    {
        return '7xl';
    }

    public function clearRecipientSelection(): void
    {
        $this->selectedClientIds = [];
        $this->selectedUserIds = [];
        $this->selectedContactIds = [];
        $this->manualEmails = '';
    }

    public function getMailDriverWarning(): ?string
    {
        $driver = config('mail.default');
        if (in_array($driver, ['log', 'array'], true)) {
            return 'MAIL_MAILER est sur « ' . $driver . ' » : les emails ne sont pas envoyés réellement.';
        }
        return null;
    }

    protected function getHeaderActions(): array
    {
        $actions = [];
        $activeCampaign = $this->getActiveCampaign();
        $canSend = $this->getRecipientCount() > 0
            && (bool) ($this->data['template_key'] ?? null)
            && DefaultEmailTemplates::get($this->data['template_key'] ?? '')
            && !($activeCampaign && $activeCampaign->isActive());

        $actions[] = Action::make('send')
            ->label('Envoyer')
            ->icon('heroicon-o-paper-airplane')
            ->color('primary')
            ->disabled(!$canSend)
            ->requiresConfirmation()
            ->modalHeading('Confirmer l\'envoi')
            ->modalSubmitActionLabel('Envoyer maintenant')
            ->modalDescription(fn () => 'Template : ' . $this->getTemplateName() . ' — ' . $this->getRecipientCount() . ' destinataire(s). L\'envoi peut prendre quelques instants.')
            ->action('send');

        if (config('app.debug')) {
            $actions[] = Action::make('toggleDiagnostics')
                ->label(fn () => $this->showDiagnostics ? 'Masquer diagnostics' : 'Afficher diagnostics')
                ->icon('heroicon-o-bug-ant')
                ->color('gray')
                ->action(fn () => $this->showDiagnostics = !$this->showDiagnostics);
        }
        return $actions;
    }

    /**
     * Called on poll when campaign is active; when campaign finishes, send a one-time notification.
     */
    public function checkCampaignProgress(): void
    {
        $active = $this->getActiveCampaign();
        if ($active !== null) {
            return;
        }
        $finished = MarketingCampaign::where('type', 'email')
            ->whereIn('status', [MarketingCampaign::STATUS_DONE, MarketingCampaign::STATUS_FAILED])
            ->orderByDesc('id')
            ->first();
        if ($finished === null || $finished->id === $this->lastNotifiedCampaignId) {
            return;
        }
        if (!$finished->finished_at || $finished->finished_at->diffInSeconds(now()) > 120) {
            return;
        }
        $this->lastNotifiedCampaignId = $finished->id;
        $sent = $finished->sent;
        $failed = $finished->failed;
        $total = $finished->total;
        if ($failed > 0) {
            Notification::make()
                ->title('Campagne terminée')
                ->body($sent . ' envoyé(s), ' . $failed . ' échec(s) sur ' . $total . '.')
                ->warning()
                ->send();
        } else {
            Notification::make()
                ->title('Campagne terminée')
                ->body($sent . ' email(s) envoyés.')
                ->success()
                ->send();
        }
    }
}
