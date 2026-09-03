<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\Seo\SeoNotifier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reconnect reviews and delivered purchases after an account proves its email address.
 *
 * Email verification proves ownership of an address, not a purchase. A review receives purchase
 * evidence only when a delivered order owned by that verified address contains the reviewed
 * product. That distinction keeps the storefront's "Achat vérifié" label truthful.
 */
class VerifiedCustomerReviewService
{
    /** @return array{orders:int,reviews:int,verified_reviews:int} */
    public function reconcile(User $user): array
    {
        if (! $user->hasVerifiedEmail()) {
            return ['orders' => 0, 'reviews' => 0, 'verified_reviews' => 0];
        }

        $email = strtolower(trim((string) $user->email));
        if ($email === '') {
            return ['orders' => 0, 'reviews' => 0, 'verified_reviews' => 0];
        }

        $orders = Commande::query()
            ->visibleToStorefrontUser($user)
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->with('details:id,commande_id,produit_id')
            ->latest('id')
            ->get(['id']);

        $orderIds = $orders->pluck('id')->map(fn ($id) => (int) $id)->values();
        $orderByProduct = $this->latestOrderByProduct($orders);
        $reviews = $this->ownedReviews($user, $email, $orderIds)->get();
        $verifiedCount = 0;
        $hasOrderColumn = Schema::hasColumn('reviews', 'commande_id');
        $changedProducts = [];

        DB::transaction(function () use ($reviews, $user, $orderByProduct, $hasOrderColumn, &$verifiedCount, &$changedProducts): void {
            foreach ($reviews as $review) {
                $dirty = false;

                if ((int) ($review->user_id ?? 0) !== (int) $user->getKey()) {
                    $review->user_id = $user->getKey();
                    $dirty = true;
                }

                if ($hasOrderColumn && empty($review->commande_id)) {
                    $orderId = $orderByProduct[(int) $review->product_id] ?? null;
                    if ($orderId !== null) {
                        $review->commande_id = $orderId;
                        $dirty = true;
                    }
                }

                if ($dirty) {
                    $review->saveQuietly();
                    if ((int) $review->publier === 1) {
                        $changedProducts[(int) $review->product_id] = true;
                    }
                }

                if ((int) ($review->verified ?? 0) === 1 || ! empty($review->commande_id)) {
                    $verifiedCount++;
                }
            }
        });

        // Refresh public review attribution and purchase badges without re-running moderation
        // or awarding points. SeoNotifier defers its network work until after the response.
        if ($changedProducts !== []) {
            foreach (Product::whereIn('id', array_keys($changedProducts))->get() as $product) {
                app(SeoNotifier::class)->productChanged($product);
            }
        }

        return [
            'orders' => $orders->count(),
            'reviews' => $reviews->count(),
            'verified_reviews' => $verifiedCount,
        ];
    }

    /** @param Collection<int,Commande> $orders @return array<int,int> */
    private function latestOrderByProduct(Collection $orders): array
    {
        $map = [];
        foreach ($orders as $order) {
            foreach ($order->details as $detail) {
                $productId = (int) $detail->produit_id;
                if ($productId > 0 && ! isset($map[$productId])) {
                    $map[$productId] = (int) $order->id;
                }
            }
        }

        return $map;
    }

    /** @param Collection<int,int> $orderIds */
    private function ownedReviews(User $user, string $email, Collection $orderIds)
    {
        return Review::query()->where(function ($query) use ($user, $email, $orderIds): void {
            $query->where('user_id', $user->getKey());

            if (Schema::hasColumn('reviews', 'author_email')) {
                $query->orWhere(function ($guest) use ($email): void {
                    $guest->whereNull('user_id')->whereRaw('LOWER(TRIM(author_email)) = ?', [$email]);
                });
            }

            if (Schema::hasColumn('reviews', 'commande_id') && $orderIds->isNotEmpty()) {
                $query->orWhere(function ($guest) use ($orderIds): void {
                    $guest->whereNull('user_id')->whereIn('commande_id', $orderIds->all());
                });
            }
        });
    }
}
