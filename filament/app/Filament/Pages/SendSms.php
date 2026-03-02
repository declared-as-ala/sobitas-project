<?php

namespace App\Filament\Pages;

use App\Jobs\SendMarketingSmsJob;
use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
use App\Services\DefaultSmsTemplates;
use App\Services\MarketingService;
use App\Services\SmsService;
use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Schema as SchemaFacade;

/**
 * Envoyer SMS — sends immediately (no queue).
 * Uses SmsService directly; QUEUE_CONNECTION is irrelevant for SMS.
 */
class SendSms extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-chat-bubble-left-right';
    protected static ?string $navigationLabel = 'Envoyer SMS';
    protected static ?string $title = 'Envoyer SMS';
    protected static string | \UnitEnum | null $navigationGroup = 'Marketing';
    protected static ?int $navigationSort = 10;
    protected static ?string $slug = 'send-sms';

    protected string $view = 'filament.pages.send-sms';

    public array $data = [];

    /** @var string[] row_id (e.g. sms_97234567) for table selection */
    public array $selectedSmsRowIds = [];

    public string $recipientSearch = '';

    public int $smsRecipientPerPage = 25;

    public int $smsRecipientPage = 1;

    public function mount(): void
    {
        $keys = array_keys(DefaultSmsTemplates::options());
        $firstKey = $keys[0] ?? null;
        if ($firstKey) {
            $this->data['template_key'] = $firstKey;
            $this->data['template_vars'] = array_merge(
                DefaultSmsTemplates::getDefaultVariables($firstKey),
                ['stop_text' => MarketingService::SMS_STOP_DEFAULT]
            );
        }
        $this->data['send_mode'] = $this->data['send_mode'] ?? 'one';
        $this->data['stop_text'] = $this->data['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT;
    }

    public function form(Schema $schema): Schema
    {
        $templateOptions = DefaultSmsTemplates::options();
        $firstKey = array_key_first($templateOptions);

        return $schema->statePath('data')->schema([
            Forms\Components\Select::make('send_mode')
                ->label('Mode')
                ->options([
                    'one' => 'Un seul destinataire',
                    'list' => 'Liste (plusieurs destinataires)',
                ])
                ->default('one')
                ->live()
                ->required(),

            Forms\Components\TextInput::make('one_phone')
                ->label('Téléphone')
                ->tel()
                ->placeholder('Ex: 97991266 ou +216 97 991 266')
                ->live(onBlur: true)
                ->afterStateUpdated(function ($state, $set) {
                    if (is_string($state) && trim($state) !== '') {
                        $normalized = MarketingService::normalizePhone($state);
                        if (MarketingService::isValidPhone($normalized) && $normalized !== $state) {
                            $set('one_phone', $normalized);
                        }
                    }
                })
                ->visible(fn ($get) => $get('send_mode') === 'one'),

            Forms\Components\Select::make('template_key')
                ->label('Template')
                ->options($templateOptions)
                ->default($firstKey)
                ->live()
                ->required()
                ->afterStateUpdated(fn ($state, $set) => $this->fillTemplateDefaults($state, $set)),

            Forms\Components\KeyValue::make('template_vars')
                ->label('Variables du template')
                ->keyLabel('Variable')
                ->valueLabel('Valeur')
                ->live()
                ->helperText(fn () => $this->getTemplateVariablesHint())
                ->visible(fn ($get) => (bool) $get('template_key') && count(DefaultSmsTemplates::getVariableNames($get('template_key') ?? '')) > 0),

            Forms\Components\Placeholder::make('no_variables_hint')
                ->label('')
                ->content('Aucune variable pour ce template.')
                ->visible(fn ($get) => (bool) $get('template_key') && count(DefaultSmsTemplates::getVariableNames($get('template_key') ?? '')) === 0)
                ->extraAttributes(['class' => 'text-sm text-gray-500 dark:text-gray-400 italic']),

            Forms\Components\Textarea::make('custom_message')
                ->label('Message personnalisé (optionnel)')
                ->rows(4)
                ->maxLength(1000)
                ->live()
                ->placeholder('Laissez vide pour utiliser le template.')
                ->helperText('Le texte STOP est ajouté automatiquement à la fin.'),

            Forms\Components\TextInput::make('stop_text')
                ->label('Texte STOP')
                ->default(MarketingService::SMS_STOP_DEFAULT)
                ->required()
                ->maxLength(20)
                ->helperText('Le texte STOP est obligatoire pour la délivrabilité (ex: STOP).'),

            Forms\Components\Checkbox::make('send_test_to_me')
                ->label('Envoyer un test à mon numéro')
                ->default(false)
                ->visible(fn () => (bool) optional(auth()->user())->phone),
        ])->columns(1);
    }

    protected function fillTemplateDefaults(?string $templateKey, $set): void
    {
        if (!$templateKey) {
            return;
        }
        $defaults = array_merge(
            DefaultSmsTemplates::getDefaultVariables($templateKey),
            ['stop_text' => $this->data['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT]
        );
        $current = $this->data['template_vars'] ?? [];
        $set('template_vars', array_merge($defaults, $current));
    }

    public function getTemplateVariablesHint(): string
    {
        $key = $this->data['template_key'] ?? null;
        if (!$key) {
            return '';
        }
        $names = DefaultSmsTemplates::getVariableNames($key);
        if ($names === []) {
            return 'Aucune variable pour ce template.';
        }
        return 'Variables utilisées: ' . implode(', ', array_map(fn ($n) => '{{' . $n . '}}', $names));
    }

    public function getPreviewBody(): string
    {
        $data = $this->data;
        $custom = trim($data['custom_message'] ?? '');
        $stopText = trim($data['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT) ?: MarketingService::SMS_STOP_DEFAULT;

        if ($custom !== '') {
            return MarketingService::smsWithStop($custom, $stopText);
        }
        $key = $data['template_key'] ?? null;
        if ($key) {
            $vars = array_merge(
                DefaultSmsTemplates::getDefaultVariables($key),
                $data['template_vars'] ?? []
            );
            $vars['stop_text'] = $stopText;
            $body = DefaultSmsTemplates::renderText($key, $vars);
            return MarketingService::smsWithStop($body, $stopText);
        }
        return MarketingService::smsWithStop('', $stopText);
    }

    public function getPreviewCharCount(): int
    {
        return mb_strlen($this->getPreviewBody());
    }

    public function getPreviewSegments(): int
    {
        return DefaultSmsTemplates::estimateSegments($this->getPreviewBody());
    }

    /**
     * Build unique key for dedupe: Tunisia last 8 digits.
     */
    protected static function phoneKey(string $normalized): string
    {
        $digits = preg_replace('/\D/', '', $normalized);
        return strlen($digits) >= 8 ? substr($digits, -8) : $digits;
    }

    /**
     * All SMS recipients from DB (Client phone_1, User phone, Contact phone if exists), deduped by last 8 digits.
     *
     * @return \Illuminate\Support\Collection<int, array{row_id: string, phone: string, name: string|null, source: string, source_label: string, client_id: int|null, user_id: int|null, contact_id: int|null}>
     */
    public function getAllSmsRecipientsRows(): \Illuminate\Support\Collection
    {
        $byKey = [];
        $term = $this->recipientSearch !== '' ? '%' . $this->recipientSearch . '%' : null;

        $clients = Client::query()
            ->whereNotNull('phone_1')
            ->where('phone_1', '!=', '')
            ->whereNull('sms_unsubscribed_at')
            ->when($term, fn ($q) => $q->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('phone_1', 'like', $term);
            }))
            ->select('id', 'name', 'phone_1')
            ->orderBy('name')
            ->get();
        foreach ($clients as $c) {
            $p = MarketingService::normalizePhone($c->phone_1);
            if (!MarketingService::isValidPhone($p)) {
                continue;
            }
            $key = self::phoneKey($p);
            if (!isset($byKey[$key])) {
                $byKey[$key] = [
                    'row_id' => 'sms_' . $key,
                    'phone' => $p,
                    'name' => $c->name,
                    'source' => 'client',
                    'source_label' => 'Client',
                    'client_id' => $c->id,
                    'user_id' => null,
                    'contact_id' => null,
                ];
            }
        }

        $users = User::query()
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->when($term, fn ($q) => $q->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)->orWhere('phone', 'like', $term);
            }))
            ->select('id', 'name', 'phone')
            ->orderBy('name')
            ->get();
        foreach ($users as $u) {
            $p = MarketingService::normalizePhone($u->phone);
            if (!MarketingService::isValidPhone($p)) {
                continue;
            }
            $key = self::phoneKey($p);
            if (!isset($byKey[$key])) {
                $byKey[$key] = [
                    'row_id' => 'sms_' . $key,
                    'phone' => $p,
                    'name' => $u->name,
                    'source' => 'user',
                    'source_label' => 'Utilisateur',
                    'client_id' => null,
                    'user_id' => $u->id,
                    'contact_id' => null,
                ];
            }
        }

        if (SchemaFacade::hasTable('contacts') && SchemaFacade::hasColumn('contacts', 'phone')) {
            $contacts = Contact::query()
                ->whereNotNull('phone')
                ->where('phone', '!=', '')
                ->when($term, fn ($q) => $q->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)->orWhere('phone', 'like', $term);
                }))
                ->select('id', 'name', 'phone')
                ->orderBy('name')
                ->get();
            foreach ($contacts as $c) {
                $p = MarketingService::normalizePhone($c->phone);
                if (!MarketingService::isValidPhone($p)) {
                    continue;
                }
                $key = self::phoneKey($p);
                if (!isset($byKey[$key])) {
                    $byKey[$key] = [
                        'row_id' => 'sms_' . $key,
                        'phone' => $p,
                        'name' => $c->name,
                        'source' => 'contact',
                        'source_label' => 'Contact',
                        'client_id' => null,
                        'user_id' => null,
                        'contact_id' => $c->id,
                    ];
                }
            }
        }

        return collect($byKey)->sortBy('phone')->values();
    }

    public function getPaginatedSmsRecipients(): LengthAwarePaginator
    {
        $rows = $this->getAllSmsRecipientsRows();
        $total = $rows->count();
        $page = max(1, $this->smsRecipientPage);
        $perPage = in_array($this->smsRecipientPerPage, [10, 25, 50, 100], true) ? $this->smsRecipientPerPage : 25;
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->values()->all();
        return new LengthAwarePaginator($items, $total, $perPage, $page, ['path' => request()->url(), 'pageName' => 'smsRecipientPage']);
    }

    public function toggleSmsRecipient(string $rowId): void
    {
        if (in_array($rowId, $this->selectedSmsRowIds, true)) {
            $this->selectedSmsRowIds = array_values(array_filter($this->selectedSmsRowIds, fn ($id) => $id !== $rowId));
        } else {
            $this->selectedSmsRowIds = array_merge($this->selectedSmsRowIds, [$rowId]);
        }
    }

    public function selectAllSmsCurrentPage(): void
    {
        foreach ($this->getPaginatedSmsRecipients()->items() as $row) {
            if (!in_array($row['row_id'], $this->selectedSmsRowIds, true)) {
                $this->selectedSmsRowIds[] = $row['row_id'];
            }
        }
    }

    public function selectAllSms(): void
    {
        $this->selectedSmsRowIds = $this->getAllSmsRecipientsRows()->pluck('row_id')->values()->all();
    }

    public function deselectAllSms(): void
    {
        $this->selectedSmsRowIds = [];
    }

    /** @return \Illuminate\Support\Collection<int, array{phone_1: string, client_id: int|null, user_id: int|null}> */
    public function getResolvedRecipients(): \Illuminate\Support\Collection
    {
        $mode = $this->data['send_mode'] ?? 'one';
        if ($mode === 'one') {
            $phone = trim($this->data['one_phone'] ?? '');
            if ($phone === '') {
                return collect();
            }
            $phone = MarketingService::normalizePhone($phone);
            if (!MarketingService::isValidPhone($phone)) {
                return collect();
            }
            return collect([['phone_1' => $phone, 'client_id' => null, 'user_id' => null]]);
        }
        if ($mode === 'list') {
            $all = $this->getAllSmsRecipientsRows();
            return $all->filter(fn ($r) => in_array($r['row_id'], $this->selectedSmsRowIds, true))
                ->map(fn ($r) => ['phone_1' => $r['phone'], 'client_id' => $r['client_id'], 'user_id' => $r['user_id']])
                ->values();
        }
        return collect();
    }

    public function getRecipientCount(): int
    {
        return $this->getResolvedRecipients()->count();
    }

    public function getTotalAvailableRecipients(): int
    {
        return $this->getAllSmsRecipientsRows()->count();
    }

    public function clearRecipientSelection(): void
    {
        $this->selectedSmsRowIds = [];
    }

    public function setSmsRecipientPage(int $page): void
    {
        $this->smsRecipientPage = max(1, $page);
    }

    /** @return array{clients: int, users: int, contacts: int, total: int} */
    public function getRecipientCountBySource(): array
    {
        $recipients = $this->getResolvedRecipients();
        $all = $this->getAllSmsRecipientsRows()->keyBy('row_id');
        $clients = $users = $contacts = 0;
        foreach ($this->selectedSmsRowIds as $rowId) {
            $r = $all->get($rowId);
            if (!$r) {
                continue;
            }
            if ($r['source'] === 'client') {
                $clients++;
            } elseif ($r['source'] === 'user') {
                $users++;
            } else {
                $contacts++;
            }
        }
        return ['clients' => $clients, 'users' => $users, 'contacts' => $contacts, 'total' => $recipients->count()];
    }

    /** Send SMS to a single recipient from the table (row_id). */
    public function sendToOneRecipient(string $rowId): void
    {
        $all = $this->getAllSmsRecipientsRows();
        $row = $all->firstWhere('row_id', $rowId);
        if (!$row) {
            Notification::make()->title('Destinataire introuvable')->danger()->send();
            return;
        }
        $body = $this->getPreviewBody();
        if ($body === '' || $body === trim($this->data['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT)) {
            Notification::make()->title('Message vide')->body('Renseignez un message ou un template.')->danger()->send();
            return;
        }
        try {
            SendMarketingSmsJob::dispatchSync(
                $row['phone'],
                $body,
                null,
                $row['client_id'],
                null,
                null
            );
            Notification::make()->title('SMS envoyé')->body('Envoyé à ' . $row['phone'])->success()->send();
        } catch (\Throwable $e) {
            Notification::make()->title('Échec envoi')->body($e->getMessage())->danger()->send();
        }
    }

    public function send(): void
    {
        $data = $this->form->getState();
        $mode = $data['send_mode'] ?? 'one';
        $custom = trim($data['custom_message'] ?? '');
        $templateKey = $data['template_key'] ?? null;
        $stopText = trim($data['stop_text'] ?? MarketingService::SMS_STOP_DEFAULT) ?: MarketingService::SMS_STOP_DEFAULT;

        $body = $this->getPreviewBody();
        if ($body === '' || $body === $stopText) {
            Notification::make()->title('Message vide')->body('Renseignez un message ou un template.')->danger()->send();
            return;
        }

        $recipients = $this->getResolvedRecipients();
        $count = $recipients->count();

        if ($count === 0) {
            if ($mode === 'one') {
                Notification::make()->title('Téléphone requis')->body('Saisissez un numéro valide (8 chiffres, +216 optionnel).')->danger()->send();
            } else {
                Notification::make()->title('Aucun destinataire')->body('Sélectionnez au moins un destinataire.')->warning()->send();
            }
            return;
        }

        $sendTestToMe = !empty($data['send_test_to_me']) && optional(auth()->user())->phone;
        if ($sendTestToMe) {
            $testPhone = MarketingService::normalizePhone(auth()->user()->phone);
            if (MarketingService::isValidPhone($testPhone)) {
                try {
                    app(SmsService::class)->send_sms($testPhone, $body);
                    Notification::make()->title('Test envoyé')->body('SMS de test envoyé à votre numéro.')->success()->send();
                } catch (\Throwable $e) {
                    Notification::make()->title('Échec test')->body($e->getMessage())->danger()->send();
                }
            }
        }

        $smsService = app(SmsService::class);
        $sent = 0;
        $failed = 0;
        foreach ($recipients as $r) {
            try {
                $smsService->send_sms($r['phone_1'], $body);
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
            }
        }

        if ($failed > 0) {
            Notification::make()
                ->title('Envoi terminé')
                ->body($sent . ' envoyé(s), ' . $failed . ' échec(s).')
                ->warning()
                ->send();
        } else {
            Notification::make()
                ->title('Envoi terminé')
                ->body($sent . ' SMS envoyé(s).')
                ->success()
                ->send();
        }

        $this->form->fill(['custom_message' => '', 'one_phone' => '']);
        $this->selectedSmsRowIds = [];
    }

    public function resetForm(): void
    {
        $this->form->fill([
            'one_phone' => '',
            'custom_message' => '',
            'stop_text' => MarketingService::SMS_STOP_DEFAULT,
        ]);
        $this->selectedSmsRowIds = [];
        $keys = array_keys(DefaultSmsTemplates::options());
        $firstKey = $keys[0] ?? null;
        if ($firstKey) {
            $this->data['template_key'] = $firstKey;
            $this->data['template_vars'] = array_merge(
                DefaultSmsTemplates::getDefaultVariables($firstKey),
                ['stop_text' => MarketingService::SMS_STOP_DEFAULT]
            );
        }
        Notification::make()->title('Formulaire réinitialisé')->success()->send();
    }

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'send-sms';
    }
}
