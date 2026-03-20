<?php

namespace App\Filament\Pages;

use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
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

    public string $sendMode = 'one';

    public string $onePhone = '';

    /** @var string[] row_id for table selection */
    public array $selectedSmsRowIds = [];

    public string $recipientSearch = '';

    public int $smsRecipientPerPage = 25;

    public int $smsRecipientPage = 1;

    public function mount(): void
    {
        $this->data['message'] = '';
    }

    public function form(Schema $schema): Schema
    {
        return $schema->statePath('data')->schema([
            Forms\Components\Textarea::make('message')
                ->label('Message')
                ->rows(6)
                ->maxLength(1600)
                ->live()
                ->placeholder('Écrivez votre message ici…')
                ->required(),
        ])->columns(1);
    }

    public function getPreviewBody(): string
    {
        return trim($this->data['message'] ?? '');
    }

    public function getPreviewCharCount(): int
    {
        return mb_strlen($this->getPreviewBody());
    }

    public function getPreviewSegments(): int
    {
        $len = $this->getPreviewCharCount();
        if ($len === 0) {
            return 0;
        }
        if ($len <= 160) {
            return 1;
        }
        return (int) ceil($len / 153);
    }

    protected static function phoneKey(string $normalized): string
    {
        $digits = preg_replace('/\D/', '', $normalized);
        return strlen($digits) >= 8 ? substr($digits, -8) : $digits;
    }

    /**
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
                    'row_id'       => 'sms_' . $key,
                    'phone'        => $p,
                    'name'         => $c->name,
                    'source'       => 'client',
                    'source_label' => 'Client',
                    'client_id'    => $c->id,
                    'user_id'      => null,
                    'contact_id'   => null,
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
                    'row_id'       => 'sms_' . $key,
                    'phone'        => $p,
                    'name'         => $u->name,
                    'source'       => 'user',
                    'source_label' => 'Utilisateur',
                    'client_id'    => null,
                    'user_id'      => $u->id,
                    'contact_id'   => null,
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
                        'row_id'       => 'sms_' . $key,
                        'phone'        => $p,
                        'name'         => $c->name,
                        'source'       => 'contact',
                        'source_label' => 'Contact',
                        'client_id'    => null,
                        'user_id'      => null,
                        'contact_id'   => $c->id,
                    ];
                }
            }
        }

        return collect($byKey)->sortBy('name')->values();
    }

    public function getSelectedRows(): \Illuminate\Support\Collection
    {
        if (empty($this->selectedSmsRowIds)) {
            return collect();
        }
        return $this->getAllSmsRecipientsRows()
            ->filter(fn ($r) => in_array($r['row_id'], $this->selectedSmsRowIds, true))
            ->values();
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

    public function removeSelectedRecipient(string $rowId): void
    {
        $this->selectedSmsRowIds = array_values(array_filter($this->selectedSmsRowIds, fn ($id) => $id !== $rowId));
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

    public function getResolvedRecipients(): \Illuminate\Support\Collection
    {
        if ($this->sendMode === 'one') {
            $phone = trim($this->onePhone);
            if ($phone === '') {
                return collect();
            }
            $phone = MarketingService::normalizePhone($phone);
            if (!MarketingService::isValidPhone($phone)) {
                return collect();
            }
            return collect([['phone_1' => $phone, 'client_id' => null, 'user_id' => null]]);
        }
        if ($this->sendMode === 'list') {
            $all = $this->getAllSmsRecipientsRows();
            return $all
                ->filter(fn ($r) => in_array($r['row_id'], $this->selectedSmsRowIds, true))
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

    public function setSmsRecipientPage(int $page): void
    {
        $this->smsRecipientPage = max(1, $page);
    }

    public function send(): void
    {
        $data = $this->form->getState();
        $body = trim($data['message'] ?? '');

        if ($body === '') {
            Notification::make()->title('Message vide')->body('Rédigez un message avant d\'envoyer.')->danger()->send();
            return;
        }

        $recipients = $this->getResolvedRecipients();
        $count = $recipients->count();

        if ($count === 0) {
            if ($this->sendMode === 'one') {
                Notification::make()->title('Téléphone requis')->body('Saisissez un numéro valide (8 chiffres, +216 optionnel).')->danger()->send();
            } else {
                Notification::make()->title('Aucun destinataire')->body('Sélectionnez au moins un destinataire.')->warning()->send();
            }
            return;
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
                ->title($sent > 1 ? 'SMS envoyés' : 'SMS envoyé')
                ->body($sent . ' SMS envoyé(s) avec succès.')
                ->success()
                ->send();
        }

        $this->data['message'] = '';
        $this->onePhone = '';
        $this->selectedSmsRowIds = [];
        $this->form->fill(['message' => '']);
    }

    public function resetForm(): void
    {
        $this->data['message'] = '';
        $this->onePhone = '';
        $this->selectedSmsRowIds = [];
        $this->form->fill(['message' => '']);
    }

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'send-sms';
    }
}
