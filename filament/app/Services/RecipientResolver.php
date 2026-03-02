<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Resolves campaign recipients from selected client IDs, user IDs, contact IDs, and manual email input.
 * Merges, validates, and deduplicates by email.
 */
class RecipientResolver
{
    /**
     * @return Collection<int, array{email: string, name: string|null, client_id: int|null, user_id: int|null, contact_id: int|null, source: string, row_id: string}>
     */
    public static function resolve(
        array $selectedClientIds = [],
        array $selectedUserIds = [],
        string $manualEmails = '',
        array $selectedContactIds = []
    ): Collection {
        $byEmail = [];

        if (!empty($selectedClientIds)) {
            $clients = Client::whereIn('id', $selectedClientIds)
                ->whereNotNull('email')
                ->where('email', '!=', '')
                ->whereNull('email_unsubscribed_at')
                ->select('id', 'name', 'email')
                ->get();
            foreach ($clients as $c) {
                $email = strtolower(trim($c->email));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $byEmail[$email] = [
                        'email' => $c->email,
                        'name' => $c->name,
                        'client_id' => $c->id,
                        'user_id' => null,
                        'contact_id' => null,
                        'source' => 'client',
                        'row_id' => 'client_' . $c->id,
                    ];
                }
            }
        }

        if (!empty($selectedUserIds)) {
            $users = User::whereIn('id', $selectedUserIds)
                ->whereNotNull('email')
                ->where('email', '!=', '')
                ->select('id', 'name', 'email')
                ->get();
            foreach ($users as $u) {
                $email = strtolower(trim($u->email));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $byEmail[$email] = [
                        'email' => $u->email,
                        'name' => $u->name,
                        'client_id' => null,
                        'user_id' => $u->id,
                        'contact_id' => null,
                        'source' => 'user',
                        'row_id' => 'user_' . $u->id,
                    ];
                }
            }
        }

        if (!empty($selectedContactIds)) {
            $contacts = Contact::whereIn('id', $selectedContactIds)
                ->whereNotNull('email')
                ->where('email', '!=', '')
                ->select('id', 'name', 'email')
                ->get();
            foreach ($contacts as $c) {
                $email = strtolower(trim($c->email));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $byEmail[$email] = [
                        'email' => $c->email,
                        'name' => $c->name,
                        'client_id' => null,
                        'user_id' => null,
                        'contact_id' => $c->id,
                        'source' => 'contact',
                        'row_id' => 'contact_' . $c->id,
                    ];
                }
            }
        }

        $manual = self::parseManualEmails($manualEmails);
        foreach ($manual['valid'] as $email) {
            $key = strtolower($email);
            if (!isset($byEmail[$key])) {
                $byEmail[$key] = [
                    'email' => $email,
                    'name' => null,
                    'client_id' => null,
                    'user_id' => null,
                    'contact_id' => null,
                    'source' => 'manual',
                    'row_id' => 'manual_' . md5($key),
                ];
            }
        }

        return collect(array_values($byEmail));
    }

    /**
     * Parse manual email input (one per line or comma-separated). Returns ['valid' => [...], 'invalid' => [...]].
     *
     * @return array{valid: array<int, string>, invalid: array<int, string>}
     */
    public static function parseManualEmails(string $input): array
    {
        $valid = [];
        $invalid = [];
        $raw = preg_split('/[\s,;]+/', $input, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($raw as $s) {
            $s = trim($s);
            if ($s === '') {
                continue;
            }
            if (filter_var($s, FILTER_VALIDATE_EMAIL)) {
                $valid[] = $s;
            } else {
                $invalid[] = $s;
            }
        }
        $valid = array_values(array_unique($valid));
        $invalid = array_values(array_unique($invalid));
        return ['valid' => $valid, 'invalid' => $invalid];
    }

    /**
     * Format for campaign recipients array (email + client_id for unsubscribe).
     */
    public static function toCampaignRecipients(Collection $recipients): array
    {
        return $recipients->map(fn ($r) => [
            'email' => $r['email'],
            'client_id' => $r['client_id'],
        ])->values()->all();
    }
}
