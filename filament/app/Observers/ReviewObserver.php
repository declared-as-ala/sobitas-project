<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Services\PointsService;
use App\Services\Reviews\ReviewAuthenticity;
use App\Services\Reviews\ReviewModerator;
use App\Services\Seo\SeoNotifier;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ReviewObserver
{
    /**
     * On a new avis: (1) notify the panel of the new review, then (2) run AI
     * moderation AFTER the HTTP response so the customer's submission is never
     * slowed or broken by a slow AI call.
     */
    public function created(Review $review): void
    {
        $this->notifyNewReview($review);
        $this->moderateAfterResponse($review);
    }

    /**
     * When a review is approved/published (publier -> 1) via the admin panel, the
     * product's aggregateRating (stars) changes — refresh that product's page so
     * the new stars appear on the live PDP within seconds. (New reviews created
     * via the API are handled by the moderation pass below, which fires the same
     * refresh once a verdict is applied.)
     */
    public function saved(Review $review): void
    {
        if (! $review->wasChanged('publier')) {
            return;
        }

        if ((int) $review->publier === 1) {
            $product = $review->product ?? Product::find($review->product_id);
            if ($product) {
                app(SeoNotifier::class)->productChanged($product);
            }

            /*
             * An admin approving a held review in the panel is the OTHER way a review gets
             * published, and it has to pay the same as the automatic path. Without this, the
             * reward would depend on which route the review happened to take — and the manual
             * route is the one a genuine customer whose review was held ends up on.
             */
            self::settlePoints($review);

            return;
        }

        /*
         * Unpublished. Take the points back.
         *
         * An award that cannot be reversed turns "publish, get paid, delete" into a loop, and the
         * loop is worth 2.50 DT a turn. `reverseForReview` is idempotent, so an admin toggling a
         * review twice does not claw back twice.
         */
        self::clawBackPoints($review);
    }

    /**
     * Pay for a published review, if it has earned it.
     *
     * @param  array<string,mixed>|null  $authenticity  Reuses the verdict when it was just computed,
     *                                                  rather than re-running the DB checks.
     */
    private static function settlePoints(Review $review, ?array $authenticity = null): void
    {
        try {
            if ((int) $review->publier !== 1) {
                return;
            }

            // A guest review has nobody to pay. That is not a limitation to work around: an
            // anonymous author is precisely the case where "who receives the money" has no answer.
            $userId = $review->user_id;
            if (empty($userId)) {
                return;
            }

            $user = User::find($userId);
            if (! $user) {
                return;
            }

            if ((int) config('reviews.points.award', 0) <= 0) {
                return;
            }

            if (mb_strlen(trim((string) $review->comment)) < (int) config('reviews.points.min_length', 15)) {
                return;
            }

            $authenticity ??= app(ReviewAuthenticity::class)->assess($review, ['compose_ms' => $review->compose_ms]);
            if (empty($authenticity['may_earn_points'])) {
                return;
            }

            $awarded = app(PointsService::class)->awardForReview(
                $user,
                (int) $review->id,
                optional($review->product)->designation_fr
            );

            if ($awarded && Schema::hasColumn('reviews', 'points_awarded')) {
                $review->forceFill(['points_awarded' => true])->saveQuietly();
            }
        } catch (\Throwable $e) {
            // A points failure must never affect a review, exactly as with order points.
            Log::error('settlePoints failed', ['review_id' => $review->id ?? null, 'error' => $e->getMessage()]);
        }
    }

    /** Reverse a review award when the review stops being published. */
    private static function clawBackPoints(Review $review): void
    {
        try {
            $userId = $review->user_id;
            if (empty($userId)) {
                return;
            }
            $user = User::find($userId);
            if (! $user) {
                return;
            }

            if (app(PointsService::class)->reverseForReview($user, (int) $review->id)
                && Schema::hasColumn('reviews', 'points_awarded')) {
                $review->forceFill(['points_awarded' => false])->saveQuietly();
            }
        } catch (\Throwable $e) {
            Log::error('clawBackPoints failed', ['review_id' => $review->id ?? null, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Notify all panel users that a new avis arrived (unchanged legacy behaviour).
     */
    private function notifyNewReview(Review $review): void
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
        $body .= ' – ' . (Str::limit($review->comment ?? '', 50));

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->info()
                ->sendToDatabase($user);
        }
    }

    /**
     * Run the moderator after the response is flushed (best-effort — a moderation
     * failure must never affect the customer's submission). Applies the verdict:
     * demotes bad reviews, optionally publishes genuine held ones, records the
     * verdict, refreshes the PDP, and pings the admin only when action is needed.
     */
    private function moderateAfterResponse(Review $review): void
    {
        $reviewId = (int) $review->id;

        // Static closure: captures only the scalar id (never $this), so the
        // after-response callback carries no observer state — mirrors SeoNotifier.
        dispatch(static function () use ($reviewId): void {
            self::runModeration($reviewId);
        })->afterResponse();
    }

    /**
     * Moderate one review by id and apply the verdict. Public + static so it can
     * also be driven from a backfill command later. Best-effort throughout.
     */
    public static function runModeration(int $reviewId): void
    {
        $review = Review::with('product')->find($reviewId);
        if (! $review) {
            return;
        }

        try {
            $verdict = app(ReviewModerator::class)->moderate($review);
        } catch (\Throwable $e) {
            Log::warning('Review moderation failed', ['review_id' => $reviewId, 'error' => $e->getMessage()]);

            return;
        }

        /*
         * ── AUTHENTICITY, AFTER MODERATION AND BEFORE PUBLICATION ────────────────────────
         * Order matters. The authenticity score CONSUMES the moderator's verdict — it reads the
         * sentiment to spot a five-star rating on angry text, and the decision to know the
         * classifier already wanted this gone. Running them the other way round would throw away
         * both signals.
         *
         * The client-side evidence (`compose_ms`) was written onto the row by the controller at
         * submission; the observer has no request. The honeypot never reaches here at all — a
         * filled honeypot is discarded at the controller, so there is no row to score.
         */
        $authenticity = app(ReviewAuthenticity::class)->assess(
            $review,
            ['compose_ms' => $review->compose_ms],
            $verdict
        );

        $original = (int) $review->publier;
        $target   = self::targetPublier($original, $verdict);

        /*
         * The authenticity floor can HOLD a review the moderator was happy with, and never the
         * reverse: it cannot publish something moderation rejected. A bot writes publishable prose
         * — that is the entire difficulty — so "the text is fine" and "a person wrote it" are two
         * questions and the stricter answer wins.
         *
         * It never DELETES and never unpublishes a genuine negative. A held review is visible to
         * an admin with every signal that fired printed next to it, which is the difference between
         * moderation and review-gating.
         */
        if ($target === 1 && ($authenticity['verdict'] ?? '') === 'bot') {
            $target = 0;
        }

        // Persist the verdict (+ any publish-state change) WITHOUT re-firing
        // observer events (saveQuietly avoids a recursive moderation loop).
        $updates = [];
        if (Schema::hasColumn('reviews', 'ai_moderation')) {
            $updates['ai_moderation'] = $verdict;
        }
        if (Schema::hasColumn('reviews', 'ai_checked_at')) {
            $updates['ai_checked_at'] = now();
        }
        if ($target !== $original) {
            $updates['publier'] = $target;
        }
        if (Schema::hasColumn('reviews', 'authenticity_score')) {
            $updates['authenticity_score'] = (int) $authenticity['score'];
        }
        if (Schema::hasColumn('reviews', 'authenticity_signals')) {
            $updates['authenticity_signals'] = $authenticity;
        }
        if (! empty($updates)) {
            /*
             * `saveQuietly` — which means `saved()` does NOT fire here, so the points settlement
             * below is explicit rather than incidental. That is deliberate: the quiet save exists
             * to avoid a recursive moderation loop, and quietly relying on an observer hook that
             * has been suppressed is how a feature works in testing and pays nobody in production.
             */
            $review->forceFill($updates)->saveQuietly();
        }

        if ($target === 1) {
            self::settlePoints($review->refresh(), $authenticity);
        }

        // Refresh the PDP when the review is (or just became) live, and also
        // when we just removed a bad one, so stars/aggregate update at once.
        // Use the SYNCHRONOUS variant: we are already in an afterResponse callback,
        // so deferring again would be unreliable.
        if (($target === 1 || $target !== $original) && $review->product) {
            try {
                app(SeoNotifier::class)->productChangedNow($review->product);
            } catch (\Throwable $e) {
                Log::warning('SeoNotifier after moderation failed', ['review_id' => $reviewId, 'error' => $e->getMessage()]);
            }
        }

        self::notifyModerationOutcome($review, $verdict, $original, $target);
    }

    /**
     * Map a moderation decision to the target `publier`, honouring the config
     * switches. Never silently drops a genuine negative review (that is gating):
     * genuine held reviews are surfaced to the admin instead (see notify below).
     *
     * @param  array<string,mixed>  $verdict
     */
    private static function targetPublier(int $current, array $verdict): int
    {
        $decision       = (string) ($verdict['decision'] ?? 'publish');
        $demoteBad      = (bool) config('reviews.moderation.demote_bad', true);
        $autoPubGenuine = (bool) config('reviews.moderation.auto_publish_genuine', false);

        return match ($decision) {
            // Bad content: unpublish (only actually demotes a live one when allowed).
            'reject' => $demoteBad ? 0 : $current,
            // Must not stay auto-live: pull a currently-live one when demotion is on.
            'hold'   => ($current === 1 && $demoteBad) ? 0 : $current,
            // Clean: keep a live one live; promote a held one only if genuine + enabled.
            'publish' => $current === 1
                ? 1
                : (($autoPubGenuine && ($verdict['genuine'] ?? false)) ? 1 : $current),
            default => $current,
        };
    }

    /**
     * Ping the admin ONLY when the moderator did something noteworthy, so the
     * common "clean review stays live" case adds no notification noise.
     *
     * @param  array<string,mixed>  $verdict
     */
    private static function notifyModerationOutcome(Review $review, array $verdict, int $original, int $target): void
    {
        $decision = (string) ($verdict['decision'] ?? 'publish');
        $isAi     = ($verdict['source'] ?? '') === 'ai';
        $genuine  = (bool) ($verdict['genuine'] ?? false);

        $title = null;
        $type  = 'info';

        if ($original === 1 && $target === 0) {
            // A live review was auto-removed — always tell the admin.
            $title = '⚠️ Avis dépublié automatiquement (IA)';
            $type  = 'warning';
        } elseif ($original === 0 && $target === 1) {
            // A held review was auto-published.
            $title = 'Avis publié automatiquement (IA)';
            $type  = 'success';
        } elseif ($target === 0 && $isAi && $genuine && $decision !== 'reject') {
            // Genuine but held (auto-publish disabled) — nudge the admin to publish
            // so a real (possibly critical) review is not silently suppressed.
            $title = 'Avis authentique en attente — à publier ?';
            $type  = 'info';
        } elseif ($target === 0 && $isAi && $decision === 'reject') {
            // Flagged spam/abuse that is (correctly) not live — low-key heads-up so
            // the admin does not manually publish it later.
            $title = 'Avis signalé comme indésirable (IA)';
            $type  = 'warning';
        }

        if ($title === null) {
            return; // clean & unchanged, or nothing actionable — stay quiet
        }

        $snippet = Str::limit((string) $review->comment, 60);
        $product = optional($review->product)->designation_fr ?? ('produit #' . $review->product_id);
        $reason  = (string) ($verdict['reason'] ?? '');
        $body    = "Avis #{$review->id} – {$product}\n« {$snippet} »" . ($reason !== '' ? "\nIA : {$reason}" : '');

        foreach (User::all() as $user) {
            $notification = Notification::make()->title($title)->body($body);
            $notification = match ($type) {
                'warning' => $notification->warning(),
                'success' => $notification->success(),
                default   => $notification->info(),
            };
            $notification->sendToDatabase($user);
        }
    }
}
