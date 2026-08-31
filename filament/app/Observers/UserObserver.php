<?php

namespace App\Observers;

use App\Mail\NewCustomerRegisteredAdminMail;
use App\Models\User;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UserObserver
{
    /**
     * Notify all other panel users when a new user is created.
     */
    public function created(User $newUser): void
    {
        if ((int) $newUser->role_id !== 2) {
            return;
        }

        $adminRoleIds = config('partners.admin_role_ids', [1, 3]);
        $recipients = User::whereIn('role_id', $adminRoleIds)->get();

        $title = 'Nouvel utilisateur';
        $body = $newUser->name . ' (' . $newUser->email . ')';

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->warning()
                ->sendToDatabase($user);
        }

        $adminEmails = collect(config('mail.admin_emails', []))
            ->filter(fn (mixed $email): bool => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false)
            ->unique()
            ->values()
            ->all();

        if ($adminEmails === []) {
            Log::warning('New customer admin email skipped: ADMIN_EMAILS is empty', [
                'user_id' => $newUser->id,
            ]);

            return;
        }

        try {
            Mail::to($adminEmails)->send(new NewCustomerRegisteredAdminMail($newUser));
        } catch (\Throwable $e) {
            // Account creation must never be rolled back because the mail provider is unavailable.
            Log::error('New customer admin email failed', [
                'user_id' => $newUser->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
