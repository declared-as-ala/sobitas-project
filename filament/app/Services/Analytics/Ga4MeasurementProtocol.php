<?php

namespace App\Services\Analytics;

use App\Jobs\SendGa4PurchaseJob;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\NotificationDelivery;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * GA4 Measurement Protocol `purchase` for storefront orders the browser could not report.
 *
 * The storefront sends `purchase` from gtag.js and adds `ga: {client_id, session_id, gtag_loaded}`
 * to every POST /api/add_commande body. `gtag_loaded` is the browser's own answer, taken when the
 * order button was pressed, to "did gtag.js boot in this page?". When it is false, mode `fallback`
 * (the default) sends the purchase from here, under the shopper's real `_ga` client id when the
 * cookie survives from an earlier visit. The `_ga` cookie is
 * not that signal: it outlives an ad blocker installed later (the purchase was lost on both sides)
 * and is absent when gtag.js runs with cookies refused (it was counted twice). Bodies from bundles
 * older than `gtag_loaded` keep the cookie rule: `client_id: null` means gtag.js never ran. Mode
 * `always` sends every storefront order server-side. Either way, a queued send is reported back in
 * the order response (`ga4_server_purchase: true`, repeated on an idempotent replay) and the browser
 * then skips its own purchase. A debug-mode send only validates, so it is never reported back.
 *
 * INERT until services.ga4.measurement_id AND services.ga4.api_secret are both set.
 *
 * Only storefront orders are sent: they are the only ones carrying checkout_idempotency_key (both Next
 * proxies send an Idempotency-Key). Affiliate-desk, Filament-manual and quotation orders never are.
 *
 * NO PERSONAL DATA leaves through here: the payload carries the order number, money, coupon code and
 * catalogue facts. Never a name, email, phone, address or user id.
 */
class Ga4MeasurementProtocol
{
    public const MODE_OFF = 'off';
    public const MODE_FALLBACK = 'fallback';
    public const MODE_ALWAYS = 'always';

    public const COLLECT_URL = 'https://www.google-analytics.com/mp/collect';
    public const DEBUG_COLLECT_URL = 'https://www.google-analytics.com/debug/mp/collect';

    /** gtag's client id is "<random>.<first-visit unix seconds>", read from the `_ga` cookie. */
    private const CLIENT_ID_PATTERN = '/^\d{1,20}\.\d{1,20}$/';

    private const SESSION_ID_PATTERN = '/^\d{1,20}$/';

    /** GA4 accepts events back-dated by up to 72 hours; older ones are sent without a timestamp. */
    private const MAX_BACKDATE_SECONDS = 72 * 3600;

    /** GA4 truncates or drops parameter values longer than 100 characters. */
    private const MAX_PARAM_LENGTH = 100;

    /** GA4 accepts at most 200 items per event. */
    private const MAX_ITEMS = 200;

    /**
     * Set when a real (non-debug) send is queued, so an idempotent replay of the order can repeat
     * `ga4_server_purchase` before the job has run. Once it has, the ledger row says the same.
     */
    private const SERVER_PURCHASE_CACHE_PREFIX = 'ga4:server_purchase:';

    public function measurementId(): string
    {
        return trim((string) config('services.ga4.measurement_id', ''));
    }

    public function mode(): string
    {
        $mode = strtolower(trim((string) config('services.ga4.mode', self::MODE_FALLBACK)));

        // A typo must not turn the send on in an unexpected way: anything unknown is off.
        return in_array($mode, [self::MODE_FALLBACK, self::MODE_ALWAYS], true) ? $mode : self::MODE_OFF;
    }

    public function debug(): bool
    {
        return (bool) config('services.ga4.debug', false);
    }

    public function enabled(): bool
    {
        return $this->measurementId() !== ''
            && $this->apiSecret() !== ''
            && $this->mode() !== self::MODE_OFF;
    }

    /**
     * The endpoint WITH the measurement id and the secret in its query string. The caller must never
     * log it, put it in an exception message or store it.
     */
    public function collectUrl(?bool $debug = null): string
    {
        $debug ??= $this->debug();

        return ($debug ? self::DEBUG_COLLECT_URL : self::COLLECT_URL).'?'.http_build_query([
            'measurement_id' => $this->measurementId(),
            'api_secret' => $this->apiSecret(),
        ]);
    }

    /** Removes the API secret (and any api_secret= query value) from a message before it is logged or stored. */
    public function redact(string $message): string
    {
        $secret = $this->apiSecret();
        if ($secret !== '') {
            $message = str_replace([$secret, rawurlencode($secret), urlencode($secret)], '[redacted]', $message);
        }

        return (string) preg_replace('/api_secret=[^&\s"\']*/i', 'api_secret=[redacted]', $message);
    }

