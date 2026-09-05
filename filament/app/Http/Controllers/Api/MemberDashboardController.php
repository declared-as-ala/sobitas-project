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
                    'description' => 'Les points sont calculés sur les produits et crédités après livraison.',
                    'reward_points' => null,
                    'completed' => (clone $orders)->whereIn('etat', PointsService::DELIVERED_STATUSES)->exists(),
                    'href' => '/shop',
                ],
                [
                    'key' => 'monthly_review',
                    'label' => 'Partager un avis ce mois-ci',
                    'description' => '10 points, ou 50 points pour un achat livré et vérifié.',
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
            ],
            'community' => $this->community(),
        ]);
    }

    /** Real, aggregate-only programme activity plus recent purchase-attested reviews. */
    private function community(): array
    {
        return Cache::remember('member-dashboard:community:v1', now()->addMinutes(5), function (): array {
            $reviews = Review::query()
                ->attested()
                ->with(['user:id,name', 'product:id,slug,designation_fr,cover'])
                ->latest()
                ->limit(6)
                ->get();

            return [
                'members_rewarded' => UserPointTransaction::query()->where('points', '>', 0)->distinct('user_id')->count('user_id'),
                'points_awarded' => (int) UserPointTransaction::query()->where('points', '>', 0)->sum('points'),
                'published_reviews' => Review::query()->attested()->count(),
                'reviews' => $reviews->map(fn (Review $review) => [
                    'id' => (int) $review->id,
                    'stars' => (int) ($review->stars ?? $review->note ?? 0),
                    'comment' => (string) $review->comment,
                    'name' => $review->display_name,
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
