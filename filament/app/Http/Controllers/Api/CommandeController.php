<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderConfirmedAdminMail;
use App\Mail\OrderConfirmedCustomerMail;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Message;
use App\Models\CouponRedemption;
use App\Models\Product;
use App\Models\User;
use App\Services\ClientService;
use App\Services\CouponService;
use App\Services\PackDiscountService;
use App\Services\PointsService;
use App\Services\SmsService;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class CommandeController extends Controller
{
    /**
     * Resolve the authenticated User from a Sanctum bearer token WITHOUT relying
     * on the route being behind auth:sanctum (/add_commande is a public route).
     * Returns null for guests / invalid / expired tokens. This is the ONLY
     * trusted identity for loyalty points — never a client-supplied user_id,
     * which would let an attacker spend/earn on someone else's balance.
     */
    private function resolveTokenUser(Request $request): ?User
    {
        $bearer = $request->bearerToken();
        if (! $bearer) {
            return null;
        }
        $token = PersonalAccessToken::findToken($bearer);
        if (! $token) {
            return null;
        }
        if ($token->expires_at && $token->expires_at->isPast()) {
            return null;
        }
        $owner = $token->tokenable;

        return $owner instanceof User ? $owner : null;
    }

    /**
     * Store a new commande from the frontend API.
     *
     * ⚠️ LEGACY CODE — This replicates the exact behavior from
     *   AdminCommandeController::storeCommandeApi() in the backend project.
     *   Price calculation logic preserved as-is.
     *   SMS and email are now dispatched to queue for better response time.
     */
    public function storeCommandeApi(Request $request): JsonResponse
    {
        $request->validate([
            'commande'          => ['required', 'array'],
            'commande.phone'    => ['nullable', 'string', 'max:20'],
            'commande.email'    => ['nullable', 'email', 'max:255'],
            'commande.nom'      => ['nullable', 'string', 'max:255'],
            'commande.prenom'   => ['nullable', 'string', 'max:255'],
            'commande.region'   => ['nullable', 'string', 'max:255'],
            'commande.frais_livraison' => ['nullable', 'numeric', 'min:0'], // never trust a negative shipping fee
            'panier'            => ['required', 'array', 'min:1'],
            'panier.*.produit_id'    => ['required', 'integer', 'exists:products,id'],
            'panier.*.quantite'      => ['required', 'integer', 'min:1'],
            'panier.*.prix_unitaire' => ['nullable', 'numeric', 'min:0'], // CRIT-03: ignored; server uses DB price
            'coupon_code'       => ['nullable', 'string', 'max:64'],
            'pack_discount'     => ['nullable', 'boolean'],   // opt-in; amount computed server-side
            'points_to_redeem'  => ['nullable', 'integer', 'min:0'], // validated <= balance & cap
        ]);

        $commandeData = $request->commande;

        // The authenticated token owner (or null for guests). The ONLY identity
        // allowed to earn or spend loyalty points.
        $authUser = $this->resolveTokenUser($request);

        Log::info('filament.api.add_commande.start', ['payload_keys' => array_keys($commandeData ?? [])]);

        $couponService = app(CouponService::class);
        $new_facture = DB::transaction(function () use ($commandeData, $request, $couponService, $authUser) {
            $new_facture = new Commande();

            // Use livraison fields as primary source, fallback to billing fields
            $new_facture->nom = $commandeData['livraison_nom'] ?? $commandeData['nom'] ?? null;
            $new_facture->prenom = $commandeData['livraison_prenom'] ?? $commandeData['prenom'] ?? null;
            $new_facture->email = $commandeData['livraison_email'] ?? $commandeData['email'] ?? null;
            $new_facture->phone = $commandeData['livraison_phone'] ?? $commandeData['phone'] ?? null;
            $new_facture->pays = $commandeData['pays'] ?? 'Tunisie';
            $new_facture->region = $commandeData['livraison_region'] ?? $commandeData['region'] ?? null;
            $new_facture->ville = $commandeData['livraison_ville'] ?? $commandeData['ville'] ?? null;
            $new_facture->code_postale = $commandeData['livraison_code_postale'] ?? $commandeData['code_postale'] ?? null;
            $new_facture->adresse1 = $commandeData['livraison_adresse1'] ?? $commandeData['adresse1'] ?? null;
            $new_facture->adresse2 = $commandeData['livraison_adresse2'] ?? $commandeData['adresse2'] ?? null;
            $new_facture->livraison = $commandeData['livraison'] ?? null;
            $new_facture->frais_livraison = $commandeData['frais_livraison'] ?? null;
            $new_facture->note = $commandeData['note'] ?? null;

            // ── Order attribution ───────────────────────────────────────────────
            // A valid Sanctum token is the ONLY trusted identity. When present the
            // order belongs to the token owner — never to a client-supplied
            // user_id (that would be an IDOR: attaching an order, and any points
            // side-effects, to an arbitrary account).
            $hasClientIdColumn = Schema::hasColumn($new_facture->getTable(), 'client_id');
            if ($authUser) {
                $new_facture->user_id = $authUser->id;
                if ($hasClientIdColumn) {
                    $new_facture->client_id = $authUser->id;
                }
            } elseif (! empty($commandeData['user_id'])) {
                // Legacy attribution only (guest checkout that carried an id). No
                // loyalty points can be earned or spent on this unauthenticated path.
                $new_facture->user_id = $commandeData['user_id'];
                if ($hasClientIdColumn) {
                    $new_facture->client_id = $commandeData['user_id'];
                }
            } else {
                $client = app(ClientService::class)->findOrCreateClientFromDeliveryInfo($commandeData);
                if ($client) {
                    Log::info('filament.api.add_commande.client_linked', ['client_id' => $client->id]);
                    $new_facture->user_id = $client->id;
                    if ($hasClientIdColumn) {
                        $new_facture->client_id = $client->id;
                    }
                } else {
                    Log::warning('filament.api.add_commande.no_client_created', [
                        'has_phone' => ! empty($commandeData['livraison_phone'] ?? $commandeData['phone'] ?? null),
                        'has_email' => ! empty($commandeData['livraison_email'] ?? $commandeData['email'] ?? null),
                    ]);
                }
            }

            $new_facture->livraison_nom = $commandeData['livraison_nom'] ?? null;
            $new_facture->livraison_prenom = $commandeData['livraison_prenom'] ?? null;
            $new_facture->livraison_email = $commandeData['livraison_email'] ?? null;
            $new_facture->livraison_phone = $commandeData['livraison_phone'] ?? null;
            $new_facture->livraison_region = $commandeData['livraison_region'] ?? null;
            $new_facture->livraison_ville = $commandeData['livraison_ville'] ?? null;
            $new_facture->livraison_code_postale = $commandeData['livraison_code_postale'] ?? null;
            $new_facture->livraison_adresse1 = $commandeData['livraison_adresse1'] ?? null;
            $new_facture->livraison_adresse2 = $commandeData['livraison_adresse2'] ?? null;
            $new_facture->etat = Commande::STATUS_NEW;
            $new_facture->order_token = bin2hex(random_bytes(32));

            // Atomic order number via number_sequences table (lockForUpdate, no race condition)
            $year = (int) date('Y');
            $nextNum = \App\Models\NumberSequence::getNextFor('CMD', $year);
            $new_facture->numero = $year . '/' . str_pad((string) $nextNum, 4, '0', STR_PAD_LEFT);

            $new_facture->save();

            // CRIT-03: Load products and use server-side prices only
            $productIds = array_unique(array_column($request->panier, 'produit_id'));
            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

            // CRIT-06: Atomic stock decrement — decrement before creating details
            foreach ($request->panier as $panier) {
                $produitId = (int) $panier['produit_id'];
                $qte = (int) $panier['quantite'];
                $affected = Product::where('id', $produitId)
                    ->where('qte', '>=', $qte)
                    ->decrement('qte', $qte);
                if ($affected === 0) {
                    $product = $products->get($produitId);
                    $name = $product?->designation_fr ?? 'produit';
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json([
                            'message' => 'Stock insuffisant pour "' . $name . '" (demandé: ' . $qte . ').',
                            'alert-type' => 'error',
                        ], 422)
                    );
                }
            }

            // Keep the derived rupture flag consistent with stock: decrement() above
            // bypasses the Product saving hook, so a product that just hit 0 would keep
            // rupture=false ("en stock") until re-saved. Sync it now so admin + storefront
            // + JSON-LD agree. force_out_of_stock products are already rupture=true.
            Product::whereIn('id', $productIds)->where('qte', '<=', 0)->update(['rupture' => true]);

            // Add order items with server-side prices only (CRIT-03)
            $all_price_ht = 0;
            foreach ($request->panier as $panier) {
                $product = $products->get((int) $panier['produit_id']);
                $prix_unitaire = $product ? $product->getEffectiveUnitPrice() : 0;

                $new_details = new CommandeDetail();
                $new_details->produit_id = $panier['produit_id'];
                $new_details->qte = $panier['quantite'];
                $new_details->prix_unitaire = $prix_unitaire;

                $the_price_ht = $panier['quantite'] * $prix_unitaire;
                $new_details->prix_ht = $the_price_ht;
                $new_details->prix_ttc = $the_price_ht;
                $new_details->commande_id = $new_facture->id;
                $all_price_ht += $the_price_ht;

                $new_details->save();
            }

            // Calculate totals
            $new_facture->prix_ht = $all_price_ht;
            // Shipping fee is never trusted negative (validated min:0, clamped here too).
            $frais_livraison = max(0, (float) ($new_facture->frais_livraison ?? 0));
            $new_facture->frais_livraison = $frais_livraison;
            $discount_ht = 0.0;
            $discount_ttc = null;

            // Re-validate coupon server-side (do not trust frontend)
            $coupon_code = $request->input('coupon_code');
            if ($coupon_code && Schema::hasColumn($new_facture->getTable(), 'coupon_id')) {
                $client_id = $new_facture->client_id ?? $new_facture->user_id;
                $result = $couponService->validateCoupon(
                    $coupon_code,
                    $all_price_ht,
                    $client_id ? (int) $client_id : null,
                    $new_facture->livraison_phone ?? $new_facture->phone,
                    $new_facture->livraison_email ?? $new_facture->email
                );
                if ($result['valid'] && $result['coupon']) {
                    $coupon = $result['coupon'];
                    $disc = $couponService->computeDiscount($coupon, $all_price_ht, $frais_livraison);
                    $discount_ht = $disc['discount_ht'];
                    $discount_ttc = $disc['discount_ttc'];
                    $new_facture->coupon_id = $coupon->id;
                    $new_facture->coupon_code_snapshot = $coupon->code;
                    $new_facture->coupon_type_snapshot = $coupon->type;
                    $new_facture->coupon_value_snapshot = $coupon->value;
                    $new_facture->discount_ht = $discount_ht;
                    $new_facture->discount_ttc = $discount_ttc;
                    $free_shipping = $couponService->isFreeShipping($coupon);
                    if ($free_shipping) {
                        $frais_livraison = 0;
                        $new_facture->frais_livraison = 0;
                    }
                }
            }

            // ── Pack (bundle) discount — opt-in, amount derived server-side ──────
            // A forged pack_discount flag can at most grant the honest tier
            // discount the SERVER-computed subtotal already qualifies for.
            $packDiscountHt = 0.0;
            if ($request->boolean('pack_discount')) {
                $packDiscountHt = app(PackDiscountService::class)->amountForSubtotal($all_price_ht);
            }

            // ── Points redemption — opt-in, AUTHENTICATED token owner only ──────
            // Order: subtotal -> coupon -> pack -> points. Points are capped at
            // 50% of the post-coupon-post-pack HT base. Bound to the token owner
            // ($authUser), never a client-supplied user_id (points are money).
            // The balance row is LOCKED before we compute the discount and stays
            // locked (same transaction) through the consume, so two concurrent
            // checkouts cannot double-spend the same points.
            $pointsDiscountHt = 0.0;
            $requestedPoints = (int) $request->input('points_to_redeem', 0);
            $baseAfter = max(0, $all_price_ht - $discount_ht - $packDiscountHt);

            if ($requestedPoints > 0) {
                if (! $authUser) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Veuillez vous reconnecter pour utiliser vos points de fidélité.'], 422)
                    );
                }

                $lockedUser = User::whereKey($authUser->getKey())->lockForUpdate()->first();
                $lockedBalance = (int) ($lockedUser->points_balance ?? 0);
                if ($requestedPoints > $lockedBalance) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Points insuffisants'], 422)
                    );
                }

                $pointsService = app(PointsService::class);
                [$pointsConsumed, $pointsDiscountHt] = $pointsService->computeRedemption(
                    $lockedBalance,
                    $requestedPoints,
                    $baseAfter
                );

                if ($pointsConsumed > 0) {
                    // Consume from the SAME locked balance (record() re-locks the
                    // already-locked row within this transaction → consistent).
                    $pointsService->record(
                        $authUser,
                        'redeem',
                        -$pointsConsumed,
                        'Points utilisés sur commande ' . $new_facture->numero,
                        $new_facture->id
                    );
                }
            }

            $totalDiscountHt = $discount_ht + $packDiscountHt + $pointsDiscountHt;

            // remise holds the pack+points discount; coupon stays in its own snapshot fields.
            $new_facture->remise = round($packDiscountHt + $pointsDiscountHt, 3);
            if (Schema::hasColumn($new_facture->getTable(), 'discount_amount')) {
                $new_facture->discount_amount = round($totalDiscountHt, 3);
            }
            // Floor the FINAL total at 0 (frais already clamped >= 0 above).
            $new_facture->prix_ttc = max(0, max(0, $all_price_ht - $totalDiscountHt) + $frais_livraison);

            $new_facture->save();

            // Create redemption record when coupon was applied (including free_shipping with 0 discount_ht)
            if ($new_facture->coupon_id) {
                $redemption = new CouponRedemption();
                $redemption->coupon_id = $new_facture->coupon_id;
                $redemption->order_id = $new_facture->id;
                $redemption->client_id = $new_facture->client_id ?? $new_facture->user_id;
                $redemption->phone_snapshot = $new_facture->livraison_phone ?? $new_facture->phone;
                $redemption->email_snapshot = $new_facture->livraison_email ?? $new_facture->email;
                $redemption->discount_amount_ht = $discount_ht;
                $redemption->discount_amount_ttc = $discount_ttc;
                $redemption->save();
            }

            return $new_facture;
        });

        $commande = $new_facture->fresh(['details.product']);

        // NOTE: loyalty points are EARNED on delivery (when etat becomes "livree"),
        // not at order creation — these are cash-on-delivery orders, so crediting
        // points before the customer has paid/received would let a place-then-cancel
        // loop farm points. See App\Observers\CommandeObserver::updated() ->
        // PointsService::syncOnStatusChange(). Redeemed points are refunded there
        // too if the order is later cancelled/returned.

        // ── Send SMS ──────────────────────────────────────────────────────────────
        try {
            $phone = $commande->phone ?? $commande->livraison_phone ?? null;
            if ($phone && ! empty(trim((string) $phone))) {
                $nom    = trim(($commande->nom ?: $commande->livraison_nom ?: ''));
                $prenom = trim(($commande->prenom ?: $commande->livraison_prenom ?: ''));
                $numero = (string) ($commande->numero ?? '');
                $total  = number_format((float) ($commande->prix_ttc ?? 0), 3, '.', ' ');

                $msg = Message::getCached();
                $template = $msg ? trim((string) ($msg->msg_passez_commande ?? '')) : '';

                $commande->loadMissing('details.product:id,designation_fr');
                $products = $commande->details
                    ->take(4)
                    ->map(fn ($d) => $d->product->designation_fr ?? 'Produit')
                    ->filter()
                    ->implode(', ');
                $more = $commande->details->count() > 4
                    ? ' (+' . ($commande->details->count() - 4) . ')'
                    : '';
                $productsText = trim($products . $more);
                $etatLabel = Commande::getStatusLabel((string) ($commande->etat ?? 'nouvelle_commande'));

                if ($template !== '') {
                    // Admin template: [nom], [prenom], [num_commande], [etat], [produits], [total]
                    $sms = str_replace(
                        ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
                        [$nom, $prenom, $numero, $etatLabel, $productsText, $total],
                        $template
                    );
                } else {
                    // Built-in rich fallback
                    $productNames = $commande->details
                        ->take(3)
                        ->map(fn ($d) => $d->product->designation_fr ?? 'Produit')
                        ->implode(', ');
                    $hasMore = $commande->details->count() > 3
                        ? ' (+' . ($commande->details->count() - 3) . ')'
                        : '';

                    $greeting = $nom ? "Bonjour {$nom}" : 'Bonjour';
                    $sms  = "{$greeting}, votre commande #{$numero} est confirmée ✅\n";
                    $sms .= "Produits: {$productNames}{$hasMore}\n";
                    $sms .= "Total: {$total} TND\n";
                    $sms .= "Merci pour votre confiance 🙌";
                }

                if (! empty(trim($sms))) {
                    app(SmsService::class)->send_sms($phone, $sms);
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send order SMS', [
                'commande_id' => $commande->id,
                'error'       => $e->getMessage(),
            ]);
        }

        // ── Send emails ───────────────────────────────────────────────────────────
        try {
            $adminEmailsRaw = config('mail.admin_emails', config('mail.username', 'admin@protein.tn'));
            $adminEmails = is_array($adminEmailsRaw)
                ? array_filter(array_map('trim', $adminEmailsRaw))
                : array_filter(array_map('trim', explode(',', (string) $adminEmailsRaw)));
            foreach ($adminEmails as $adminEmail) {
                Mail::to($adminEmail)->send(new OrderConfirmedAdminMail($commande));
            }

            $clientEmail = $commande->email ?? $commande->livraison_email ?? null;
            if ($clientEmail && filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
                Mail::to($clientEmail)->send(new OrderConfirmedCustomerMail($commande));
            }
        } catch (\Exception $e) {
            Log::error('Failed to send order email', [
                'commande_id' => $commande->id,
                'error'       => $e->getMessage(),
            ]);
        }

        return response()->json([
            'id'         => $new_facture->id,
            'message'    => 'Merci pour votre commande',
            'alert-type' => 'success',
        ], 201);
    }

    /**
     * Get commande details (API).
     * CRIT-04: Protected — requires auth or email/phone match for guest.
     */
    public function details(Request $request, int $id): JsonResponse
    {
        $facture = Commande::select(
            'id', 'numero', 'nom', 'prenom', 'email', 'phone', 'region', 'ville', 'etat',
            'prix_ht', 'prix_ttc', 'frais_livraison', 'created_at',
            'coupon_code_snapshot', 'discount_ht', 'discount_ttc',
            'user_id', 'client_id', 'livraison_email', 'livraison_phone'
        )->find($id);

        if (! $facture) {
            return response()->json(['error' => 'Commande introuvable'], 404);
        }

        $authorized = false;

        if ($request->user()) {
            $userId = $request->user()->id;
            $authorized = $facture->user_id == $userId || $facture->client_id == $userId;
        }

        if (! $authorized) {
            $token = trim((string) $request->query('token', ''));
            if ($token !== '') {
                $storedToken = Commande::where('id', $id)->value('order_token');
                if ($storedToken && hash_equals($storedToken, $token)) {
                    $authorized = true;
                }
            }
        }

        if (! $authorized) {
            $email = trim((string) $request->query('email', ''));
            $phone = trim((string) $request->query('phone', ''));
            $orderEmail = $facture->livraison_email ?? $facture->email ?? '';
            $orderPhone = $facture->livraison_phone ?? $facture->phone ?? '';
            if ($email !== '' && strtolower($email) === strtolower($orderEmail)) {
                $authorized = true;
            }
            if (! $authorized && $phone !== '') {
                $norm = fn ($s) => preg_replace('/\D/', '', $s);
                $last8 = fn ($s) => strlen($s) >= 8 ? substr($s, -8) : $s;
                if ($last8($norm($phone)) === $last8($norm($orderPhone))) {
                    $authorized = true;
                }
            }
        }

        if (! $authorized) {
            return response()->json(['error' => 'Accès non autorisé'], 403);
        }

        $details_facture = CommandeDetail::where('commande_id', $id)
            ->select('id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc')
            ->with('product:id,designation_fr,cover,prix,promo')
            ->get();

        return response()->json(['facture' => $facture, 'details_facture' => $details_facture]);
    }
}