    /**
     * The once-only ledger key (notification_deliveries.event_key) of one order's send. A debug
     * validation run has its own key, so it never occupies the real purchase's claim.
     */
    public static function ledgerKey(int $commandeId, bool $debug = false): string
    {
        return ($debug ? 'ga4:purchase-debug:' : 'ga4:purchase:').$commandeId;
    }

    /**
     * Called by CommandeController::storeCommandeApi() after the order committed (never on an
     * idempotent replay). Sanitises `ga` instead of rejecting it: analytics must never cost an order.
     *
     * Returns true when the server-side send was queued. The order response then says so
     * (`ga4_server_purchase`) and the browser does not send its own `purchase`, so each order reaches
     * GA4 exactly once whatever the mode, the config, or how well the browser detected gtag.js.
     * A replay of the order repeats the flag (see serverReported()).
     *
     * In debug mode the send is still queued, so the validation runs, but this returns false: the
     * /debug/mp/collect endpoint records nothing, so the browser must keep reporting the purchase.
     *
     * @param  bool  $gaKeyPresent  whether the body carried a `ga` key at all (old cached frontends send none)
     * @param  mixed  $ga  the raw `ga` value from the body
     */
    public function maybeQueuePurchase(Commande $order, bool $gaKeyPresent, mixed $ga): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        // Storefront orders only: nothing else carries a checkout idempotency key.
        if (trim((string) $order->checkout_idempotency_key) === '') {
            return false;
        }

        $clientId = null;
        $sessionId = null;
        $browserHadNoGtag = false;
        if (is_array($ga)) {
            $clientId = self::sanitizeClientId($ga['client_id'] ?? null);
            $sessionId = self::sanitizeSessionId($ga['session_id'] ?? null);
            if (array_key_exists('gtag_loaded', $ga) && is_bool($ga['gtag_loaded'])) {
                // The browser's own answer: false means it did not send the purchase (ga4.ts).
                $browserHadNoGtag = $ga['gtag_loaded'] === false;
            } else {
                // Bundles older than `gtag_loaded`: exactly `client_id: null` means gtag.js never ran.
                // A malformed or non-null value means it did, so the browser reported it itself.
                $browserHadNoGtag = array_key_exists('client_id', $ga) && $ga['client_id'] === null;
            }
        }

        // enabled() leaves only `fallback` or `always`. In `fallback`, no `ga` key means an old cached
        // frontend, which still sends the browser purchase itself.
        if ($this->mode() === self::MODE_FALLBACK && ! ($gaKeyPresent && $browserHadNoGtag)) {
            return false;
        }

        // Same convention as OrderConfirmationDispatcher: dispatched after the order transaction
        // committed, on the default queue.
        // The debug flag is pinned at dispatch: a job queued for validation never becomes a real send
        // (or the reverse) because the config changed before a worker picked it up.
        $debug = $this->debug();
        SendGa4PurchaseJob::dispatch(
            (int) $order->id,
            $clientId ?? self::placeholderClientId($order),
            $sessionId,
            $debug,
        );

        if ($debug) {
            return false;
        }

        try {
            Cache::put(self::SERVER_PURCHASE_CACHE_PREFIX.$order->id, true, now()->addDays(7));
        } catch (\Throwable $e) {
            // The send is queued either way; only a replay before the job runs would miss the flag.
            Log::warning('GA4 server purchase marker could not be cached', ['commande_id' => $order->id, 'error' => $e->getMessage()]);
        }

