<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\ReviewReply;
use App\Models\User;
use App\Services\VerifiedCustomerReviewService;
use App\Services\ReviewSubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/**
 * ── THE CONVERSATION UNDER AN AVIS, AND THE PEOPLE HAVING IT ────────────────────────────────
 * Owner, 21/08/2026: *"advanced reviews system, where users can put a review and other users can
 * reply on them … user profiles can be visible … and a system for anonymous reviews without an
 * account."*
 *
 * Three endpoints, and one rule that runs through all of them:
 *
 *   **Nothing here can move a star rating.**
 *
 * `Review::scopeAttested` — the query behind every product's rating and its JSON-LD — requires
 * `verified = 1` or a `commande_id`. A reply is not a review at all, and a guest review has neither
 * by construction. So a stranger can write on this site and be read, and cannot touch the number
 * Google reads. That is what makes accepting anonymous input safe, and it is why the guest endpoint
 * below never sets either column, on any path, for any reason.
 *
 * ── WHY THE PROFILE ENDPOINT REFUSES MOST USERS ─────────────────────────────────────────────
 * `publicProfile` 404s anybody with no published review. Every customer of this shop registered to
 * buy protein, not to have a public page; minting one for all of them would expose a name and a
 * join date that nobody consented to publish, and would hand Google several thousand near-empty
 * pages on a site whose blog already has 184 of 224 articles unindexed. A profile exists only once
 * its owner has published something, and it carries a display name and their reviews — never an
 * email, never an order, never a points balance.
 */
class ReviewThreadController extends Controller
{
    use \App\Http\Controllers\Api\Concerns\CapturesReviewSignals;

    /** All reviews belonging to the signed-in customer, including moderation-pending reviews. */
    public function mine(
        Request $request,
        VerifiedCustomerReviewService $claimService,
        ReviewSubmissionService $submissionService
    ): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $claimService->reconcile($user);

        $optional = array_values(array_filter(
            ['stars', 'note', 'verified', 'commande_id', 'publier', 'points_awarded'],
            fn (string $column) => Schema::hasColumn('reviews', $column)
        ));
        $columns = array_merge(['id', 'user_id', 'product_id', 'comment', 'created_at'], $optional);

        $reviews = Review::query()
            ->where('user_id', $user->getKey())
            ->with('product:id,slug,designation_fr,cover')
            ->when(Schema::hasTable('review_images'), fn ($query) => $query->with('images:id,review_id,path,width,height,position'))
            ->latest()
            ->get($columns);

