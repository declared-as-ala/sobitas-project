<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReviewSubmissionService
{
    /** @return array<string,mixed> */
    public function access(User $user, ?int $productId = null): array
    {
        $limit = max(1, (int) config('reviews.member.max_per_month', 3));
        $used = Review::query()
            ->where('user_id', $user->getKey())
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();
        $existing = $productId
            ? Review::query()->where('user_id', $user->getKey())->where('product_id', $productId)->exists()
            : false;
        $orderId = $productId ? $this->deliveredOrderId($user, $productId) : null;
        $phoneVerified = $user->phone_verified_at !== null;

        return [
            'phone_verified' => $phoneVerified,
            'monthly_limit' => $limit,
            'used_this_month' => $used,
            'remaining_this_month' => max(0, $limit - $used),
            'already_reviewed' => $existing,
            'verified_purchase' => $orderId !== null,
            'reward_points' => $orderId !== null
                ? (int) config('reviews.points.verified_purchase_award', 50)
                : (int) config('reviews.points.award', 10),
            'can_review' => $phoneVerified && $used < $limit && ! $existing,
            'resets_at' => now()->endOfMonth()->toIso8601String(),
        ];
    }

    /**
     * The user row lock serializes simultaneous submissions from the same account, so two tabs
     * cannot both observe "one place left" and create a fourth review.
     *
     * @param array<string,mixed> $attributes
     * @param callable(Review):void|null $afterCreate
     * @return array{review:Review,access:array<string,mixed>}
     */
    public function create(User $user, int $productId, array $attributes, ?callable $afterCreate = null): array
    {
        return DB::transaction(function () use ($user, $productId, $attributes, $afterCreate): array {
            /** @var User $locked */
            $locked = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $access = $this->access($locked, $productId);

            if (! $access['phone_verified']) {
                throw new \DomainException('PHONE_VERIFICATION_REQUIRED');
            }
            if ($access['already_reviewed']) {
                throw new \DomainException('ALREADY_REVIEWED');
            }
            if ($access['remaining_this_month'] <= 0) {
                throw new \DomainException('MONTHLY_LIMIT_REACHED');
            }

            $review = Review::create([
                ...$attributes,
                'user_id' => $locked->getKey(),
                'product_id' => $productId,
                'commande_id' => $this->deliveredOrderId($locked, $productId),
            ]);

            if ($afterCreate !== null) {
                $afterCreate($review);
            }

            return ['review' => $review, 'access' => $this->access($locked, $productId)];
        });
    }

    public function deliveredOrderId(User $user, int $productId): ?int
    {
        try {
            return Commande::query()
                ->visibleToStorefrontUser($user)
                ->whereIn('etat', PointsService::DELIVERED_STATUSES)
                ->whereHas('details', fn ($details) => $details->where('produit_id', $productId))
                ->latest('id')
                ->value('id');
        } catch (\Throwable) {
            return null;
        }
    }
}
