<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affilie;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Client;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Product;
use App\Models\User;
use App\Services\ClientService;
use App\Services\CheckoutPricingService;
use App\Services\CouponService;
use App\Services\PackDiscountService;
use App\Services\PointsService;
use App\Services\OrderConfirmationDispatcher;
use App\Services\WelcomeBonusService;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;

class CommandeController extends Controller
{
    /** Same bucket and ceiling as CouponController::apply, so no endpoint is a cheaper code-guessing tool. */
    private const COUPON_ATTEMPTS_PER_MINUTE = 10;

    private static function couponLimiterKey(Request $request): string
    {
        return 'coupon-apply:' . ($request->ip() ?? 'guest');
    }

    private function couponByCode(string $code): ?Coupon
    {
        return Coupon::whereRaw('UPPER(TRIM(code)) = ?', [app(CouponService::class)->normalizeCode($code)])->first();
    }

    /** Two decimals with a dot, the way the storefront prints totals (toFixed(2)). */
    private static function formatDt(float|int|string $dt): string
    {
        return number_format((float) $dt, 2, '.', '');
    }

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
     *
     * Customer/admin email and SMS are dispatched only after the transaction commits. Production
     * has a supervised Redis worker, so checkout latency is no longer coupled to WinSMS or SMTP.
     * Each notification job owns an idempotency key in notification_deliveries.
     */
    public function storeCommandeApi(Request $request): JsonResponse
    {
        $request->validate([
            'commande'          => ['required', 'array'],
            'commande.phone'    => ['nullable', 'string', 'max:20'],
            'commande.email'    => ['nullable', 'email', 'max:255'],
            'commande.nom'      => ['nullable', 'string', 'max:255'],
            'commande.prenom'   => ['nullable', 'string', 'max:255'],
            // Storefront checkout uses one full-name field. Legacy split-name columns remain
            // supported, with the full value stored in livraison_nom/nom.
            'commande.livraison_nom'    => ['required', 'string', 'max:255'],
            'commande.livraison_prenom' => ['nullable', 'string', 'max:255'],
            'commande.livraison_phone'  => ['required', 'string', 'max:20', 'regex:/^(?:(?:\+|00)216[\s-]?)?[2-9](?:[\s-]?\d){7}$/'],
            'commande.livraison_email'  => ['nullable', 'email', 'max:255'],
            'commande.region'   => ['nullable', 'string', 'max:255'],
            // There is no pickup flow: every order is shipped, so the only accepted value is 1. A
            // crafted 0 used to zero the delivery fee; an array used to 500.
            'commande.livraison' => ['nullable', 'in:1'],
            'commande.frais_livraison' => ['nullable', 'numeric', 'min:0'], // accepted for old clients, ignored: the server sets shipping
            'panier'            => ['required', 'array', 'min:1'],
            'panier.*.produit_id'    => ['required', 'integer', 'exists:products,id'],
            'panier.*.arome'         => ['nullable', 'string', 'max:191'],
            'panier.*.quantite'      => ['required', 'integer', 'min:1'],
            'panier.*.prix_unitaire' => ['nullable', 'numeric', 'min:0'], // CRIT-03: ignored; server uses DB price
            'coupon_code'       => ['nullable', 'string', 'max:64'],
            'pack_discount'     => ['nullable', 'boolean'],   // opt-in; amount computed server-side
            'points_to_redeem'  => ['nullable', 'integer', 'min:0'], // validated <= balance & cap
            'expected_total' => ['nullable', 'numeric', 'min:0'],
            /*
             * Affiliate attribution — a hostname LABEL (`ali` for a visit that began on
             * ali.protein.tn), never an id. The storefront proxy injects it from an HttpOnly
             * cookie and discards whatever the browser sent; this controller then resolves it
             * again below. There is deliberately NO `affilie_id` key: the moment a browser can
             * name a row by number, the resolution below is decoration.
             */
            'affiliate_subdomain' => ['nullable', 'string', 'max:32', 'regex:'.Affilie::SUBDOMAIN_PATTERN],
        ]);

        $commandeData = $request->commande;

        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));
        if ($idempotencyKey !== '' && ! preg_match('/^[A-Za-z0-9._:-]{16,100}$/', $idempotencyKey)) {
            return response()->json(['message' => 'Clé de commande invalide.'], 422);
        }
        /*
         * `affiliate_subdomain` is IN THE HASH. It changes who gets paid for this order, so two
         * requests that differ only by attribution are not the same order — and the replay branch
         * below returns the FIRST order for a repeated key, which would otherwise silently keep
         * the first attribution while reporting success for the second.
         */
        $payloadHash = hash('sha256', (string) json_encode($request->only([
            'commande', 'panier', 'coupon_code', 'pack_discount', 'points_to_redeem',
            'affiliate_subdomain',
        ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        if ($idempotencyKey !== '') {
            $existing = Commande::where('checkout_idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                if ($existing->checkout_payload_hash && ! hash_equals($existing->checkout_payload_hash, $payloadHash)) {
                    return response()->json([
                        'message' => 'Cette clé de commande a déjà été utilisée avec un panier différent.',
                    ], 409);
                }

                return $this->orderCreatedResponse($existing, true);
            }
        }

        // The authenticated token owner (or null for guests). The ONLY identity
        // allowed to earn or spend loyalty points.
        $authUser = $this->resolveTokenUser($request);

        Log::info('filament.api.add_commande.start', ['payload_keys' => array_keys($commandeData ?? [])]);

        /*
         * The 409 below returns the server pricing without creating anything, so with a deliberately
         * wrong expected_total this endpoint would answer "is this code valid?" for free. It shares
         * the coupon-apply bucket: refused (nothing written) once that bucket is spent, and an
         * unknown code costs one attempt (after the transaction, so a rollback cannot undo it).
         */
        $couponLimiterKey = self::couponLimiterKey($request);
        if (trim((string) $request->input('coupon_code', '')) !== ''
            && RateLimiter::tooManyAttempts($couponLimiterKey, self::COUPON_ATTEMPTS_PER_MINUTE)) {
            return response()->json([
                'message' => 'Trop de tentatives de code promo. Patientez une minute, puis confirmez à nouveau votre commande.',
            ], 422);
        }
        $couponGuessMissed = false;

        $couponService = app(CouponService::class);
        $pricingForResponse = null;
        try {
            $new_facture = DB::transaction(function () use ($commandeData, $request, $couponService, $authUser, $idempotencyKey, $payloadHash, &$pricingForResponse, &$couponGuessMissed) {
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
            // Always home delivery until a real, server-validated pickup mode exists (see price() below).
            $new_facture->livraison = 1;
            $new_facture->note = $commandeData['note'] ?? null;

            // ── Order attribution ───────────────────────────────────────────────
            // A valid Sanctum token is the ONLY trusted identity. When present the
            // order belongs to the token owner — never to a client-supplied
            // user_id (that would be an IDOR: attaching an order, and any points
            // side-effects, to an arbitrary account).
            $hasClientIdColumn = Schema::hasColumn($new_facture->getTable(), 'client_id');
            $client = app(ClientService::class)->findOrCreateClientFromDeliveryInfo($commandeData, $authUser);

            if ($client && $hasClientIdColumn) {
                $new_facture->client_id = $client->id;
                Log::info('filament.api.add_commande.client_linked', ['client_id' => $client->id]);
            }

            if ($authUser) {
                // user_id is the authenticated storefront User. client_id is the matching
                // back-office Client. They are different tables and their numeric ids must
                // never be copied into one another.
                $new_facture->user_id = $authUser->id;
                $new_facture->authenticated_user_id = $authUser->id;
            } elseif ($client) {
                // Preserve the historic back-office convention for guest orders only. Never trust
                // commande.user_id from the browser: it could attach an order to another account.
                $new_facture->user_id = $client->id;
                $new_facture->authenticated_user_id = 0;
            } else {
                $new_facture->authenticated_user_id = 0;
                Log::warning('filament.api.add_commande.no_client_created', [
                    'has_phone' => ! empty($commandeData['livraison_phone'] ?? $commandeData['phone'] ?? null),
                    'has_email' => ! empty($commandeData['livraison_email'] ?? $commandeData['email'] ?? null),
                ]);
            }

            /*
             * ── AFFILIATE ATTRIBUTION — RESOLVED HERE, NEVER ACCEPTED ───────────────────────
             *
             * The request carries a hostname LABEL: `ali`, because the visit started on
             * ali.protein.tn and the storefront proxy copied it out of an HttpOnly cookie. This is
             * the same posture resolveTokenUser() sets for identity a few lines above — the client
             * names a thing, the server decides what that name means, and the server's answer is
             * the only one written.
             *
             * `Affilie::resolveActiveBySubdomain()` re-normalises, re-validates against the
             * reserved list, and requires status=active, so a forged cookie can at best name an
             * affiliate who already exists and is already being paid. It can never name a row by
             * id: no `affilie_id` key is validated, and this controller assigns every column
             * explicitly rather than mass-assigning, so an extra key in the body reaches nothing.
             *
             * NO COMMISSION IS ACCRUED HERE, deliberately. These are cash-on-delivery orders and
             * the ledger is gated on delivery for the same reason loyalty points are: crediting at
             * order time would let a place-then-cancel loop farm commission, which is worth more
             * money than farming points. This writes the LINK only; the accrual belongs to the
             * observer that watches `etat` reach a PointsService::DELIVERED_STATUSES value.
             */
            $affiliateSubdomain = $request->input('affiliate_subdomain');
            if (filled($affiliateSubdomain) && Schema::hasColumn($new_facture->getTable(), 'affilie_id')) {
                $affilie = Affilie::resolveActiveBySubdomain((string) $affiliateSubdomain);
                if ($affilie !== null) {
                    $new_facture->affilie_id = $affilie->id;
                    Log::info('filament.api.add_commande.affilie_attributed', [
                        'affilie_id' => $affilie->id,
                        'subdomain' => Affilie::normalizeSubdomain((string) $affiliateSubdomain),
                    ]);
                } else {
                    // An unknown or deactivated subdomain is a NORMAL outcome, not an error: the
                    // cookie outlives the affiliate by up to 30 days. The order is created
                    // unattributed and the customer notices nothing.
                    Log::info('filament.api.add_commande.affilie_unresolved', [
                        'subdomain' => Affilie::normalizeSubdomain((string) $affiliateSubdomain),
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
            if ($idempotencyKey !== '') {
                $new_facture->checkout_idempotency_key = $idempotencyKey;
                $new_facture->checkout_payload_hash = $payloadHash;
            }

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
                $new_details->arome = $panier['arome'] ?? null;
                $new_details->prix_unitaire = $prix_unitaire;

                $the_price_ht = $panier['quantite'] * $prix_unitaire;
                $new_details->prix_ht = $the_price_ht;
                $new_details->prix_ttc = $the_price_ht;
                $new_details->commande_id = $new_facture->id;
                $all_price_ht += $the_price_ht;

                $new_details->save();
            }

            // Re-validate the coupon against server-priced goods.
            $coupon = null;
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
                } elseif ($this->couponByCode((string) $coupon_code) === null) {
                    // Only a code that does not exist counts as a guess: a real code that is expired,
                    // below its minimum or used up is what an honest customer sends, and every
                    // storefront order reaches us from the same proxy IP.
                    $couponGuessMissed = true;
                }
            }
            $requestedPoints = (int) $request->input('points_to_redeem', 0);
            $lockedBalance = $authUser ? (int) $authUser->points_balance : null;
            if ($requestedPoints > 0) {
                if (! $authUser) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Veuillez vous reconnecter pour utiliser vos Protinas.'], 422)
                    );
                }
                if (! $authUser->hasVerifiedContact()) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Vérifiez votre compte par téléphone ou par email avant d’utiliser vos points.'], 422)
                    );
                }

                $lockedUser = User::whereKey($authUser->getKey())->lockForUpdate()->first();
                $lockedBalance = (int) ($lockedUser->points_balance ?? 0);
                if ($requestedPoints > $lockedBalance) {
                    throw new \Illuminate\Http\Exceptions\HttpResponseException(
                        response()->json(['message' => 'Solde Protina insuffisant'], 422)
                    );
                }

            }

            $pricingLines = [];
            foreach ($request->panier as $line) {
                $product = $products->get((int) $line['produit_id']);
                if ($product) $pricingLines[] = ['product' => $product, 'quantity' => (int) $line['quantite']];
            }
            // homeDelivery is ALWAYS true: no pickup flow exists and nothing downstream (admin,
            // prints, Aramex) reads commandes.livraison. When pickup is built, derive it from a
            // server-validated mode that staff and the courier act on, never from a client flag.
            $pricing = app(CheckoutPricingService::class)->price(
                $pricingLines, $coupon, $request->boolean('pack_discount'), $lockedBalance,
                $requestedPoints, true,
                $authUser ? WelcomeBonusService::pendingPoints($authUser) : 0
            );
            $pricingForResponse = $pricing;
            $expected = $request->input('expected_total');
            if ($expected === null) {
                $this->refuseLegacyClientMismatch($request, $pricing, $requestedPoints, $coupon, $couponService);
            } elseif (abs(CheckoutPricingService::millimes($pricing['total_dt'])
                - CheckoutPricingService::millimes($expected))
                > CheckoutPricingService::millimes(config('loyalty.checkout.total_mismatch_tolerance_dt', 0.01))) {
                // Clients that only show `message` still see the new total; the storefront reads `pricing`.
                throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                    'message' => 'Le total de votre commande a changé : '.self::formatDt($pricing['total_dt'])
                        .' DT à payer à la livraison.',
                    'pricing' => $pricing,
                ], 409));
            }

            $couponApplied = $coupon && $pricing['coupon']['applied'];
            $discount_ht = $couponApplied ? $pricing['coupon']['amount_dt'] : 0.0;
            $discount_ttc = $couponApplied
                ? $couponService->computeDiscount($coupon, $pricing['goods_dt'], $pricing['shipping_dt'])['discount_ttc'] : null;
            if ($couponApplied) {
                $new_facture->coupon_id = $coupon->id;
                $new_facture->coupon_code_snapshot = $coupon->code;
                $new_facture->coupon_type_snapshot = $coupon->type;
                $new_facture->coupon_value_snapshot = $coupon->value;
            }
            $new_facture->prix_ht = $pricing['goods_dt'];
            $new_facture->discount_ht = $discount_ht;
            $new_facture->discount_ttc = $discount_ttc;
            $new_facture->pack_discount_ht = $pricing['pack']['amount_dt'];
            $new_facture->points_discount_ht = $pricing['protinas']['used_dt'];
            $new_facture->points_redeemed = $pricing['protinas']['used_points'];
            $new_facture->remise = round($pricing['pack']['amount_dt'] + $pricing['protinas']['used_dt'], 3);
            if (Schema::hasColumn($new_facture->getTable(), 'discount_amount')) {
                $new_facture->discount_amount = $pricing['total_discount_dt'];
            }
            $new_facture->frais_livraison = $pricing['shipping_dt'];
            $new_facture->prix_ttc = $pricing['total_dt'];
            $new_facture->save();

            if ($pricing['protinas']['used_points'] > 0) {
                app(PointsService::class)->record($authUser, 'redeem', -$pricing['protinas']['used_points'],
                    'Protinas utilisées sur commande ' . $new_facture->numero, $new_facture->id, null,
                    'order:'.$new_facture->id.':redeem');
            }

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
        } catch (QueryException $e) {
            // Two concurrent retries can both pass the early lookup. The unique
            // index chooses one winner; return its order without buying another
            // SMS, decrementing stock again, or creating another loyalty debit.
            if ($idempotencyKey !== '') {
                $existing = Commande::where('checkout_idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    if ($existing->checkout_payload_hash && ! hash_equals($existing->checkout_payload_hash, $payloadHash)) {
                        return response()->json([
                            'message' => 'Cette clé de commande a déjà été utilisée avec un panier différent.',
                        ], 409);
                    }

                    return $this->orderCreatedResponse($existing, true);
                }
            }

            throw $e;
        } finally {
            if ($couponGuessMissed) {
                RateLimiter::hit($couponLimiterKey, 60);
            }
        }

        // NOTE: loyalty points are EARNED on delivery (when etat becomes "livree"),
        // not at order creation — these are cash-on-delivery orders, so crediting
        // points before the customer has paid/received would let a place-then-cancel
        // loop farm points. See App\Observers\CommandeObserver::updated() ->
        // PointsService::syncOnStatusChange(). Redeemed points are refunded there
        // too if the order is later cancelled/returned.

        try {
            app(OrderConfirmationDispatcher::class)->dispatch($new_facture->id);
        } catch (\Throwable $e) {
            // The order is committed and must be returned even if Redis is momentarily unavailable.
            Log::critical('Order confirmation jobs could not be dispatched', [
                'commande_id' => $new_facture->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->orderCreatedResponse($new_facture, false, $pricingForResponse);
    }

    /**
     * A storefront tab built before the server became the only calculator sends no expected_total
     * and computes its own total: Protinas up to 50 % of the goods, coupon AND pack together.
     * price() would then charge more than that tab showed, and the cash-on-delivery courier would
     * collect the difference. Those two cases are refused instead. Called inside the order
     * transaction, so stock, numbering and the client row roll back.
     */
    private function refuseLegacyClientMismatch(
        Request $request,
        array $pricing,
        int $requestedPoints,
        ?Coupon $coupon,
        CouponService $couponService,
    ): void {
        if ($requestedPoints > (int) $pricing['protinas']['used_points']) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                'message' => sprintf(
                    'Vos Protinas sont limitées à %d pts (%s DT) sur cette commande (%d %% des articles). Réduisez-les pour continuer.',
                    (int) $pricing['protinas']['max_usable_points'],
                    self::formatDt($pricing['protinas']['max_usable_dt']),
                    (int) $pricing['ceiling_percent'],
                ),
            ], 422));
        }
        // Catches both outcomes the old tab got wrong: pack better (coupon dropped) and coupon
        // better (pack dropped). A free-shipping coupon is not a goods discount and still combines.
        if ($request->boolean('pack_discount') && $coupon && ! $couponService->isFreeShipping($coupon)
            && (int) $pricing['pack']['percent'] > 0) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                'message' => 'Code promo et remise pack ne se cumulent pas : retirez le code ou la remise pack pour continuer.',
            ], 422));
        }
    }

    /**
     * Public, read-only quote. No Client row, order, stock or ledger mutation.
     *
     * The storefront calls it on load and on every cart, coupon, pack, points or login change, so
     * nothing about the delivery form is required: an empty checkout must still get its total,
     * Protinas maximum and shipping line.
     */
    public function quote(Request $request): JsonResponse
    {
        $request->validate([
            'commande' => ['nullable', 'array'],
            'commande.livraison_nom' => ['nullable', 'string', 'max:255'],
            // The format is only checked when a number is present.
            'commande.livraison_phone' => ['nullable', 'string', 'max:20', 'regex:/^(?:(?:\+|00)216[\s-]?)?[2-9](?:[\s-]?\d){7}$/'],
            'commande.livraison_email' => ['nullable', 'email', 'max:255'],
            'commande.phone' => ['nullable', 'string', 'max:20'],
            'commande.email' => ['nullable', 'email', 'max:255'],
            'commande.livraison' => ['nullable', 'in:1'],
            'commande.frais_livraison' => ['nullable', 'numeric', 'min:0'],
            'panier' => ['required', 'array', 'min:1'],
            'panier.*.produit_id' => ['required', 'integer', 'exists:products,id'],
            'panier.*.quantite' => ['required', 'integer', 'min:1'],
            'panier.*.arome' => ['nullable', 'string', 'max:191'],
            'panier.*.prix_unitaire' => ['nullable', 'numeric', 'min:0'],
            'coupon_code' => ['nullable', 'string', 'max:64'],
            'pack_discount' => ['nullable', 'boolean'],
            'points_to_redeem' => ['nullable', 'integer', 'min:0'],
        ]);
        $authUser = $this->resolveTokenUser($request);
        $requestedPoints = (int) $request->input('points_to_redeem', 0);
        if ($requestedPoints > 0 && ! $authUser) {
            return response()->json(['message' => 'Veuillez vous reconnecter pour utiliser vos Protinas.'], 422);
        }
        if ($requestedPoints > 0 && ! $authUser->hasVerifiedContact()) {
            return response()->json(['message' => 'Vérifiez votre compte par téléphone ou par email avant d’utiliser vos points.'], 422);
        }
        $balance = $authUser ? (int) $authUser->points_balance : null;
        if ($requestedPoints > (int) $balance) {
            return response()->json(['message' => 'Solde Protina insuffisant'], 422);
        }
        $products = Product::whereIn('id', array_column($request->panier, 'produit_id'))->get()->keyBy('id');
        $lines = [];
        foreach ($request->panier as $row) {
            $product = $products->get((int) $row['produit_id']);
            if (! $product) return response()->json(['message' => 'Produit indisponible.'], 422);
            $lines[] = ['product' => $product, 'quantity' => (int) $row['quantite']];
        }
        $goods = 0;
        foreach ($lines as $line) {
            $goods += $line['product']->getEffectiveUnitPrice() * $line['quantity'];
        }
        $coupon = null;
        $couponError = null;
        $couponCode = trim((string) $request->input('coupon_code', ''));
        if ($couponCode !== '') {
            $data = $request->input('commande');
            $data = is_array($data) ? $data : [];
            $limiterKey = self::couponLimiterKey($request);
            if (RateLimiter::tooManyAttempts($limiterKey, self::COUPON_ATTEMPTS_PER_MINUTE)) {
                // Same bucket as /coupons/apply: once it is spent, nothing is validated here either.
                $couponError = 'too_many_attempts';
            } else {
                $known = $this->couponByCode($couponCode);
                // The client id only matters for a per-client usage limit; skip the lookup otherwise.
                // Without any identity validateCoupon() still runs (it handles a null identity).
                $client = $known && $known->usage_limit_per_client !== null
                    ? $this->existingQuoteClient($data, $authUser) : null;
                $result = app(CouponService::class)->validateCoupon($couponCode, $goods, $client?->id,
                    $data['livraison_phone'] ?? $data['phone'] ?? null,
                    $data['livraison_email'] ?? $data['email'] ?? null);
                $coupon = $result['valid'] ? $result['coupon'] : null;
                $couponError = $result['valid'] ? null : $result['message'];
                if (! $result['valid'] && $known === null) {
                    // Re-quoting a real code on every cart change costs nothing; a guess costs one try.
                    RateLimiter::hit($limiterKey, 60);
                }
            }
        }
        // Always home delivery (see storeCommandeApi): commande.livraison never changes shipping.
        $pricing = app(CheckoutPricingService::class)->price($lines, $coupon,
            $request->boolean('pack_discount'), $balance, $requestedPoints, true,
            $authUser ? WelcomeBonusService::pendingPoints($authUser) : 0);
        if ($couponError !== null) {
            $pricing['coupon']['code'] = (string) $couponCode;
            $pricing['coupon']['reason'] = $couponError;
        }
        return response()->json(['pricing' => $pricing]);
    }

    private function existingQuoteClient(array $data, ?User $user): ?Client
    {
        if ($user && Schema::hasColumn('clients', 'user_id')) {
            $mapped = Client::where('user_id', $user->id)->first();
            if ($mapped) return $mapped;
        }
        $email = $user?->email ?: ($data['livraison_email'] ?? $data['email'] ?? null);
        if ($email) {
            $byEmail = Client::whereRaw('LOWER(TRIM(email)) = ?', [strtolower(trim((string) $email))])
                ->when($user && Schema::hasColumn('clients', 'user_id'),
                    fn ($q) => $q->where(fn ($owner) => $owner->whereNull('user_id')->orWhere('user_id', $user->id)))
                ->first();
            if ($byEmail) return $byEmail;
        }
        if ($user) return null;
        $clients = app(ClientService::class);
        $phone = $clients->normalizePhone($data['livraison_phone'] ?? $data['phone'] ?? null);
        if (! $phone) return null;
        // Narrow in SQL (separators stripped, normalized digits as a substring) instead of loading
        // every client with a phone into memory; the exact normalized comparison below still decides.
        $stripped = fn (string $column): string => "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("
            . $column . ", ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', ''), '/', '')";
        $like = '%' . $phone . '%';
        return Client::query()
            ->where(fn ($q) => $q->whereRaw($stripped('phone_1') . ' LIKE ?', [$like])
                ->orWhereRaw($stripped('phone_2') . ' LIKE ?', [$like]))
            ->orderBy('id')
            ->get()
            ->first(fn (Client $c) => $clients->normalizePhone($c->phone_1) === $phone
                || $clients->normalizePhone($c->phone_2) === $phone);
    }

    private function orderCreatedResponse(Commande $commande, bool $replayed = false, ?array $pricing = null): JsonResponse
    {
        return response()->json([
            'id' => $commande->id,
            'numero' => $commande->numero,
            // Only returned to the creator (or an identical idempotent retry). Guests without
            // email need this capability to read their own server-calculated confirmation.
            'order_token' => $commande->order_token,
            'message' => 'Merci pour votre commande',
            'alert-type' => 'success',
            'replayed' => $replayed,
            'pricing' => $pricing ?? $this->storedPricing($commande),
        ], $replayed ? 200 : 201);
    }

    private function storedPricing(Commande $commande): array
    {
        // Replays use immutable order snapshots; never recalculate with current product prices.
        return [
            'goods_dt' => (float) $commande->prix_ht,
            'pack' => ['amount_dt' => (float) $commande->pack_discount_ht],
            'coupon' => ['code' => $commande->coupon_code_snapshot, 'type' => $commande->coupon_type_snapshot,
                'amount_dt' => (float) $commande->discount_ht, 'applied' => $commande->coupon_id !== null],
            'protinas' => ['used_points' => (int) $commande->points_redeemed,
                'used_dt' => (float) $commande->points_discount_ht],
            'shipping_dt' => (float) $commande->frais_livraison,
            'total_discount_dt' => (float) $commande->discount_amount,
            'total_dt' => (float) $commande->prix_ttc,
        ];
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
            'pack_discount_ht', 'points_discount_ht', 'points_redeemed',
            'user_id', 'client_id', 'livraison_email', 'livraison_phone',
            'livraison_nom', 'livraison_prenom', 'livraison_adresse1',
            'livraison_region', 'livraison_ville', 'livraison_code_postale'
        )->find($id);

        if (! $facture) {
            return response()->json(['error' => 'Commande introuvable'], 404);
        }

        $authorized = false;

        if ($request->user()) {
            // Reuse the collision-safe account scope. A raw comparison between commandes.user_id
            // and users.id leaks legacy orders because user_id previously stored Client ids.
            $authorized = Commande::query()
                ->visibleToStorefrontUser($request->user())
                ->whereKey($facture->id)
                ->exists();
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
            // HARDENED: order ids are sequential/enumerable, so the guest fallback now requires
            // BOTH the exact email AND the FULL phone to match (previously email OR last-8-digits,
            // which allowed enumeration). The order_token path above remains the primary guest access.
            if ($email !== '' && $phone !== '') {
                $norm = fn ($s) => preg_replace('/\D/', '', (string) $s);
                $emailMatches = $orderEmail !== '' && strtolower($email) === strtolower($orderEmail);
                $phoneMatches = $orderPhone !== '' && $norm($phone) === $norm($orderPhone);
                if ($emailMatches && $phoneMatches) {
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
