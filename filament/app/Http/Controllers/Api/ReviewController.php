<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commande;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Tokenized "verified purchase" review flow. The customer receives a link
 * containing their order's secure order_token (no login needed) and can rate the
 * products they actually bought. The token proves the purchase, so reviews are
 * spam-resistant and eligible to be marked "verified".
 */
class ReviewController extends Controller
{
    use \App\Http\Controllers\Api\Concerns\CapturesReviewSignals;

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

        $commande->loadMissing('details.product:id,slug,designation_fr,cover');

        $reviewedIds = [];
        if (Schema::hasColumn('reviews', 'commande_id')) {
            $reviewedIds = Review::where('commande_id', $commande->id)->pluck('product_id')->map(fn ($v) => (int) $v)->all();
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
            'prenom'   => trim((string) ($commande->livraison_prenom ?? $commande->prenom ?? '')),
            'products' => $products,
        ]);
    }

    /**
     * Create a review from an order token. Validates the product belongs to the
     * order, dedupes one review per order+product, attributes to the order's User
     * when it is a real account (else anonymous), marks it verified, and
     * publishes immediately; the asynchronous safety pass may still remove spam or abuse.
     */
    public function storeByToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_token' => ['required', 'string', 'max:128'],
            'product_id'  => ['required', 'integer', 'exists:products,id'],
            'stars'       => ['required', 'integer', 'min:1', 'max:5'],
            'comment'     => ['required', 'string', 'max:1000'],
        ]);

        $commande = Commande::findByReviewRef($data['order_token']);
        if (! $commande) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
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

        // Attribute to a real User only; a guest (Client id in user_id) stays anonymous.
        $userId = ($commande->user_id && User::find($commande->user_id)) ? $commande->user_id : null;

        $payload = [
            ...$this->reviewSignalColumns($request, (string) $data['comment']),
            'user_id'    => $userId,
            'product_id' => $data['product_id'],
            'stars'      => $stars,
            'comment'    => $data['comment'],
            'publier'    => 1,
        ];

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
        $name = trim((string) ($commande->livraison_prenom ?? $commande->prenom ?? '') . ' ' . (string) ($commande->livraison_nom ?? $commande->nom ?? ''));
        $name = trim($name);
        if ($name !== '') {
            foreach (['name', 'nom', 'author', 'pseudo'] as $col) {
                if (Schema::hasColumn('reviews', $col)) {
                    $payload[$col] = $name;
                    break;
                }
            }
        }

        $review = Review::create($payload);

        return response()->json([
            'message'   => 'Merci pour votre avis !',
            'published' => $payload['publier'] === 1,
            'id'        => $review->id,
        ], 201);
    }
}
