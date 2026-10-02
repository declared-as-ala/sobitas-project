<?php

namespace App\Support;

use App\Models\Commande;
use App\Models\Facture;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * What the courier collects at the door, and the guards that keep it right (Protinas v3, spec F0).
 *
 *   prix_ttc = max(0, prix_ht − discount_ht − remise + frais_livraison)
 *
 *   prix_ht          gross goods (the lines)
 *   discount_ht      the promo code
 *   remise           pack + Protinas spent on the goods
 *   frais_livraison  the delivery still due in CASH — since v3 net of the Protinas that paid it
 *                    (that part is in commandes.points_shipping_dt)
 *
 * The storefront checkout writes exactly this identity. Before 02/10/2026 an admin save of the
 * order (a routine status change) rewrote prix_ttc = prix_ht + frais and dropped both discounts;
 * the delivery note then derived a "fee" equal to the discounts and Aramex collected the full
 * price. Every admin path now goes through this class:
 *
 *   adminTotals()        what EditCommande writes (stored discounts, never browser values);
 *   isCheckoutPriced()   orders whose prix_ttc is a promise made to the customer (storefront,
 *                        affiliate desk) — a delivery note that disagrees with it is refused;
 *   aramexBlockReason()  why « Envoyer vers Aramex » must stay disabled for a delivery note.
 */
final class OrderCashOnDelivery
{
    /** Same tolerance as the checkout's expected_total check. */
    public const TOLERANCE_DT = 0.01;

    /** D7 copy: the push is blocked until staff called the account's verified phone. */
    public const CONFIRM_FIRST = 'Confirmez la commande par téléphone avant l’envoi';

    private static function mm(float|int|string|null $dt): int
    {
        return (int) round((float) ($dt ?? 0) * 1000, 0, PHP_ROUND_HALF_UP);
    }

    /** prix_ht − discount_ht − remise + frais, never below 0, rounded to the millime. */
    public static function amount(float $prixHt, float $discountHt, float $remise, float $frais): float
    {
        $millimes = self::mm($prixHt) - self::mm(max(0, $discountHt)) - self::mm(max(0, $remise)) + self::mm(max(0, $frais));

        return round(max(0, $millimes) / 1000, 3);
    }

    public static function differs(float $a, float $b): bool
    {
        return abs(self::mm($a) - self::mm($b)) > self::mm(self::TOLERANCE_DT);
    }

    /**
     * The product lines an admin form really submitted (a placeholder row has no produit_id).
     *
     * @return list<array<string, mixed>>
     */
    public static function validLines(mixed $details): array
    {
        if (is_string($details)) {
            $decoded = json_decode($details, true);
            $details = is_array($decoded) ? $decoded : [];
        }

        return array_values(array_filter(is_array($details) ? $details : [],
            fn ($row) => is_array($row) && ! empty($row['produit_id'])));
    }

    /**
     * The order's stored discounts, read from the database: an admin form never carries them, and
     * a model loaded with a column list may not either.
     *
     * @return array{discount_ht: float, remise: float}
     */
    public static function storedDiscounts(int $commandeId): array
    {
        $row = DB::table('commandes')->where('id', $commandeId)->first(['discount_ht', 'remise']);

        return ['discount_ht' => (float) ($row->discount_ht ?? 0), 'remise' => (float) ($row->remise ?? 0)];
    }

    /**
     * The totals an admin save of an existing order writes: lines and delivery fee from the form,
     * discounts from the database. Null when no valid line was submitted (keep the stored totals).
     *
     * @return array{prix_ht: float, frais_livraison: float, prix_ttc: float}|null
     */
    public static function adminTotals(Commande $order, mixed $details, mixed $frais): ?array
    {
        $lines = self::validLines($details);
        if ($lines === []) {
            return null;
        }
        $goodsMm = 0;
        foreach ($lines as $row) {
            $goodsMm += (int) round((float) ($row['qte'] ?? 1) * self::mm($row['prix_unitaire'] ?? 0), 0, PHP_ROUND_HALF_UP);
        }
        $prixHt = round($goodsMm / 1000, 3);
        $fee = round(max(0.0, (float) (is_numeric($frais) ? $frais : 0)), 3);
        $stored = self::storedDiscounts((int) $order->getKey());

        return [
            'prix_ht' => $prixHt,
            'frais_livraison' => $fee,
            'prix_ttc' => self::amount($prixHt, $stored['discount_ht'], $stored['remise'], $fee),
        ];
    }

    /**
     * True for an order whose prix_ttc was quoted to the customer by a server (storefront checkout
     * or affiliate desk): its delivery note must collect exactly prix_ttc. Orders typed in the admin
     * or converted from a quotation keep the old, permissive behaviour.
     */
    public static function isCheckoutPriced(Commande $order): bool
    {
        $a = $order->getAttributes();
        if ($order->isPricedV3()) {
            return true;
        }
        if (! empty($a['quotation_id'] ?? null)) {
            return false;
        }
        if ((int) ($a['authenticated_user_id'] ?? 0) > 0 || ! empty($a['affilie_id'] ?? null)
            || ! empty($a['checkout_idempotency_key'] ?? null) || ! empty($a['checkout_payload_hash'] ?? null)) {
            return true;
        }
        foreach (['pack_discount_ht', 'points_discount_ht', 'discount_ht'] as $column) {
            if ((float) ($a[$column] ?? 0) > 0) {
                return true;
            }
        }

        return (int) ($a['points_redeemed'] ?? 0) > 0 || trim((string) ($a['coupon_code_snapshot'] ?? '')) !== '';
    }

