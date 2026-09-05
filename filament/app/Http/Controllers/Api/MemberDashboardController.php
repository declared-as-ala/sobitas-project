<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commande;
use App\Models\Review;
use App\Models\UserPointTransaction;
use App\Services\PhoneVerificationService;
use App\Services\PointsService;
use App\Services\ReviewSubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class MemberDashboardController extends Controller
{
    public function __invoke(Request $request, ReviewSubmissionService $reviews): JsonResponse
    {
        $user = $request->user();
        $orders = Commande::query()->visibleToStorefrontUser($user);
        $reviewAccess = $reviews->access($user);
        $monthlyReviews = (int) $reviewAccess['used_this_month'];

        $ownReviewImages = Schema::hasTable('review_images')
            ? Review::query()->where('user_id', $user->getKey())->whereHas('images')->exists()
            : false;
        $hasVerifiedReview = Review::query()->where('user_id', $user->getKey())
            ->where(function ($query): void {
                if (Schema::hasColumn('reviews', 'verified')) {
                    $query->where('verified', 1)->orWhereNotNull('commande_id');
                } else {
                    $query->whereNotNull('commande_id');
                }
            })
            ->exists();
        $hasRedeemed = UserPointTransaction::query()->where('user_id', $user->getKey())->where('type', 'redeem')->exists();
        $profileComplete = trim((string) $user->name) !== '' && trim((string) $user->phone) !== '' && trim((string) $user->email) !== '';

        return response()->json([
            'summary' => [
                'orders' => (clone $orders)->count(),
                'delivered_orders' => (clone $orders)->whereIn('etat', PointsService::DELIVERED_STATUSES)->count(),
                'reviews' => Review::query()->where('user_id', $user->getKey())->count(),
                'points_earned' => (int) UserPointTransaction::query()
                    ->where('user_id', $user->getKey())
                    ->where('points', '>', 0)
                    ->sum('points'),
            ],
            'review_access' => $reviewAccess,
            'missions' => [
                [
                    'key' => 'verify_phone',
                    'label' => 'Vérifier mon téléphone',
                    'description' => 'Sécurisez votre compte et débloquez les avantages membre.',
                    'reward_points' => PhoneVerificationService::BONUS_POINTS,
                    'completed' => $user->phone_verified_at !== null,
                    'href' => '/verify-phone',
                ],
                [
                    'key' => 'first_order',
                    'label' => 'Recevoir ma première commande',
                    'description' => 'Les Protinas sont calculées sur les produits et créditées après livraison.',
                    'reward_points' => null,
                    'completed' => (clone $orders)->whereIn('etat', PointsService::DELIVERED_STATUSES)->exists(),
                    'href' => '/shop',
                ],
                [
                    'key' => 'monthly_review',
                    'label' => 'Partager un avis ce mois-ci',
                    'description' => '10 Protinas, ou 50 Protinas pour un achat livré et vérifié.',
                    'reward_points' => $monthlyReviews > 0 ? 0 : 10,
                    'completed' => $monthlyReviews > 0,
                    'href' => '/account?section=reviews',
                ],
                [
                    'key' => 'photo_review',
                    'label' => 'Illustrer mon expérience',
                    'description' => 'Ajoutez une vraie photo lorsque vous rédigez votre prochain avis.',
                    'reward_points' => null,
                    'completed' => $ownReviewImages,
                    'href' => '/account?section=reviews',
                ],
                [
                    'key' => 'verified_review',
                    'label' => 'Évaluer un achat livré',
                    'description' => 'Votre badge « Achat vérifié » aide les autres membres à choisir.',
                    'reward_points' => $hasVerifiedReview ? 0 : (int) config('reviews.points.verified_purchase_award', 50),
                    'completed' => $hasVerifiedReview,
                    'href' => '/account?section=commandes',
                ],
                [
                    'key' => 'complete_profile',
                    'label' => 'Compléter mon profil',
                    'description' => 'Des coordonnées exactes rendent vos prochaines commandes plus rapides.',
                    'reward_points' => null,
                    'completed' => $profileComplete,
                    'href' => '/account?section=profil',
                ],
                [
                    'key' => 'first_redemption',
                    'label' => 'Utiliser mes Protinas',
                    'description' => 'Choisissez votre réduction sécurisée lors du checkout.',
                    'reward_points' => null,
                    'completed' => $hasRedeemed,
                    'href' => '/shop',
                ],
            ],
            'community' => $this->community(),
        ]);
    }

    /** Real, aggregate-only programme activity plus recent published community reviews. */
    private function community(): array
    {
        return Cache::remember('member-dashboard:community:v2', now()->addMinutes(5), function (): array {
            $userColumns = array_values(array_filter(
                ['id', 'name', 'phone_verified_at'],
                fn (string $column) => Schema::hasColumn('users', $column)
            ));
            $reviews = Review::query()
                ->published()
                ->with([
                    'user' => fn ($query) => $query->select($userColumns),
                    'product:id,slug,designation_fr,cover',
                ])
                ->latest()
                ->limit(6)
                ->get();

            return [
                'members_rewarded' => UserPointTransaction::query()->where('points', '>', 0)->distinct('user_id')->count('user_id'),
                'points_awarded' => (int) UserPointTransaction::query()->where('points', '>', 0)->sum('points'),
                'published_reviews' => Review::query()->published()->count(),
                'reviews' => $reviews->map(fn (Review $review) => [
                    'id' => (int) $review->id,
                    'stars' => (int) ($review->stars ?? $review->note ?? 0),
                    'comment' => (string) $review->comment,
                    'name' => $review->display_name,
                    'author_status' => $review->commande_id !== null || (bool) ($review->verified ?? false)
                        ? 'verified_purchase'
                        : ($review->user_id !== null
                            ? ($review->user?->phone_verified_at !== null ? 'verified_member' : 'member')
                            : 'anonymous'),
                    'created_at' => optional($review->created_at)->toIso8601String(),
                    'product' => $review->product ? [
                        'slug' => $review->product->slug,
                        'designation' => $review->product->designation_fr,
                        'cover' => $review->product->cover,
                    ] : null,
                ])->values(),
            ];
        });
    }
}
