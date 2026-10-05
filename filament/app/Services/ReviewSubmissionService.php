<?php

namespace App\Services;

use App\Models\Commande;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\QueryException;
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
            'reward_eligible' => $phoneVerified,
            'monthly_limit' => $limit,
            'used_this_month' => $used,
            'remaining_this_month' => max(0, $limit - $used),
            'already_reviewed' => $existing,
            'verified_purchase' => $orderId !== null,
            'reward_points' => ! $phoneVerified ? 0 : ($orderId !== null
                ? (int) config('reviews.points.verified_purchase_award', 50)
                : (int) config('reviews.points.award', 10)),
            'can_review' => $used < $limit && ! $existing,
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

            if ($access['already_reviewed']) {
                throw new \DomainException('ALREADY_REVIEWED');
            }
            if ($access['remaining_this_month'] <= 0) {
                throw new \DomainException('MONTHLY_LIMIT_REACHED');
            }

            try {
                $review = Review::create([
                    ...$attributes,
                    'user_id' => $locked->getKey(),
                    'product_id' => $productId,
                    'commande_id' => $this->deliveredOrderId($locked, $productId),
                ]);
            } catch (QueryException $e) {
                // reviews(commande_id, product_id) is unique: an /avis submission for the same order
                // took that order's rating slot between deliveredOrderId() and this insert.
                if (self::isUniqueViolation($e)) {
                    throw new \DomainException('ALREADY_REVIEWED');
                }
                throw $e;
            }

            if ($afterCreate !== null) {
                $afterCreate($review);
            }

            return ['review' => $review, 'access' => $this->access($locked, $productId)];
        });
    }

    /**
     * The delivered order that attests this account's rating of `$productId` — one whose rating
     * slot for that product is still free. One order attests ONE rating per product (unique index
     * reviews(commande_id, product_id)): an order already rated through its /avis link cannot back
     * a second, account-side rating, which then counts as unverified.
     */
    public function deliveredOrderId(User $user, int $productId): ?int
    {
        try {
            return Commande::query()
                ->visibleToStorefrontUser($user)
                ->whereIn('etat', PointsService::DELIVERED_STATUSES)
                ->whereHas('details', fn ($details) => $details->where('produit_id', $productId))
                ->whereNotIn('commandes.id', Review::query()
                    ->select('commande_id')
                    ->where('product_id', $productId)
                    ->whereNotNull('commande_id'))
                ->latest('id')
                ->value('id');
        } catch (\Throwable) {
            return null;
        }
    }

    /** A duplicate-key error (MySQL 1062, PostgreSQL 23505, SQLite "UNIQUE constraint failed"), not any 23000. */
    public static function isUniqueViolation(QueryException $e): bool
    {
        return (int) ($e->errorInfo[1] ?? 0) === 1062
            || (string) $e->getCode() === '23505'
            || str_contains($e->getMessage(), 'UNIQUE constraint failed');
    }
}