    /**
     * May the delivery note derive a missing delivery fee from prix_ttc? Only for a legacy order
     * with no pack, Protinas or code: on any other order prix_ttc − lines + remise is the discount
     * itself, and "deriving" it turned the discount back into a fee (the 02/10 bug).
     */
    public static function mayDeriveFee(Commande $order): bool
    {
        $a = $order->getAttributes();
        if ($order->isPricedV3()) {
            return false;
        }
        foreach (['pack_discount_ht', 'points_discount_ht', 'discount_ht', 'points_shipping_dt'] as $column) {
            if ((float) ($a[$column] ?? 0) > 0) {
                return false;
            }
        }

        return (int) ($a['points_redeemed'] ?? 0) <= 0 && trim((string) ($a['coupon_code_snapshot'] ?? '')) === '';
    }

    /** Delivery paid with Protinas on a v3 order (DT), 0 otherwise (also for anything that is not an order: print views). */
    public static function shippingPaidWithProtinasDt(mixed $order): float
    {
        if (! $order instanceof Commande || ! $order->isPricedV3()) {
            return 0.0;
        }

        return round(max(0.0, (float) ($order->getAttributes()['points_shipping_dt'] ?? 0)), 3);
    }

    /** @var array<string, ?string> one lookup per delivery note per request (the BL table asks twice per row) */
    private static array $blockMemo = [];

    /**
     * Why « Envoyer vers Aramex » must stay disabled for this delivery note, or null when it may be
     * sent. Staff-facing French. Never calls Aramex.
     *
     *   - the source order waits for its phone confirmation (rule 17);
     *   - the note would collect something else than the customer was told (checkout orders).
     */
    public static function aramexBlockReason(Facture $bl, bool $fresh = false): ?string
    {
        $attributes = $bl->getAttributes();
        $commandeId = array_key_exists('commande_id', $attributes)
            ? (int) ($attributes['commande_id'] ?? 0)
            : (int) DB::table('factures')->where('id', $bl->getKey())->value('commande_id');
        if ($commandeId <= 0) {
            return null; // a delivery note typed by hand or converted from a quotation
        }
        $net = array_key_exists('net_a_payer', $attributes)
            ? (float) ($attributes['net_a_payer'] ?? 0)
            : (float) DB::table('factures')->where('id', $bl->getKey())->value('net_a_payer');
        $memoKey = $bl->getKey().'|'.$commandeId.'|'.$net;
        if (! $fresh && array_key_exists($memoKey, self::$blockMemo)) {
            return self::$blockMemo[$memoKey];
        }
        if (count(self::$blockMemo) > 500) {
            self::$blockMemo = [];
        }

        return self::$blockMemo[$memoKey] = self::blockReasonFor(Commande::query()->find($commandeId), $net);
    }

    /** Same rule from an order already in hand and the amount its delivery note collects. */
    public static function blockReasonFor(?Commande $order, float $netAPayer): ?string
    {
        if (! $order) {
            return null;
        }
        if ($order->awaitsPhoneConfirmation()) {
            return self::CONFIRM_FIRST;
        }
        if (self::isCheckoutPriced($order) && self::differs($netAPayer, (float) $order->prix_ttc)) {
            return sprintf('Le bon de livraison encaisserait %s DT au lieu des %s DT de la commande %s : corrigez-le avant l’envoi',
                self::formatDt($netAPayer), self::formatDt((float) $order->prix_ttc), (string) ($order->numero ?? $order->id));
        }

        return null;
    }

    public static function formatDt(float $amount): string
    {
        return number_format($amount, 3, ',', ' ');
    }

    /**
     * The account's verified phone staff must call, or a readable fallback. The delivery phone is a
     * fallback only when no Protinas are at stake (a guest, or an account order paid in cash): on an
     * account order that spent Protinas it may be the thief's own number, so it is never offered.
     */
    public static function phoneToCall(Commande $order): string
    {
        $verified = $order->verifiedAccountPhone();
        if ($verified !== null) {
            return $verified;
        }
        if (self::accountOrderSpentProtinas($order)) {
            return 'aucun téléphone vérifié sur le compte';
        }
        $row = DB::table('commandes')->where('id', $order->getKey())->first(['livraison_phone', 'phone']);
        $fallback = trim((string) (($row->livraison_phone ?? '') ?: ($row->phone ?? '')));

        return $fallback !== '' ? $fallback.' (numéro de livraison, aucun téléphone vérifié sur le compte)' : 'aucun numéro';
    }

    /**
     * Why « Confirmé par téléphone » cannot be used on this order, or null. An account order that
     * spent Protinas and had no verified phone at checkout has nobody trustworthy to call.
     */
    public static function phoneConfirmationBlockReason(Commande $order): ?string
    {
        if ($order->verifiedAccountPhone() !== null || ! self::accountOrderSpentProtinas($order)) {
            return null;
        }

        return 'Aucun téléphone vérifié sur le compte au moment de la commande : ne la confirmez pas sur le numéro de livraison. '
            .'Vérifiez l’identité du titulaire du compte par un autre moyen avant tout envoi, ou annulez la commande.';
    }

    /** authenticated_user_id > 0 and points_redeemed > 0, read from the row when the model is partial. */
    private static function accountOrderSpentProtinas(Commande $order): bool
    {
        $attributes = $order->getAttributes();
        if (! array_key_exists('authenticated_user_id', $attributes) || ! array_key_exists('points_redeemed', $attributes)) {
            $attributes = (array) (DB::table('commandes')->where('id', $order->getKey())
                ->first(['authenticated_user_id', 'points_redeemed']) ?? []);
        }

        return (int) ($attributes['authenticated_user_id'] ?? 0) > 0 && (int) ($attributes['points_redeemed'] ?? 0) > 0;
    }

    /** True when the commandes table has every column in $columns (partial installs, test schemas). */
    public static function hasColumns(string ...$columns): bool
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn('commandes', $column)) {
                return false;
            }
        }

        return true;
    }
}
