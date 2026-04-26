<?php

namespace App\Services;

use App\Enums\LoyaltyCardStatus;
use App\Enums\LoyaltyTransactionType;
use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyCardBatch;
use App\Models\LoyaltyPointTransaction;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LoyaltyService
{
    // ── Business rules (single source of truth) ──────────────────────────────

    public const POINTS_PER_DT       = 1;   // 1 point per 1 DT spent
    public const POINTS_PER_DT_VALUE = 10;  // 10 points = 1 DT discount
    public const MIN_REDEEM_POINTS   = 100; // minimum to redeem in one transaction

    private ?bool $hasAssignedAtColumn = null;
    private ?bool $hasBarcodeValueColumn = null;
    private ?bool $hasGivenToClientAtColumn = null;
    private ?bool $hasNotesColumn = null;
    private array $loyaltyTxColumnCache = [];

    private function hasAssignedAtColumn(): bool
    {
        if ($this->hasAssignedAtColumn !== null) {
            return $this->hasAssignedAtColumn;
        }

        return $this->hasAssignedAtColumn = Schema::hasColumn('loyalty_cards', 'assigned_at');
    }

    private function hasBarcodeValueColumn(): bool
    {
        if ($this->hasBarcodeValueColumn !== null) {
            return $this->hasBarcodeValueColumn;
        }

        return $this->hasBarcodeValueColumn = Schema::hasColumn('loyalty_cards', 'barcode_value');
    }

    private function hasGivenToClientAtColumn(): bool
    {
        if ($this->hasGivenToClientAtColumn !== null) {
            return $this->hasGivenToClientAtColumn;
        }

        return $this->hasGivenToClientAtColumn = Schema::hasColumn('loyalty_cards', 'given_to_client_at');
    }

    private function hasNotesColumn(): bool
    {
        if ($this->hasNotesColumn !== null) {
            return $this->hasNotesColumn;
        }

        return $this->hasNotesColumn = Schema::hasColumn('loyalty_cards', 'notes');
    }

    private function hasLoyaltyTransactionColumn(string $column): bool
    {
        if (array_key_exists($column, $this->loyaltyTxColumnCache)) {
            return $this->loyaltyTxColumnCache[$column];
        }

        return $this->loyaltyTxColumnCache[$column] = Schema::hasColumn('loyalty_point_transactions', $column);
    }

    // ── Card generation ───────────────────────────────────────────────────────

    public function formatCardNumber(string $prefix, int $number, int $padding): string
    {
        return $prefix . '-' . str_pad((string) $number, $padding, '0', STR_PAD_LEFT);
    }

    public function generateBatch(LoyaltyCardBatch $batch): LoyaltyCardBatch
    {
        $prefix  = $batch->prefix;
        $start   = $batch->start_number;
        $qty     = $batch->quantity;
        $padding = $batch->padding;

        $chunk     = [];
        $chunkSize = 500;
        $generated = 0;
        $now       = now()->toDateTimeString();

        for ($i = 0; $i < $qty; $i++) {
            $chunk[] = [
                'batch_id'    => $batch->id,
                'card_number' => $this->formatCardNumber($prefix, $start + $i, $padding),
                'qr_token'    => (string) \Illuminate\Support\Str::uuid(),
                'status'      => LoyaltyCard::preferredAvailableStatusValue(),
                'created_at'  => $now,
                'updated_at'  => $now,
            ];

            if (count($chunk) >= $chunkSize) {
                DB::table('loyalty_cards')->insertOrIgnore($chunk);
                $generated += count($chunk);
                $chunk = [];
            }
        }

        if (!empty($chunk)) {
            DB::table('loyalty_cards')->insertOrIgnore($chunk);
            $generated += count($chunk);
        }

        $batch->update(['generated_count' => $generated]);

        return $batch->refresh();
    }

    // ── Card assignment ───────────────────────────────────────────────────────

    public function assignCard(LoyaltyCard $card, Client $client): LoyaltyCard
    {
        return $this->assignCardToClient($card, $client, false);
    }

    public function markCardLost(LoyaltyCard $card, ?string $notes = null): LoyaltyCard
    {
        if ($card->status !== LoyaltyCardStatus::Active) {
            throw new \RuntimeException("Seule une carte active peut être marquée comme perdue.");
        }

        $data = [
            'status'  => LoyaltyCardStatus::Lost->value,
            'lost_at' => now(),
        ];

        if ($this->hasNotesColumn()) {
            $data['notes'] = $notes ?? $card->notes;
        }

        $card->update($data);

        return $card->refresh();
    }

    public function replaceCard(LoyaltyCard $newCard, LoyaltyCard $lostCard): LoyaltyCard
    {
        if (!$newCard->isAssignable()) {
            throw new \RuntimeException("La nouvelle carte {$newCard->card_number} n'est pas disponible.");
        }

        if (!$lostCard->client_id) {
            throw new \RuntimeException("La carte perdue n'est pas associée à un client.");
        }

        return DB::transaction(function () use ($newCard, $lostCard) {
            $client = $lostCard->client;

            $data = [
                'client_id'              => $client->id,
                'status'                 => LoyaltyCardStatus::Active->value,
                'replacement_for_card_id' => $lostCard->id,
            ];

            if ($this->hasAssignedAtColumn()) {
                $data['assigned_at'] = now();
            }

            $newCard->update($data);

            return $newCard->refresh();
        });
    }

    // ── Points calculation ────────────────────────────────────────────────────

    public function calculateEarnablePoints(float $prixTtc, float $loyaltyDiscount = 0): int
    {
        $eligible = max(0.0, $prixTtc - $loyaltyDiscount);

        return (int) floor($eligible * self::POINTS_PER_DT);
    }

    public function pointsToDiscount(int $points): float
    {
        return $points / self::POINTS_PER_DT_VALUE;
    }

    public function validateRedemption(Client $client, int $points, float $ticketTotal): array
    {
        $errors = [];

        if ($points <= 0) {
            return ['valid' => true, 'errors' => []];
        }

        if ($points < self::MIN_REDEEM_POINTS) {
            $errors[] = "Minimum " . self::MIN_REDEEM_POINTS . " points requis pour utiliser vos points.";
        }

        if ($points > $client->loyalty_points_balance) {
            $errors[] = "Solde insuffisant ({$client->loyalty_points_balance} pts disponibles).";
        }

        $discount = $this->pointsToDiscount($points);
        if ($discount > $ticketTotal) {
            $maxPoints = (int) floor($ticketTotal * self::POINTS_PER_DT_VALUE);
            $errors[] = "Vous ne pouvez pas utiliser plus de {$maxPoints} pts sur ce ticket ({$ticketTotal} DT).";
        }

        return ['valid' => empty($errors), 'errors' => $errors];
    }

    // ── Core ticket loyalty processing (idempotent) ───────────────────────────

    public function processTicketLoyalty(
        Ticket $ticket,
        Client $client,
        LoyaltyCard $card,
        int $pointsToRedeem,
        float $prixTtc
    ): array {
        // Idempotency gate
        if ($ticket->loyalty_processed_at !== null) {
            return $ticket->loyaltyTransactions()->get()->all();
        }

        $transactions   = [];
        $loyaltyDiscount = 0.0;

        // Redeem transaction
        if ($pointsToRedeem > 0) {
            $validation = $this->validateRedemption($client, $pointsToRedeem, $prixTtc);
            if (!$validation['valid']) {
                throw new \RuntimeException(implode(' ', $validation['errors']));
            }

            $loyaltyDiscount = $this->pointsToDiscount($pointsToRedeem);

            $newBalance = $client->loyalty_points_balance - $pointsToRedeem;

            $payload = [
                'client_id'       => $client->id,
                'loyalty_card_id' => $card->id,
                'ticket_id'       => $ticket->id,
                'type'            => LoyaltyTransactionType::Redeem->value,
                'points'          => -$pointsToRedeem,
                'description'     => "Utilisation sur ticket {$ticket->numero}",
            ];

            if ($this->hasLoyaltyTransactionColumn('balance_after')) {
                $payload['balance_after'] = $newBalance;
            }
            if ($this->hasLoyaltyTransactionColumn('processed_by')) {
                $payload['processed_by'] = auth()->id();
            }

            $transactions[] = LoyaltyPointTransaction::create($payload);

            DB::table('clients')
                ->where('id', $client->id)
                ->decrement('loyalty_points_balance', $pointsToRedeem);

            $client->loyalty_points_balance = $newBalance;
        }

        // Earn transaction
        $pointsEarned = $this->calculateEarnablePoints($prixTtc, $loyaltyDiscount);

        if ($pointsEarned > 0) {
            $newBalance = $client->loyalty_points_balance + $pointsEarned;

            $payload = [
                'client_id'       => $client->id,
                'loyalty_card_id' => $card->id,
                'ticket_id'       => $ticket->id,
                'type'            => LoyaltyTransactionType::Earn->value,
                'points'          => $pointsEarned,
                'description'     => "Gain sur ticket {$ticket->numero}",
            ];

            if ($this->hasLoyaltyTransactionColumn('balance_after')) {
                $payload['balance_after'] = $newBalance;
            }
            if ($this->hasLoyaltyTransactionColumn('processed_by')) {
                $payload['processed_by'] = auth()->id();
            }

            $transactions[] = LoyaltyPointTransaction::create($payload);

            DB::table('clients')
                ->where('id', $client->id)
                ->increment('loyalty_points_balance', $pointsEarned);

            $client->loyalty_points_balance = $newBalance;
        }

        // Stamp ticket
        DB::table('tickets')->where('id', $ticket->id)->update([
            'loyalty_card_id'         => $card->id,
            'loyalty_points_redeemed' => $pointsToRedeem,
            'loyalty_discount_dt'     => number_format($loyaltyDiscount, 3, '.', ''),
            'loyalty_points_earned'   => $pointsEarned,
            'loyalty_processed_at'    => now(),
        ]);

        return $transactions;
    }

    // ── Manual adjustment ─────────────────────────────────────────────────────

    public function adjustPoints(Client $client, int $delta, string $description, ?User $by = null): LoyaltyPointTransaction
    {
        return DB::transaction(function () use ($client, $delta, $description, $by) {
            $newBalance = $client->loyalty_points_balance + $delta;
            if ($newBalance < 0) {
                throw new \RuntimeException("L'ajustement amènerait le solde à un montant négatif.");
            }

            if ($delta > 0) {
                DB::table('clients')->where('id', $client->id)->increment('loyalty_points_balance', $delta);
            } else {
                DB::table('clients')->where('id', $client->id)->decrement('loyalty_points_balance', abs($delta));
            }

            $card = $client->activeCard;

            $payload = [
                'client_id'       => $client->id,
                'loyalty_card_id' => $card?->id,
                'type'            => LoyaltyTransactionType::Adjustment->value,
                'points'          => $delta,
                'description'     => $description,
            ];

            if ($this->hasLoyaltyTransactionColumn('balance_after')) {
                $payload['balance_after'] = $newBalance;
            }
            if ($this->hasLoyaltyTransactionColumn('processed_by')) {
                $payload['processed_by'] = $by?->id ?? auth()->id();
            }

            return LoyaltyPointTransaction::create($payload);
        });
    }

    // ── Scanner detection ─────────────────────────────────────────────────────

    public function isLoyaltyBarcode(string $barcode): bool
    {
        $barcode = trim($barcode);

        // Card number: SOBITAS-000001 style (prefix of 2–12 uppercase letters, hyphen, 4–10 digits)
        if (preg_match('/^[A-Z]{2,12}-\d{4,10}$/', $barcode)) {
            return true;
        }

        // UUID qr_token
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $barcode)) {
            return true;
        }

        return false;
    }

    public function findCardByToken(string $token): ?LoyaltyCard
    {
        return LoyaltyCard::with('client')
            ->where('qr_token', trim($token))
            ->orWhere('card_number', trim($token))
            ->first();
    }

    public function findCardByScanCode(string $code): ?LoyaltyCard
    {
        $normalized = trim($code);
        if ($normalized === '') {
            return null;
        }

        $query = LoyaltyCard::query()
            ->with(['client:id,name,phone_1', 'batch:id,name'])
            ->where('card_number', $normalized)
            ->orWhere('qr_token', $normalized);

        if ($this->hasBarcodeValueColumn()) {
            $query->orWhere('barcode_value', $normalized);
        }

        return $query->first();
    }

    public function assignCardToClient(LoyaltyCard $card, Client $client, bool $allowReplacement = false): LoyaltyCard
    {
        $card->loadMissing('client');
        $client = $client->fresh();

        if ($card->client_id && $card->client_id !== $client->id) {
            $owner = $card->client?->name ?: "Client #{$card->client_id}";
            throw new \RuntimeException("Cette carte est déjà attribuée à {$owner}.");
        }

        // Idempotent: scanning an already active card linked to this same client
        // should not fail the POS flow.
        if ($card->client_id === $client->id && $card->status === LoyaltyCardStatus::Active) {
            return $card->refresh();
        }

        // Legacy data recovery: some cards may already be "active" but not linked
        // to any client yet. Allow linking them to the selected client.
        if ($card->client_id === null && $card->status === LoyaltyCardStatus::Active) {
            return DB::transaction(function () use ($card, $client) {
                $data = [
                    'client_id' => $client->id,
                    'status' => LoyaltyCardStatus::Active->value,
                ];

                if ($this->hasAssignedAtColumn()) {
                    $data['assigned_at'] = now();
                }

                if ($this->hasGivenToClientAtColumn()) {
                    $data['given_to_client_at'] = now();
                }

                $card->update($data);

                return $card->refresh();
            });
        }

        if (! $card->isAssignable()) {
            throw new \RuntimeException("Cette carte ne peut pas être attribuée car son statut est : {$card->status->label()}.");
        }

        $existingActive = $client->activeCard()->first();
        if ($existingActive && $existingActive->id !== $card->id && ! $allowReplacement) {
            throw new \RuntimeException("Ce client possède déjà une carte active : {$existingActive->card_number}.");
        }

        return DB::transaction(function () use ($card, $client, $existingActive) {
            if ($existingActive && $existingActive->id !== $card->id) {
                $existingActive->update([
                    'status' => LoyaltyCardStatus::Retired->value,
                    'retired_at' => now(),
                ]);
            }

            $cardData = [
                'client_id' => $client->id,
                'status' => LoyaltyCardStatus::Active->value,
            ];

            if ($this->hasAssignedAtColumn()) {
                $cardData['assigned_at'] = now();
            }

            if ($this->hasGivenToClientAtColumn()) {
                $cardData['given_to_client_at'] = now();
            }

            if ($existingActive && $existingActive->id !== $card->id) {
                $cardData['replacement_for_card_id'] = $existingActive->id;
            }

            $card->update($cardData);

            return $card->refresh();
        });
    }

    // ── Balance rebuild ───────────────────────────────────────────────────────

    public function rebuildClientBalance(Client $client): int
    {
        $balance = (int) LoyaltyPointTransaction::where('client_id', $client->id)->sum('points');
        $balance = max(0, $balance);

        DB::table('clients')->where('id', $client->id)->update([
            'loyalty_points_balance' => $balance,
        ]);

        return $balance;
    }

    // ── CSV export generator ──────────────────────────────────────────────────

    public function batchToCsvRows(LoyaltyCardBatch $batch): \Generator
    {
        foreach ($batch->cards()->with('client')->orderBy('card_number')->cursor() as $card) {
            yield [
                $card->card_number,
                $card->qr_token,
                $card->status->value,
                $card->client?->name ?? '',
                $card->client?->phone_1 ?? '',
                $card->assigned_at?->format('d/m/Y') ?? '',
                $card->printed_at?->format('d/m/Y') ?? '',
            ];
        }
    }
}
