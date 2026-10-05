<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\CheckoutPricingService;
use App\Services\OrderBudget;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Prints the Protinas v3 rules as the LIVE config computes them (spec §C) and fails when a pack
 * tier needs more margin than the floor. Read-only. Run at deploy and after any env change.
 *
 *   php artisan protinas:check-rules
 *
 * Exit 1 when a pack tier needs a real margin above loyalty.budget.margin_floor_percent: the
 * tier would then be capped on every basket at its threshold (customers see a smaller pack
 * discount than announced) — lower the tier (PACK_TIERS) or confirm the real margin.
 *
 * The output contains the configured margin floor and courier cost (already in the public repo's
 * config defaults). The vps-run log is PUBLIC (public repository): no purchase price, per-product
 * margin or promo code may ever be printed here — products are named by id only.
 */
class ProtinasCheckRules extends Command
{
    protected $signature = 'protinas:check-rules';

    protected $description = 'Print the live Protinas v3 thresholds and check every pack tier against the margin floor';

    public function handle(OrderBudget $budget, CheckoutPricingService $pricing): int
    {
        $ppd = $budget->pointsPerDt();
        $earn = $budget->earnPerDt();
        $floor = $budget->marginFloorBasisPoints() / 100;
        $dt = fn (int $mm): string => number_format($mm / 1000, 3, ',', ' ');
        $version = CheckoutPricingService::rulesVersion();

        $this->info(sprintf('Rules version %d%s', $version, $version < 3 ? ' (v2 rollback: the thresholds below are not used at checkout)' : ''));
        $this->table(['setting', 'value'], [
            ['margin floor m', rtrim(rtrim(number_format($floor, 2, ',', ''), '0'), ',').' %'],
            ['courier per trip K', $dt($budget->courierMm()).' DT'],
            ['safety S', $dt($budget->safetyMm()).' DT'],
            ['scale', $ppd.' Protinas = 1 DT · earn '.$earn.' per DT ('.round(100 * $earn / $ppd, 2).' %)'],
            ['delivery', $dt($budget->deliveryFeeMm()).' DT, free from '.$dt($budget->freeDeliveryFromMm()).' DT'],
            ['earned Protinas', 'up to '.(int) config('loyalty.points.earned_max_percent', 100).' % of goods'
                .((bool) config('loyalty.points.cover_shipping', true) ? ' + delivery' : '').' · hold '
                .(int) config('loyalty.points.earn_hold_days', 14).' days · min cash '.config('loyalty.points.min_cash_dt', 0).' DT'],
            ['gift Protinas', 'valid '.(int) config('loyalty.gift.valid_days', 60).' days · auto-apply '
                .((bool) config('loyalty.gift.auto_apply', true) ? 'on' : 'off').' · reminders J-'.implode(', J-', (array) config('loyalty.gift.reminder_days', [7, 1]))
                .' · SMS '.((bool) config('loyalty.gift.sms_reminders', false) ? 'on' : 'off')],
            ['refusal deposit', (int) config('loyalty.refusal.forfeit_points', 400).' Protinas · freeze after '
                .(int) config('loyalty.refusal.freeze_after', 2).' refusals in '.(int) config('loyalty.refusal.window_days', 90).' days'],
            ['phone confirmation', 'cash < '.config('loyalty.cod.confirm_below_cash_dt', 20).' DT or Protinas ≥ '
                .(int) config('loyalty.cod.confirm_points_share_percent', 50).' % of the amount due'],
            ['code guard', (bool) config('loyalty.coupons.margin_guard', true) ? 'on' : 'OFF'],
            ['welcome', (int) config('welcome_bonus.points', 300).' Protinas · unlock '
                .((bool) config('welcome_bonus.unlock_on_first_delivery', false) ? 'first delivered order' : 'phone verification')],
        ]);

        // ── Published thresholds (what /loyalty/rules and the coupon form show) ───────────────────
        $this->line('');
        $this->info('Thresholds');
        $safe60 = $budget->safeCouponPercent(60);
        $this->table(['threshold', 'value'], [
            ['full welcome gift from', $this->dtOrNever($budget->giftFullFromDt())],
            ['free-delivery code from', $this->dtOrNever($budget->freeShippingCodeFromDt())],
            ['safe percent code from 60 DT', $safe60.' %'],
            ['5 % code never capped from', $this->dtOrNever($budget->safePercentFromDt(5))],
            ['10 % code never capped from', $this->dtOrNever($budget->safePercentFromDt(10))],
            ['fixed 15 DT code never capped from', $this->dtOrNever($budget->safeFixedFrom(15))],
        ]);

        // ── Gift room on typical baskets (welcome gift, no pack, home delivery) ──────────────────
        $this->line('');
        $this->info('Welcome gift applied on a basket (no pack / code)');
        $giftRows = [];
        foreach ([30, 59, 100, 130, 150, 180, 200, 300, 500] as $basket) {
            $r = $pricing->computeV3($this->basket($basket * 1000, 0, 0, (int) config('welcome_bonus.points', 300)));
            $giftRows[] = [$basket.' DT', $r['gift_points'].' Protinas', $dt($r['gift_value_mm']).' DT', $dt($r['total_mm']).' DT'];
        }
        $this->table(['basket', 'gift used', 'gift value', 'cash at the door'], $giftRows);

        // ── Pack tiers: the real margin each one needs on its own ───────────────────────────────
        $this->line('');
        $this->info('Pack tiers (promo lines included) — real margin needed to keep S on the worst basket of the tier');
        $tiers = (array) config('loyalty.pack.tiers', []);
        $free = $budget->freeDeliveryFromMm() / 1000.0;
        $failed = 0;
        $rows = [];
        foreach (array_values($tiers) as $i => $tier) {
            $from = (float) ($tier['from_dt'] ?? 0);
            $percent = (int) ($tier['percent'] ?? 0);
            $next = isset($tiers[$i + 1]['from_dt']) ? (float) $tiers[$i + 1]['from_dt'] : null;
            // Worst basket of the tier: its threshold, or the first basket without the delivery fee.
            $needed = $budget->minMarginPercentForPack($from, $percent);
            $worstAt = $from;
            if ($free > $from && ($next === null || $free < $next)) {
                $atFree = $budget->minMarginPercentForPack($free, $percent);
                if ($atFree > $needed) {
                    $needed = $atFree;
                    $worstAt = $free;
                }
            }
            $r = $pricing->computeV3($this->basket((int) round($from * 1000), $percent, (int) round($from * 1000 * $percent / 100), 0));
            $capped = (bool) $r['pack_capped'];
            $ok = $needed <= $floor + 0.0001;
            $failed += $ok ? 0 : 1;
            $rows[] = [rtrim(rtrim(number_format($from, 3, ',', ''), '0'), ',').' DT / '.$percent.' %',
                number_format($needed, 2, ',', '').' %'.($worstAt !== $from ? ' (at '.rtrim(rtrim(number_format($worstAt, 3, ',', ''), '0'), ',').' DT)' : ''),
                $capped ? 'capped to '.$dt($r['pack_applied_mm']).' DT' : 'full',
                $ok ? 'ok' : 'NEEDS MORE THAN THE FLOOR'];
        }
        $this->table(['tier', 'margin needed', 'at the threshold', 'verdict'], $rows);

        // ── Machines outside the programme ──────────────────────────────────────────────────────
        $slugs = (array) config('loyalty.program.excluded_subcategory_slugs', []);
        if ($slugs !== [] && Schema::hasTable('sous_categories') && Schema::hasTable('products')) {
            $this->line('');
            $this->info('Outside the programme (no pack, no gift, no earning)');
            $machineRows = [];
            foreach ($slugs as $slug) {
                $sub = DB::table('sous_categories')->where('slug', $slug)->first(['id']);
                $machineRows[] = $sub
                    ? [$slug, DB::table('products')->where('sous_categorie_id', $sub->id)->count(),
                        DB::table('products')->where('sous_categorie_id', $sub->id)->where('qte', '>', 0)->count()]
                    : [$slug, 'subcategory NOT FOUND', '—'];
            }
            $this->table(['subcategory', 'products', 'in stock'], $machineRows);
        }

        $this->reportPurchasePrices();

        if ($failed > 0) {
            $this->error(sprintf('%d pack tier(s) need a real margin above the %s %% floor. Lower PACK_TIERS or confirm the margin.',
                $failed, rtrim(rtrim(number_format($floor, 2, ',', ''), '0'), ',')));

            return self::FAILURE;
        }
        $this->comment('Read-only: nothing was written.');

        return self::SUCCESS;
    }

