<?php

namespace App\Observers;

use App\Models\User;
use Filament\Notifications\Notification;

class UserObserver
{
    /**
     * Notify all other panel users when a new user is created.
     */
    public function created(User $newUser): void
    {
        $recipients = User::where('id', '!=', $newUser->id)->get();
        if ($recipients->isEmpty()) {
            return;
        }

        $title = 'Nouvel utilisateur';
        $body = $newUser->name . ' (' . $newUser->email . ')';

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->warning()
                ->sendToDatabase($user);
        }
    }
}
