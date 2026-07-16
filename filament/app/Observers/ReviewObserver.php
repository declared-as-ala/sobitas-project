<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
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
                ->sendToDatabase($user);
        }
    }

    /**
     * When a review is approved/published (publier -> 1), the product's aggregateRating (stars)
     * changes — refresh that product's page so the new stars appear on the live PDP within seconds.
     */
    public function saved(Review $review): void
    {
        if (! $review->wasChanged('publier') || (int) $review->publier !== 1) {
            return;
        }
        $product = $review->product ?? Product::find($review->product_id);
        if ($product) {
            app(\App\Services\Seo\SeoNotifier::class)->productChanged($product);
        }
    }
}