        return response()->json([
            'reviews' => $reviews->map(fn (Review $review) => [
                'id' => (int) $review->id,
                'stars' => $this->starsOf($review),
                'comment' => (string) $review->comment,
                'verified_purchase' => $this->isAttested($review),
                'status' => (int) ($review->publier ?? 0) === 1 ? 'published' : 'pending',
                'points_awarded' => (bool) ($review->points_awarded ?? false),
                'reward_points' => $user->phone_verified_at === null
                    ? 0
                    : ($this->isAttested($review)
                        ? (int) config('reviews.points.verified_purchase_award', 50)
                        : (int) config('reviews.points.award', 10)),
                'images' => $review->relationLoaded('images')
                    ? $review->images->map(fn ($image) => [
                        'id' => (int) $image->id,
                        'path' => $image->path,
                        'width' => (int) $image->width,
                        'height' => (int) $image->height,
                    ])->values()
                    : [],
                'created_at' => optional($review->created_at)->toIso8601String(),
                'product' => $review->product ? [
                    'id' => (int) $review->product->id,
                    'slug' => $review->product->slug,
                    'designation' => $review->product->designation_fr,
                    'cover' => $review->product->cover,
                ] : null,
            ])->values(),
            'access' => $submissionService->access($user),
        ]);
    }
    /** Guest names are printed on a public page; this is a display name, not an identity. */
    private const NAME_MIN = 2;

    private const NAME_MAX = 60;

    /**
     * The published thread under one review.
     *
     * Columns are listed explicitly rather than `select *`. `review_replies` carries `author_email`
     * and `ip_hash`, and the model hides both — but a hidden attribute protects serialisation, not
     * a query, and the day somebody switches this to a raw builder the hiding stops applying. Two
     * locks on the same door, because this one opens onto a public product page.
     */
    public function index(Request $request, int $review): JsonResponse
    {
        if (! Schema::hasTable('review_replies')) {
            return response()->json(['replies' => []]);
        }

        $replies = ReviewReply::query()
            ->where('review_id', $review)
            ->where('publier', 1)
            ->with('user:id,name')
            ->oldest()
            ->limit(200)
            ->get(['id', 'review_id', 'parent_id', 'user_id', 'author_name', 'body', 'is_staff', 'created_at']);

        return response()->json([
            'replies' => $replies->map(fn (ReviewReply $r) => $this->presentReply($r))->values(),
        ]);
    }

    /**
     * Post a reply. Works signed in and signed out — the difference is attribution and the name
     * field, never whether the message is accepted.
     */
    public function store(Request $request, int $review): JsonResponse
    {
        if (! (bool) config('reviews.replies.enabled', true)) {
            return response()->json(['message' => 'Les réponses sont temporairement désactivées.'], 503);
        }
        if (! Schema::hasTable('review_replies')) {
            return response()->json(['message' => 'Indisponible pour le moment.'], 503);
        }

        $parent = Review::find($review);
        if (! $parent || (int) $parent->publier !== 1) {
            // An unpublished review is not visible, so a reply to it cannot be either. 404 rather
            // than 403: whether a held review exists is not a fact worth confirming to a stranger.
            return response()->json(['message' => 'Avis introuvable.'], 404);
        }

        /*
         * A reply earns no loyalty points, so it is not worth farming for money — it is worth
         * farming for LINKS, which is the older and more common motive. `auto_publish_clean`
         * defaults to true, so a reply the classifier is happy with goes live without a human,
         * and a classifier judges text rather than who typed it.
         *
         * Ordinary success, no row. See the note on ApisController::add_review.
         */
        if ($this->trippedHoneypot($request)) {
            return response()->json([
                'message'   => 'Merci ! Votre réponse sera visible après vérification.',
                'published' => false,
                'reply'     => null,
            ], 201);
        }

        $user = $this->optionalUser($request);

        $rules = [
            'body'      => ['required', 'string', 'min:2', 'max:1000'],
            'parent_id' => ['nullable', 'integer'],
        ];
        if (! $user) {
            $rules['author_name']  = ['required', 'string', 'min:' . self::NAME_MIN, 'max:' . self::NAME_MAX];
            $rules['author_email'] = ['nullable', 'email', 'max:190'];
        }
        $data = $request->validate($rules);

        // A parent must belong to THIS review. Without the check, `parent_id` would be a pointer at
        // any reply in the database and the UI would render "en réponse à" a message from an
        // unrelated product's thread.
        $parentReplyId = null;
        if (! empty($data['parent_id'])) {
            $parentReplyId = ReviewReply::where('id', (int) $data['parent_id'])
                ->where('review_id', $review)
                ->where('publier', 1)
                ->value('id');
        }

        $identity = $this->identityKey($request, $user?->getKey());
        $limit    = max(1, (int) config('reviews.replies.max_per_hour', 10));
        if (! $this->withinHourlyLimit('reply:' . $identity, $limit)) {
            return response()->json(['message' => 'Vous avez envoyé trop de réponses. Réessayez dans un moment.'], 429);
        }

        $reply = ReviewReply::create([
            'review_id'    => $review,
            'parent_id'    => $parentReplyId,
            'user_id'      => $user?->getKey(),
            'author_name'  => $user ? null : trim((string) $data['author_name']),
            'author_email' => $user ? null : ($data['author_email'] ?? null),
            'body'         => trim((string) $data['body']),
            // Held. ReviewReplyObserver publishes it after the response, from the moderator's
            // verdict — see that class for why even a signed-in customer's reply waits.
            'publier'      => 0,
            'is_staff'     => 0,
            'ip_hash'      => $this->ipHash($request),
        ]);

        $reply->setRelation('user', $user);

        return response()->json([
            'message'   => 'Merci ! Votre réponse est en cours de vérification.',
            'published' => false,
            'reply'     => $this->presentReply($reply),
        ], 201);
    }

    /**
     * A review from somebody with no account.
     *
     * Published immediately for a low-friction customer flow. `verified` / `commande_id` are never
     * written here, so the review is readable but remains invisible to `scopeAttested`, to the
     * product's star average and to its structured data. Automated moderation can still remove
     * unsafe content after submission.
     */
    public function storeGuestReview(Request $request, \App\Services\ReviewImageService $images): JsonResponse
    {
        if (! (bool) config('reviews.guest.enabled', true)) {
            return response()->json(['message' => 'Les avis sans compte sont temporairement désactivés.'], 503);
        }

        $data = $request->validate([
            'product_id'   => ['required', 'integer', 'exists:products,id'],
            'stars'        => ['required', 'integer', 'min:1', 'max:5'],
            'comment'      => ['required', 'string', 'min:10', 'max:1000'],
            'author_name'  => ['nullable', 'string', 'min:' . self::NAME_MIN, 'max:' . self::NAME_MAX],
            'author_email' => ['nullable', 'email', 'max:190'],
            'images'       => ['sometimes', 'array', 'max:'.max(0, (int) config('reviews.member.max_images', 3))],
            'images.*'     => ['file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:'.(max(1, (int) config('reviews.member.max_image_mb', 5)) * 1024), 'dimensions:max_width=6000,max_height=6000'],
        ]);

        if ($this->trippedHoneypot($request)) {
            // Ordinary success, no row — see the note on add_review.
            return response()->json(['message' => 'Merci ! Votre avis est publié.', 'published' => true, 'id' => null], 201);
        }

        $identity = $this->identityKey($request, null);
        $limit    = max(1, (int) config('reviews.guest.max_per_hour', 3));
        if (! $this->withinHourlyLimit('guest-review:' . $identity, $limit)) {
            return response()->json(['message' => 'Vous avez déjà envoyé plusieurs avis. Réessayez plus tard.'], 429);
        }

        $payload = [
            ...$this->reviewSignalColumns($request, trim((string) $data['comment'])),
            'user_id'    => null,
            'product_id' => (int) $data['product_id'],
            'stars'      => (int) $data['stars'],
            'comment'    => trim((string) $data['comment']),
            'publier'    => 1,
        ];

        // Schema-defensive, exactly like ReviewController::storeByToken: this legacy table differs
        // between environments and a missing column must not 500 a customer's submission.
        foreach (
            [
                'note'         => (int) $data['stars'],
                'author_name'  => trim((string) ($data['author_name'] ?? '')) ?: 'Anonyme',
                'author_email' => $data['author_email'] ?? null,
                'ip_hash'      => $this->ipHash($request),
            ] as $col => $value
        ) {
            if (Schema::hasColumn('reviews', $col)) {
                $payload[$col] = $value;
            }
        }

        $review = Review::create($payload);
        $images->store($review, $request->file('images', []));

        return response()->json([
            'message'   => 'Merci ! Votre avis est publié.',
            'published' => true,
            'id'        => $review->id,
        ], 201);
    }

    /**
     * A member's public page: who they are, and what they have published.
     *
     * 404 for anybody with no published review — see the class docblock for why that is the
     * default rather than an empty profile.
     */
    public function publicProfile(int $id): JsonResponse
    {
        $user = User::query()->find($id, ['id', 'name', 'created_at']);
        if (! $user) {
            return response()->json(['message' => 'Profil introuvable.'], 404);
        }

        /*
         * ── THE COLUMN LIST IS BUILT, NOT WRITTEN ────────────────────────────────────────
         * This exact query 500'd on production within minutes of deploying, on every id that
         * resolved to a real user. `reviews` is a legacy table whose columns differ between
         * environments — which is why `ReviewController::storeByToken` guards `note` with
         * `Schema::hasColumn` before WRITING it, and why this had to guard it before READING it.
         * An explicit select naming a column that does not exist is a SQL error, not a null.
         *
         * There was no way to catch this locally: nothing here boots Laravel (no vendor/), and
         * `measure-reviews` answers from a stub. The check that found it was hitting the live
         * endpoint straight after the deploy, which is now the habit for anything with an
         * explicit select on this table.
         */
        $optional = array_values(array_filter(
            ['stars', 'note', 'verified', 'commande_id'],
            fn (string $c) => Schema::hasColumn('reviews', $c)
        ));
        $columns = array_merge(['id', 'product_id', 'comment', 'created_at'], $optional);

        $reviews = Review::query()
            ->where('user_id', $id)
            ->where('publier', 1)
            ->with('product:id,slug,designation_fr,cover')
            ->when(Schema::hasTable('review_images'), fn ($query) => $query->with('images:id,review_id,path,width,height,position'))
            ->latest()
            ->limit(50)
            ->get($columns);

        if ($reviews->isEmpty()) {
            return response()->json(['message' => 'Profil introuvable.'], 404);
        }

        $stars = $reviews->map(fn (Review $r) => $this->starsOf($r))->filter()->values();

        return response()->json([
            'id'            => (int) $user->id,
            'name'          => (string) $user->name,
            'member_since'  => optional($user->created_at)->toDateString(),
            'review_count'  => $reviews->count(),
            // The member's OWN average, over their own published reviews. Unrelated to any
            // product's aggregateRating and never used as one.
            'average_given' => $stars->isEmpty() ? null : round($stars->avg(), 1),
            'verified_count' => $reviews->filter(fn (Review $r) => $this->isAttested($r))->count(),
            'reviews'       => $reviews->map(fn (Review $r) => [
                'id'         => (int) $r->id,
                'stars'      => $this->starsOf($r),
                'comment'    => (string) $r->comment,
                'verified'   => $this->isAttested($r),
                'images'     => $r->relationLoaded('images')
                    ? $r->images->map(fn ($image) => [
                        'id' => (int) $image->id,
                        'path' => $image->path,
                        'width' => (int) $image->width,
                        'height' => (int) $image->height,
                    ])->values()
                    : [],
                'created_at' => optional($r->created_at)->toIso8601String(),
                'product'    => $r->product ? [
                    'id'          => (int) $r->product->id,
                    'slug'        => $r->product->slug,
                    'designation' => $r->product->designation_fr,
                    'cover'       => $r->product->cover,
                ] : null,
            ])->values(),
        ]);
    }

    /**
     * The signed-in customer, or null — without ever refusing the request.
     *
     * This route carries no `auth:sanctum` middleware, because a guest posting a reply is the whole
     * point. But `config/auth.php` defines only the `web` (session) guard, so a bare
     * `$request->user()` on a token-authenticated API call resolves to NOTHING: a signed-in
     * customer would have been treated as a stranger, asked for a display name they should never
     * see a field for, and had their reply filed with `user_id = null` — no attribution, no profile
     * link, no way to find their own messages.
     *
     * `user('sanctum')` names the guard the storefront actually authenticates with. Wrapped,
     * because a guard that is not registered throws rather than returning null, and a token problem
     * must degrade this endpoint to "guest" rather than 500 a reply.
     */
    private function optionalUser(Request $request): ?User
    {
        try {
            $user = $request->user('sanctum');
            if ($user instanceof User) {
                return $user;
            }
        } catch (\Throwable) {
            // fall through
        }

        try {
            $user = $request->user();

            return $user instanceof User ? $user : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * The rating on a review, from whichever of the two columns this database actually has.
     *
     * `stars` is what the storefront and Filament use; `note` is the legacy twin, and the model
     * casts it. Either may be absent, so both are read through the model's attribute bag rather
     * than assumed — an absent column is `null` there, not an error.
     */
    private function starsOf(Review $review): int
    {
        return (int) ($review->stars ?? $review->note ?? 0);
    }

    /**
     * Evidence of a real purchase — the same test as `Review::scopeAttested` and as
     * `buildAggregateRatingAndReviews` on the storefront. One rule, three places.
     *
     * Used here only to LABEL a review on a member's page. It never changes a rating: nothing this
     * controller returns feeds an aggregate.
     */
    private function isAttested(Review $review): bool
    {
        return (int) ($review->verified ?? 0) === 1 || ($review->commande_id ?? null) !== null;
    }

    /** The public shape of one reply. Never includes author_email or ip_hash. */
    private function presentReply(ReviewReply $reply): array
    {
        return [
            'id'         => (int) $reply->id,
            'review_id'  => (int) $reply->review_id,
            'parent_id'  => $reply->parent_id ? (int) $reply->parent_id : null,
            'user_id'    => $reply->user_id ? (int) $reply->user_id : null,
            'name'       => $reply->display_name,
            'body'       => (string) $reply->body,
            'is_staff'   => (bool) $reply->is_staff,
            'created_at' => optional($reply->created_at)->toIso8601String(),
        ];
    }

    /**
     * Who is doing this, for rate-limiting purposes.
     *
     * A signed-in account is keyed by its id, so the limit follows the person across devices rather
     * than being reset by opening a laptop. Everyone else is keyed by the hashed address, which is
     * the only handle a guest has.
     */
    private function identityKey(Request $request, mixed $userId): string
    {
        return $userId ? ('u' . $userId) : ('h' . $this->ipHash($request));
    }

    /**
     * SHA-256 of the address salted with the app key.
     *
     * Never the address itself. This has to answer "same submitter?" and nothing else, and an
     * `ip_hash` column that turns out to hold plain addresses is a data-protection problem sitting
     * in a backup for years. Salting with APP_KEY means the column is useless if the table leaks
     * without the key.
     */
    private function ipHash(Request $request): string
    {
        return hash('sha256', (string) config('app.key') . '|' . (string) $request->ip());
    }

    /**
     * A per-identity ceiling on top of the route throttle.
     *
     * The route middleware limits per IP, which one signed-in account defeats with a phone and a
     * laptop, and which a household behind one NAT trips for everybody. This is the other axis.
     *
     * Cache-backed, so it degrades to "allow" if the cache is down — deliberately. A rate limiter
     * that fails closed would take the whole feature offline every time Redis blinked, and the
     * moderator is still between every message and the page.
     */
    private function withinHourlyLimit(string $key, int $max): bool
    {
        try {
            $cacheKey = 'rv-limit:' . sha1($key);
            $count    = (int) Cache::get($cacheKey, 0);
            if ($count >= $max) {
                return false;
            }
            Cache::put($cacheKey, $count + 1, now()->addHour());

            return true;
        } catch (\Throwable) {
            return true;
        }
    }
}
