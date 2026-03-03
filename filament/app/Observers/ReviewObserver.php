<?php

namespace App\Observers;

use App\Filament\Resources\ReviewResource;
use App\Models\Review;
use App\Models\User;
use Filament\Notifications\Actions\Action as NotificationAction;
use Filament\Notifications\Notification;

class ReviewObserver
{
    /**
     * Notify all panel users when a new avis (review) is created.
     */
    public function created(Review $review): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $url = ReviewResource::getUrl('edit', ['record' => $review]);
        $title = 'Nouvel avis';
        $body = 'Avis #' . $review->id;
        if ($review->relationLoaded('product') && $review->product) {
            $body .= ' – ' . $review->product->designation_fr;
        } elseif ($review->product_id) {
            $body .= ' (produit #' . $review->product_id . ')';
        }
        $body .= ' – ' . (\Illuminate\Support\Str::limit($review->comment ?? '', 50));

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->info()
                ->actions([
                    NotificationAction::make('open')
                        ->label('Ouvrir')
                        ->url($url),
                ])
                ->sendToDatabase($user);
        }
    }
}