        return true;
    }

    /**
     * Whether the server took over this order's real `purchase`: it queued the send, or the job has
     * already claimed the ledger. Read by the idempotent replay branches, so a retry after a lost
     * response repeats `ga4_server_purchase` and the browser does not send the purchase a second time.
     * Never throws: a replay must return the order whatever the cache or the ledger does.
     */
    public function serverReported(Commande $order): bool
    {
        try {
            if (Cache::get(self::SERVER_PURCHASE_CACHE_PREFIX.$order->id) === true) {
                return true;
            }

            return NotificationDelivery::where('event_key', self::ledgerKey((int) $order->id))->exists();
        } catch (\Throwable $e) {
            Log::warning('GA4 server purchase state could not be read', ['commande_id' => $order->id, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * The Measurement Protocol body for one order.
     *
     * value = item revenue without shipping (GA4 ecommerce guidance), the same formula the browser
     * uses (total − shipping), so both sources agree.
     *
     * @return array<string, mixed>
     */
    public function purchasePayload(Commande $order, string $clientId, ?string $sessionId): array
    {
        $items = [];
        foreach ($this->lineItems((int) $order->id) as $detail) {
            $items[] = $this->item($detail);
            if (count($items) >= self::MAX_ITEMS) {
                break;
            }
        }

        $prixTtc = (float) $order->prix_ttc;
        $shipping = (float) $order->frais_livraison;

        $params = [
            'transaction_id' => (string) ($order->numero ?: $order->id),
            'value' => round(max(0, $prixTtc - $shipping), 3),
            'currency' => 'TND',
            'tax' => 0,
            'shipping' => round($shipping, 3),
        ];

        $coupon = self::text($order->coupon_code_snapshot);
        if ($order->coupon_id !== null && $coupon !== '') {
            $params['coupon'] = $coupon;
        }

        if ($sessionId !== null && $sessionId !== '') {
            $params['session_id'] = $sessionId;
            $params['engagement_time_msec'] = 1;
        }

        $params['items'] = $items;

        $payload = ['client_id' => $clientId];

        $createdAt = $order->created_at;
        if ($createdAt !== null) {
            $age = now()->getTimestamp() - $createdAt->getTimestamp();
            if ($age >= 0 && $age <= self::MAX_BACKDATE_SECONDS) {
                $payload['timestamp_micros'] = $createdAt->getTimestamp() * 1000000;
            }
        }

        $payload['events'] = [[
            'name' => 'purchase',
            'params' => $params,
        ]];

        return $payload;
    }

    /**
     * The order's line items with the same columns and relations as CommandeController::details(),
     * so the server-side event names products exactly as the browser one does: item_name is the
     * squished designation capped at 100 characters on both sides (see the storefront's
     * src/lib/analytics/ga4Items.ts). Change one and GA4 splits every product into two item rows.
     *
     * @return Collection<int, CommandeDetail>
     */
    private function lineItems(int $commandeId): Collection
    {
        $columns = ['id', 'commande_id', 'produit_id', 'qte', 'prix_unitaire', 'prix_ht', 'prix_ttc'];
        if (Schema::hasColumn('commande_details', 'arome')) {
            $columns[] = 'arome';
        }

        return CommandeDetail::where('commande_id', $commandeId)
            ->select($columns)
            ->with([
                'product:id,designation_fr,slug,cover,prix,promo,brand_id,sous_categorie_id',
                'product.brand:id,designation_fr',
                'product.sousCategorie:id,designation_fr,slug,categorie_id',
                'product.sousCategorie.categorie:id,designation_fr',
            ])
            ->orderBy('id')
            ->get();
    }

    /** @return array<string, string|int|float> */
    private function item(CommandeDetail $detail): array
    {
        $product = $detail->product;
        $subCategory = $product?->sousCategorie;
        $category = $subCategory?->categorie;

        // The real name, never "Produit N": designation, else slug, else the id.
        $name = self::text($product?->designation_fr);
        if ($name === '') {
            $name = self::text($product?->slug);
        }
        if ($name === '') {
            $name = (string) $detail->produit_id;
        }

        $item = [
            'item_id' => (string) $detail->produit_id,
            'item_name' => $name,
            'item_brand' => self::text($product?->brand?->designation_fr),
            'item_category' => self::text($category?->designation_fr),
            'item_category2' => self::text($subCategory?->designation_fr),
            'item_variant' => self::text($detail->getAttribute('arome')),
            'price' => round((float) $detail->prix_unitaire, 3),
            'quantity' => (int) $detail->qte,
        ];

        return array_filter($item, static fn ($value): bool => $value !== '' && $value !== null);
    }

    private function apiSecret(): string
    {
        return trim((string) config('services.ga4.api_secret', ''));
    }

    /** Squished and capped at GA4's 100-character parameter limit; '' when empty. */
    private static function text(mixed $value): string
    {
        if (! is_scalar($value)) {
            return '';
        }

        return mb_substr(Str::squish((string) $value), 0, self::MAX_PARAM_LENGTH);
    }

    private static function sanitizeClientId(mixed $value): ?string
    {
        return is_string($value) && preg_match(self::CLIENT_ID_PATTERN, $value) === 1 ? $value : null;
    }

    private static function sanitizeSessionId(mixed $value): ?string
    {
        if (is_int($value) && $value >= 0) {
            $value = (string) $value;
        }

        return is_string($value) && preg_match(self::SESSION_ID_PATTERN, $value) === 1 ? $value : null;
    }

    /** gtag's own client-id shape, for an order whose browser never had one. */
    private static function placeholderClientId(Commande $order): string
    {
        return random_int(1000000000, 2147483647).'.'.($order->created_at?->getTimestamp() ?? time());
    }
}