    /**
     * Sanity of the purchase prices typed in the product form. prix_achat is HT per unit; a margin above
     * 40 % usually means a wrong basis (a pack price, a typo) and would fund gifts the real margin cannot
     * pay. Only product ids are printed: this log is public, a cost or a margin never goes in it.
     */
    private function reportPurchasePrices(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'prix_achat')) {
            return;
        }
        $costed = 0;
        $high = [];
        $aboveprice = [];
        // Full rows, read only (never save a Product loaded with a column list).
        Product::query()->whereNotNull('prix_achat')->where('prix_achat', '>', 0)->orderBy('id')
            ->chunk(200, function ($products) use (&$costed, &$high, &$aboveprice): void {
                foreach ($products as $product) {
                    $unit = OrderBudget::millimes($product->getEffectiveUnitPrice());
                    $cost = OrderBudget::costMm($product);
                    if ($cost === null || $unit <= 0) {
                        continue;
                    }
                    $costed++;
                    if ($cost >= $unit) {
                        $aboveprice[] = '#'.$product->id;
                    } elseif (($unit - $cost) * 100 > 40 * $unit) {
                        $high[] = '#'.$product->id;
                    }
                }
            });

        $this->line('');
        $this->info('Purchase prices (prix_achat, HT per unit, VAT '.(OrderBudget::vatBasisPoints() / 100).' % added)');
        $this->table(['check', 'products'], [
            ['with a purchase price', (string) $costed],
            ['margin above 40 % — check the price is HT and for ONE unit', $high === [] ? 'none' : count($high).' : '.implode(' ', $high)],
            ['cost at or above the selling price — no giveaway on them', $aboveprice === [] ? 'none' : count($aboveprice).' : '.implode(' ', $aboveprice)],
        ]);
    }

    private function dtOrNever(?int $dt): string
    {
        return $dt === null ? 'never (floor too low)' : $dt.' DT';
    }

    /** A generic programme basket for computeV3(): no prix_achat, home delivery, no earned Protinas. */
    private function basket(int $goodsMm, int $packPercent, int $packMm, int $gift): array
    {
        return [
            'programme_mm' => $goodsMm, 'excluded_mm' => 0, 'costed_margin_mm' => 0, 'uncosted_mm' => $goodsMm,
            'pack_percent' => $packPercent, 'pack_amount_mm' => $packMm, 'coupon' => null, 'home_delivery' => true,
            'gift_usable' => $gift, 'earned_usable' => 0, 'requested_earned' => 0, 'use_gift' => $gift > 0,
        ];
    }
}
