<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commande;
use App\Models\Review;
use App\Models\User;
use App\Services\PointsService;
use App\Services\ReviewSubmissionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tokenized "verified purchase" review flow. The customer receives a link
 * containing their order's secure order_token (no login needed) and can rate the
 * products they actually bought. The token proves the purchase, so reviews are
 * spam-resistant and eligible to be marked "verified".
 *
 * ── THE TOKEN PROVES AN ORDER, NOT A DELIVERY ──────────────────────────────────────────────
 * The same order_token is in the order-confirmation URL, which every customer receives the moment
 * they check out. Without a gate, a cash-on-delivery order that was REFUSED at the door could still
 * open /avis/{token} and publish an "Achat vérifié" review that counts in the product's stars. So
 * both endpoints answer 410 until the order is delivered (`reason: not_delivered`) and again once
 * the delivery is older than `reviews.link_max_age_days` (`reason: expired`). The storefront
 * renders `message` as-is and branches on `reason`.
 */
class ReviewController extends Controller
{
    use \App\Http\Controllers\Api\Concerns\CapturesReviewSignals;

    /** The link works: the order is delivered and the delivery is recent enough. */
    public const LINK_OPEN = 'open';

    /** The order exists but has not been delivered (or was refused / cancelled / returned). */
    public const LINK_NOT_DELIVERED = 'not_delivered';

    /** Delivered more than `reviews.link_max_age_days` days ago. */
    public const LINK_EXPIRED = 'expired';

    /** An affiliate-desk order (Commande::isAffiliateDeskOrder): never solicited, never attested. */
    public const LINK_NOT_ELIGIBLE = 'not_eligible';

    /**
     * List the products of an order (by order_token) so the /avis/{token} page can
     * render one review form per purchased product, hiding those already reviewed.
     */
    public function orderForReview(string $token): JsonResponse
    {
        $commande = Commande::findByReviewRef($token);
        if (! $commande) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
        }

        if ($blocked = $this->deliveredGate($commande)) {
            return $blocked;
        }

        $commande->loadMissing('details.product:id,slug,designation_fr,cover');

        $reviewedIds = [];
        if (Schema::hasColumn('reviews', 'commande_id')) {
            $reviewedIds = Review::where('commande_id', $commande->id)->pluck('product_id')->map(fn ($v) => (int) $v)->all();
        }

        // One review per account and product (storeByToken refuses a second): a product this
        // order's account already reviewed — through another order's link or the product page —
        // is shown as done, so neither the form nor an email star link offers it again.
        $authId = (int) ($commande->authenticated_user_id ?? 0);
        if ($authId > 0) {
            $orderProductIds = $commande->details->pluck('produit_id')
                ->map(fn ($v) => (int) $v)
                ->filter(fn (int $v) => $v > 0)
                ->unique()
                ->values()
                ->all();
            if ($orderProductIds !== []) {
                $reviewedIds = array_merge($reviewedIds, Review::where('user_id', $authId)
                    ->whereIn('product_id', $orderProductIds)
                    ->pluck('product_id')
                    ->map(fn ($v) => (int) $v)
                    ->all());
            }
        }

        $products = $commande->details
            ->map(function ($d) use ($reviewedIds) {
                $p = $d->product;
                if (! $p) {
                    return null;
                }

                return [
                    'product_id'  => (int) $p->id,
                    'slug'        => $p->slug,
                    'designation' => $p->designation_fr,
                    'cover'       => $p->cover,
                    'reviewed'    => in_array((int) $p->id, $reviewedIds, true),
                ];
            })
            ->filter()
            ->unique('product_id')
            ->values();

