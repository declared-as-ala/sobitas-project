<?php

namespace App\Services\Enrichment;

use App\Models\Product;
use App\Models\ProductSourceObservation;
use App\Support\Gtin;
use Illuminate\Support\Carbon;

/**
 * Collect facts about one product from everywhere we can reach, and record where each came from.
 *
 * ── THE SHAPE OF THE RUN ──────────────────────────────────────────────────────────────────
 * discover (barcode first, name as fallback) → fetch within a budget → extract structured data →
 * record one observation per fact per source → reconcile.
 *
 * ── RECONCILIATION DOES NOT AVERAGE ───────────────────────────────────────────────────────
 * Two sources disagreeing about a serving size is normal — different market, different formula
 * revision, or one of them is simply wrong. Averaging them produces a third number that is printed
 * on no label anywhere, which is the worst of the three options. Every observation is kept; a
 * winner is selected by source trust; the losers stay queryable so a human can see the
 * disagreement rather than discovering it from a customer.
 *
 * ── NOTHING HERE PUBLISHES ────────────────────────────────────────────────────────────────
 * Observations land with status `pending`. Getting them onto a page is a separate, deliberate act
 * with a human in it. That is not ceremony: these are supplements, and a wrong serving size is not
 * a typo.
 */
class ProductEnricher
{
    /** Pages fetched per product. Beyond this the marginal page is another retailer repeating the same facts. */
    private const FETCH_BUDGET = 6;

    /**
     * Corroboration threshold for a barcode we did not previously have. One retailer publishing a
     * gtin13 is a lead; two independent hosts publishing the SAME code for the same product is
     * evidence — and still only enough to propose it, never to write it.
     */
    private const GTIN_CORROBORATION = 2;

    public function __construct(
        private SearchDiscovery $discovery,
        private PoliteFetcher $fetcher,
        private StructuredDataExtractor $extractor,
    ) {}

    /**
     * @return array{observations:int, sources:int, proposed_gtin:?string, conflicts:list<string>}
     */
    public function enrich(Product $product): array
    {
        $gtin = Gtin::normalize((string) ($product->gtin ?? '')) ?? Gtin::normalize((string) ($product->code_product ?? ''));

        $candidates = $this->discovery->discover(
            (string) $product->designation_fr,
            $product->brand?->designation_fr,
            $gtin,
        );

        $recorded = 0;
        $sources = 0;
        /** @var array<string, list<array{value:mixed, trust:float, host:string}>> $collected */
        $collected = [];

        foreach (array_slice($candidates, 0, self::FETCH_BUDGET) as $candidate) {
            $page = $this->fetcher->get($candidate['url']);
            if ($page === null) {
                continue;
            }

            $facts = $this->extractor->extract($page['body'], $page['url']);
            if ($facts === []) {
                continue;
            }

            $policy = $this->fetcher->policy($page['host']);
            $sources++;

            foreach ($facts as $path => $value) {
                // A retailer's marketing paragraph is kept only where the policy allows a human to
                // read it while writing ours. It is never published verbatim from anywhere.
                if ($path === 'reference.description' && ! ($policy['store_text'] ?? false)) {
                    continue;
                }

                $collected[$path][] = [
                    'value' => $value,
                    'trust' => (float) $policy['trust'],
                    'host' => $page['host'],
                ];

                $recorded += $this->record($product, $path, $value, $candidate, $page, $policy, $gtin);
            }
        }

        return [
            'observations' => $recorded,
            'sources' => $sources,
            'proposed_gtin' => $gtin === null ? $this->proposeGtin($collected) : null,
            'conflicts' => $this->conflicts($collected),
        ];
    }

    /**
     * @param  array<string, mixed>  $policy
     * @return int 1 when a new observation was written, 0 when it already existed
     */
    private function record(
        Product $product,
        string $path,
        mixed $value,
        array $candidate,
        array $page,
        array $policy,
        ?string $ourGtin,
    ): int {
        // Identity confidence: did this page's own barcode agree with ours? That is the difference
        // between "a page about this product" and "a page about a product with a similar name".
        $pageGtin = is_string($value) && $path === 'identity.gtin' ? $value : null;
        $matchMethod = match (true) {
            $candidate['via'] === 'gtin' => 'gtin',
            $ourGtin !== null && $pageGtin !== null && Gtin::sameItem($ourGtin, $pageGtin) => 'gtin',
            default => 'brand_name',
        };

        $confidence = $matchMethod === 'gtin'
            ? min(0.95, (float) $policy['trust'])
            : min(0.60, (float) $policy['trust'] * 0.75);

        $observation = ProductSourceObservation::firstOrNew([
            'product_id' => $product->id,
            'field_path' => $path,
            'source_id' => $page['host'],
            // Re-fetching an unchanged page must not create a second observation; a changed hash is
            // the signal that the upstream page moved and this needs looking at again.
            'content_hash' => $page['hash'],
        ]);

        if ($observation->exists) {
            return 0;
        }

        $observation->fill([
            'normalized_value' => ['value' => $value],
            'raw_value' => null,
            'source_record_id' => null,
            'source_url' => $page['url'],
            'source_type' => (string) ($policy['type'] ?? 'unknown'),
            'retrieved_at' => Carbon::now(),
            'license_id' => null,
            'attribution' => null,
            'confidence' => $confidence,
            'match_method' => $matchMethod,
            'extraction_method' => 'api',
            'extractor_version' => '1.0',
            'status' => 'pending',
        ])->save();

        return 1;
    }

    /**
     * A barcode for a product that had none, when independent hosts agree.
     *
     * Returned for a human to check against the physical tub — which takes seconds — rather than
     * written. A wrong barcode here would send every future lookup to somebody else's product and
     * attach their Supplement Facts to ours, and it would do it silently.
     *
     * @param  array<string, list<array{value:mixed, trust:float, host:string}>>  $collected
     */
    private function proposeGtin(array $collected): ?string
    {
        $votes = [];

        foreach ($collected['identity.gtin'] ?? [] as $observation) {
            $code = Gtin::normalize((string) $observation['value']);
            if ($code === null) {
                continue;
            }
            // Keyed on the 14-digit form so a UPC-A and its zero-padded EAN-13 count as one vote,
            // not two competing ones.
            $votes[Gtin::toGtin14($code)][$observation['host']] = $code;
        }

        foreach ($votes as $hosts) {
            if (count($hosts) >= self::GTIN_CORROBORATION) {
                return reset($hosts);
            }
        }

        return null;
    }

    /**
     * Fields where sources disagree. Surfaced, never silently resolved.
     *
     * @param  array<string, list<array{value:mixed, trust:float, host:string}>>  $collected
     * @return list<string>
     */
    private function conflicts(array $collected): array
    {
        $out = [];

        foreach ($collected as $path => $observations) {
            if ($path === 'reference.description' || $path === 'media.images') {
                continue;   // prose and image sets differ by nature; that is not a conflict
            }

            $distinct = [];
            foreach ($observations as $observation) {
                $distinct[md5(json_encode($observation['value']))] = true;
            }

            if (count($distinct) > 1) {
                $out[] = $path.' ('.count($distinct).' different values from '.count($observations).' sources)';
            }
        }

        return $out;
    }
}