        return response()->json([
            'numero'   => $commande->numero,
            // The full-name checkout leaves the first-name columns empty: greet with the first word,
            // case-normalised exactly as the stored « Prénom N. » is ("amira" / "AMIRA" -> "Amira").
            'prenom'   => self::displayFirstName(self::nameParts($commande)[0]),
            'products' => $products,
            // The Protinas line on /avis is shown only when a review written HERE can be paid, and
            // states the same minimum the observer applies (never a hard-coded copy of it).
            'reward_eligible'   => self::orderEarnsProtinas($commande),
            'reward_min_length' => max(0, (int) config('reviews.points.min_length', 15)),
        ]);
    }

    /**
     * Create a review from an order token. Validates the product belongs to the
     * order, dedupes one review per order+product AND one per account+product (the rule
     * ReviewSubmissionService applies on the product page), attributes to the account that
     * placed the order when there is one (else anonymous), marks it verified, and
     * publishes immediately; the asynchronous safety pass may still remove spam or abuse.
     *
     * The comment is OPTIONAL: a delivered customer may leave stars only. Such a row counts as a
     * rating (ratingCount), not as a review (reviewCount), and ReviewModerator publishes it under the
     * `rating_only` flag because the order behind it is the evidence.
     */
    public function storeByToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_token' => ['required', 'string', 'max:128'],
            'product_id'  => ['required', 'integer', 'exists:products,id'],
            'stars'       => ['required', 'integer', 'min:1', 'max:5'],
            'comment'     => ['nullable', 'string', 'max:1000'],
        ]);

        $commande = Commande::findByReviewRef($data['order_token']);
        if (! $commande) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
        }

        if ($blocked = $this->deliveredGate($commande)) {
            return $blocked;
        }

        $inOrder = $commande->details()->where('produit_id', $data['product_id'])->exists();
        if (! $inOrder) {
            return response()->json(['message' => 'Ce produit ne fait pas partie de votre commande.'], 422);
        }

        if (Schema::hasColumn('reviews', 'commande_id')) {
            $already = Review::where('commande_id', $commande->id)
                ->where('product_id', $data['product_id'])
                ->exists();
            if ($already) {
                return response()->json(['message' => 'Vous avez déjà donné votre avis sur ce produit.'], 409);
            }
        }

        if ($this->trippedHoneypot($request)) {
            // Ordinary success, no row — see the note on add_review.
            return response()->json(['message' => 'Merci pour votre avis !', 'published' => false, 'id' => null], 201);
        }

        $stars = (int) $data['stars'];
        $comment = trim((string) ($data['comment'] ?? ''));

        /*
         * ── WHO WROTE IT ─────────────────────────────────────────────────────────────────────
         * `commandes.user_id` is NOT an account id: historically it holds Client ids, and a Client
         * id that happens to equal some unrelated User's id used to hand that stranger the review
         * (and, through the points path, the reward). `authenticated_user_id` is written only by
         * the storefront checkout from the Sanctum owner, and 0 everywhere else — so it is the one
         * column that answers "which account placed this order". Anything else stays anonymous.
         */
        $authId = (int) ($commande->authenticated_user_id ?? 0);
        $userId = $authId > 0 && User::whereKey($authId)->exists() ? $authId : null;

        $payload = [
            ...$this->reviewSignalColumns($request, $comment),
            'user_id'    => $userId,
            'product_id' => $data['product_id'],
            'stars'      => $stars,
            /*
             * '' rather than NULL for a stars-only review. The base `reviews` table predates the
             * migrations folder (no migration declares `comment`), so its nullability cannot be
             * read from the repo — and '' is valid under both NOT NULL and NULL, where NULL would
             * 500 the submission on a NOT NULL column. Every reader trims and casts to string, so
             * '' and NULL render identically.
             */
            'comment'    => $comment,
            'publier'    => 1,
        ];

        // An empty text has nothing to fingerprint: sha1('') on every stars-only row would make
        // them all "duplicates" of one another in the authenticity text index.
        if ($comment === '' && array_key_exists('text_hash', $payload)) {
            $payload['text_hash'] = null;
        }

        // Schema-defensive extras (only write columns that actually exist).
        if (Schema::hasColumn('reviews', 'note')) {
            $payload['note'] = $stars;
        }
        if (Schema::hasColumn('reviews', 'commande_id')) {
            $payload['commande_id'] = $commande->id;
        }
        if (Schema::hasColumn('reviews', 'verified')) {
            $payload['verified'] = 1;
        }
        if (Schema::hasColumn('reviews', 'author_name')) {
            $author = self::publicAuthorName($commande);
            if ($author !== null) {
                $payload['author_name'] = $author;
            }
        }

        /*
         * ONE RATING PER ORDER AND PRODUCT, under concurrency. The exists() above is only a fast
         * answer: ten parallel POSTs with one token all passed it before any row was written, and
         * each inserted an attested « Achat vérifié » rating that counts in aggregateRating. The
         * order row is locked so the check and the insert happen one submission at a time, and the
         * unique index reviews(commande_id, product_id) (migration 2026_10_05_000400) refuses
         * whatever still gets through.
         *
         * ONE REVIEW PER ACCOUNT AND PRODUCT, as on the product page. A repeat buyer's second
         * delivered order is another commande_id, so the unique index lets its row through: without
         * this check the same account got a second attested rating in aggregateRating and a second
         * Protinas payout (the ledger key is per review id). The user row is locked exactly as
         * ReviewSubmissionService::create locks it, so an /avis submission and a product-page one
         * from the same account are serialised too.
         */
        $duplicate = fn (): JsonResponse => response()->json(['message' => 'Vous avez déjà donné votre avis sur ce produit.'], 409);
        $hasOrderColumn = Schema::hasColumn('reviews', 'commande_id');
        try {
            $review = DB::transaction(function () use ($commande, $data, $payload, $hasOrderColumn, $userId): ?Review {
                Commande::query()->whereKey($commande->id)->lockForUpdate()->first();
                if ($hasOrderColumn && Review::where('commande_id', $commande->id)
                    ->where('product_id', $data['product_id'])
                    ->exists()) {
                    return null;
                }

                if ($userId !== null) {
                    User::query()->whereKey($userId)->lockForUpdate()->first();
                    if (Review::where('user_id', $userId)->where('product_id', $data['product_id'])->exists()) {
                        return null;
                    }
                }

                return Review::create($payload);
            });
        } catch (QueryException $e) {
            if (ReviewSubmissionService::isUniqueViolation($e)) {
                return $duplicate();
            }
            throw $e;
        }
        if ($review === null) {
            return $duplicate();
        }

        return response()->json([
            'message'   => 'Merci pour votre avis !',
            'published' => $payload['publier'] === 1,
            'id'        => $review->id,
        ], 201);
    }

    /**
     * Is the review link of this order usable right now?
     *
     * ONE definition, shared by both endpoints here and by ClientController::detail_commande (which
     * only offers `review_url` when this says open), so the account page can never show a link the
     * /avis page then refuses.
     *
     * Delivered = `etat` in PointsService::DELIVERED_STATUSES, compared exactly the way
     * PointsService compares it (string cast, strict). A delivered order later switched to a
     * return or cancellation is therefore closed again, which is the point.
     *
     * The delivery moment is `delivered_at`, falling back to `updated_at` for legacy rows that
     * were marked delivered before the column was stamped. A delivered order with neither is
     * treated as open rather than expired: no clock, no claim that it is old.
     *
     * An affiliate-desk order is never open: the affiliate typed its contact fields, so a link sent
     * to them could become a reseller's « Achat vérifié » rating of a product it earns on.
     *
     * @return self::LINK_*
     */
    public static function reviewLinkState(Commande $commande): string
    {
        if ($commande->isAffiliateDeskOrder()) {
            return self::LINK_NOT_ELIGIBLE;
        }

        if (! in_array((string) $commande->etat, PointsService::DELIVERED_STATUSES, true)) {
            return self::LINK_NOT_DELIVERED;
        }

        $deliveredAt = $commande->delivered_at ?? $commande->updated_at;
        $maxAge = max(1, (int) config('reviews.link_max_age_days', 120));

        if ($deliveredAt instanceof \DateTimeInterface
            && \Illuminate\Support\Carbon::instance($deliveredAt)->lt(now()->subDays($maxAge))) {
            return self::LINK_EXPIRED;
        }

        return self::LINK_OPEN;
    }

    /**
     * Can a review written through this order's /avis link earn Protinas at all?
     *
     * storeByToken attributes the review to `authenticated_user_id` and nothing else, and
     * ReviewObserver::settlePoints pays only an existing account with a verified phone, for a
     * positive award. Those are the order-level conditions; the per-review ones (comment length,
     * authenticity) stay with the observer. A guest order, or an account whose phone is not
     * verified, can never be paid — so neither the /avis page (orderForReview) nor the
     * review-request email (review-request.blade.php) may promise it Protinas. ONE definition for
     * both, so the email and the page cannot disagree.
     */
    public static function orderEarnsProtinas(Commande $commande): bool
    {
        $authId = (int) ($commande->authenticated_user_id ?? 0);
        if ($authId <= 0 || (int) config('reviews.points.verified_purchase_award', 50) <= 0) {
            return false;
        }

        try {
            return User::whereKey($authId)->whereNotNull('phone_verified_at')->exists();
        } catch (\Throwable) {
            // No answer, no promise: an email or a review page must not fail over this line.
            return false;
        }
    }

    /** 410 with a `reason` the storefront branches on, or null when the link is usable. */
    private function deliveredGate(Commande $commande): ?JsonResponse
    {
        return match (self::reviewLinkState($commande)) {
            self::LINK_NOT_DELIVERED => response()->json([
                'message' => 'Ce lien sera actif dès que votre commande aura été livrée.',
                'reason'  => 'not_delivered',
            ], 410),
            self::LINK_EXPIRED => response()->json([
                'message' => 'Ce lien a expiré.',
                'reason'  => 'expired',
            ], 410),
            self::LINK_NOT_ELIGIBLE => response()->json([
                'message' => 'Les avis ne sont pas ouverts pour cette commande.',
                'reason'  => 'not_eligible',
            ], 410),
            default => null,
        };
    }

    /**
     * The name printed above a tokenised review: "Prénom N.".
     *
     * First name as given (delivery name first, billing name as fallback), plus the initial of
     * the last name. Never the full last name: the review is public, on a product page, and a full
     * name plus "a bought B" is more than a customer agreed to publish by clicking a link.
     *
     * A name typed entirely in lower or upper case is title-cased ("ILEF" -> "Ilef"); a mixed-case
     * one is kept exactly as typed. Arabic script has no case and passes through untouched.
     *
     * The main checkout asks for ONE full name ("Nom complet"), stores it in livraison_nom / nom and
     * leaves both first-name columns NULL. For those orders the full name is split instead: first
     * word as the first name, the next word's initial ("amira ben salah" -> "Amira B."), the order
     * the checkout asks for (« Indiquez votre prénom et votre nom »).
     *
     * Returns null when there is no name at all; the storefront then shows "Client".
     */
    public static function publicAuthorName(Commande $commande): ?string
    {
        [$first, $last] = self::nameParts($commande);
        if ($first === '') {
            return null;
        }

        $name = self::displayFirstName($first);
        if ($last !== '' && preg_match('/\p{L}/u', $last, $m) === 1) {
            $name .= ' ' . mb_strtoupper($m[0], 'UTF-8') . '.';
        }

        // reviews.author_name is VARCHAR(60).
        return mb_substr($name, 0, 60, 'UTF-8');
    }

    /**
     * A first name as it is shown back to the customer — the /avis greeting and the public
     * « Prénom N. » alike, so the two never disagree on the same word. Whitespace collapsed; a name
     * typed entirely in lower or upper case is title-cased ("amira" / "AMIRA" -> "Amira"); a
     * mixed-case one is kept exactly as typed; Arabic script has no case and passes through.
     */
    private static function displayFirstName(string $first): string
    {
        $first = trim((string) preg_replace('/\s+/u', ' ', $first));
        if ($first === mb_strtolower($first, 'UTF-8') || $first === mb_strtoupper($first, 'UTF-8')) {
            $first = mb_convert_case(mb_strtolower($first, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        }

        return $first;
    }

    /**
     * [first name, last name] as stored on the order, trimmed; '' for a missing part. With no
     * first-name column filled, the full name (livraison_nom, else nom) is split on whitespace:
     * first word, then the rest.
     *
     * @return array{0: string, 1: string}
     */
    private static function nameParts(Commande $commande): array
    {
        $first = self::firstFilled($commande->livraison_prenom ?? null, $commande->prenom ?? null);
        $last = self::firstFilled($commande->livraison_nom ?? null, $commande->nom ?? null);
        if ($first !== '' || $last === '') {
            return [$first, $last];
        }

        $words = preg_split('/\s+/u', $last, 2, PREG_SPLIT_NO_EMPTY) ?: [];

        return [(string) ($words[0] ?? ''), trim((string) ($words[1] ?? ''))];
    }

    /** First non-blank of the candidates, trimmed; '' when all are blank. */
    private static function firstFilled(mixed ...$values): string
    {
        foreach ($values as $value) {
            $value = trim((string) $value);
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }
}
