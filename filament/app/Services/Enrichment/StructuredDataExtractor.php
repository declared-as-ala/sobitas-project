<?php

namespace App\Services\Enrichment;

use App\Support\Gtin;

/**
 * Pull product facts out of an arbitrary page.
 *
 * ── WHY JSON-LD FIRST, AND ALMOST ONLY ────────────────────────────────────────────────────
 * Measured on real brand and retailer sites: MyProtein publishes a full `ProductGroup` graph with
 * gtin13, OstroVit publishes `Product` with name/description/image/offers. That block exists
 * precisely so machines can read it — it is the site telling search engines what the product is,
 * in a stable, versioned vocabulary. Reading it is neither fragile nor adversarial.
 *
 * DOM scraping is the opposite: a class name changes and the parser silently starts returning the
 * breadcrumb as the ingredient list. Wrong facts are worse than missing facts on a page where a
 * customer is deciding what to put in their body, so the fallbacks here stay deliberately narrow —
 * microdata (the same vocabulary, older syntax), then OpenGraph for a name and image, and nothing
 * that guesses from layout.
 *
 * ── WHAT IT REFUSES TO TAKE ───────────────────────────────────────────────────────────────
 * Reviews, ratings and reviewer names are dropped even when a page hands them over in clean JSON-LD
 * (MyProtein does). Republishing another shop's customer reviews as ours is the same lie as
 * inventing them. Prices are dropped too — ours are the only ones that can be true here.
 */
class StructuredDataExtractor
{
    /**
     * @return array<string, mixed> field_path => value, using config('enrichment.fields') paths
     */
    public function extract(string $html, string $sourceUrl): array
    {
        $product = $this->productNode($html);
        $facts = $product !== null ? $this->fromSchemaOrg($product) : [];

        if ($facts === []) {
            $facts = $this->fromMicrodata($html);
        }

        // OpenGraph only fills gaps; it never overwrites a schema.org value.
        foreach ($this->fromOpenGraph($html) as $path => $value) {
            $facts[$path] ??= $value;
        }

        // Most shops print the barcode in a specifications table rather than publishing it in
        // JSON-LD — measured across the live web, only about one page in six exposes gtin
        // structurally. A labelled code is still a fact stated by the page, so it is read too.
        $facts['identity.gtin'] ??= $this->labelledBarcode($html);

        $facts = $this->dropForbidden($facts);

        return array_filter($facts, static fn ($v) => $v !== null && $v !== '' && $v !== []);
    }

    /** The first schema.org Product anywhere in the page's JSON-LD graph. */
    private function productNode(string $html): ?array
    {
        foreach ($this->jsonLdBlocks($html) as $block) {
            $found = $this->findProduct($block);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /** @return list<mixed> */
    private function jsonLdBlocks(string $html): array
    {
        $out = [];

        preg_match_all(
            '~<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>~is',
            $html,
            $matches
        );

        foreach ($matches[1] ?? [] as $raw) {
            // Some CMSs emit HTML-escaped JSON inside the script tag.
            $decoded = json_decode(html_entity_decode(trim($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8'), true);
            if ($decoded === null) {
                $decoded = json_decode(trim($raw), true);
            }
            if (is_array($decoded)) {
                $out[] = $decoded;
            }
        }

        return $out;
    }

    private function findProduct(mixed $node): ?array
    {
        if (is_array($node) && array_is_list($node)) {
            foreach ($node as $child) {
                $found = $this->findProduct($child);
                if ($found !== null) {
                    return $found;
                }
            }

            return null;
        }

        if (! is_array($node)) {
            return null;
        }

        $type = $node['@type'] ?? null;
        $types = array_map('strval', is_array($type) ? $type : [$type]);

        // ProductGroup carries the shared facts for a variant family (a flavour range); its
        // `hasVariant` entries carry the per-variant barcode. Both are useful, so the group is
        // accepted here and variants are merged in fromSchemaOrg().
        if (array_intersect($types, ['Product', 'ProductGroup', 'IndividualProduct'])) {
            return $node;
        }

        foreach ($node as $child) {
            $found = $this->findProduct($child);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function fromSchemaOrg(array $p): array
    {
        $facts = [];

        $this->set($facts, 'identity.official_name', $this->text($p['name'] ?? null));
        $this->set($facts, 'identity.mpn', $this->text($p['mpn'] ?? null));
        $this->set($facts, 'identity.brand', $this->text(
            is_array($p['brand'] ?? null) ? ($p['brand']['name'] ?? null) : ($p['brand'] ?? null)
        ));

        // Any of the gtin spellings, validated. An unvalidated barcode is worse than none: it sends
        // the next lookup to a different product entirely.
        foreach (['gtin', 'gtin13', 'gtin12', 'gtin14', 'gtin8'] as $key) {
            $candidate = Gtin::normalize($this->text($p[$key] ?? null));
            if ($candidate !== null) {
                $this->set($facts, 'identity.gtin', $candidate);
                break;
            }
        }

        // A ProductGroup's variants each carry their own barcode; collect them as candidates so a
        // flavour can be matched later rather than collapsing the family to one code.
        if (is_array($p['hasVariant'] ?? null)) {
            $variants = [];
            foreach ($p['hasVariant'] as $variant) {
                if (! is_array($variant)) {
                    continue;
                }
                foreach (['gtin', 'gtin13', 'gtin12', 'gtin14', 'gtin8'] as $key) {
                    $code = Gtin::normalize($this->text($variant[$key] ?? null));
                    if ($code !== null) {
                        $variants[] = ['gtin' => $code, 'name' => $this->text($variant['name'] ?? null)];
                        break;
                    }
                }
            }
            $this->set($facts, 'content_facts.flavours', $variants);
        }

        $this->set($facts, 'reference.description', $this->text($p['description'] ?? null));

        $images = [];
        foreach ((array) ($p['image'] ?? []) as $image) {
            $url = is_array($image) ? ($image['url'] ?? null) : $image;
            if (is_string($url) && str_starts_with($url, 'http')) {
                $images[] = $url;
            }
        }
        $this->set($facts, 'media.images', array_values(array_unique($images)));

        // Nutrition, when a site publishes it as schema.org NutritionInformation — transcribed
        // exactly, never converted. A value without its basis (per serving vs per 100 g) is not a
        // fact, it is a number.
        if (is_array($p['nutrition'] ?? null)) {
            $nutrition = array_filter([
                'serving_size' => $this->text($p['nutrition']['servingSize'] ?? null),
                'calories' => $this->text($p['nutrition']['calories'] ?? null),
                'protein' => $this->text($p['nutrition']['proteinContent'] ?? null),
                'carbohydrate' => $this->text($p['nutrition']['carbohydrateContent'] ?? null),
                'fat' => $this->text($p['nutrition']['fatContent'] ?? null),
                'saturated_fat' => $this->text($p['nutrition']['saturatedFatContent'] ?? null),
                'sugar' => $this->text($p['nutrition']['sugarContent'] ?? null),
                'fiber' => $this->text($p['nutrition']['fiberContent'] ?? null),
                'sodium' => $this->text($p['nutrition']['sodiumContent'] ?? null),
            ], static fn ($v) => $v !== null && $v !== '');

            $this->set($facts, 'content_facts.nutrition', $nutrition);
            $this->set($facts, 'content_facts.serving_size', $nutrition['serving_size'] ?? null);
        }

        // additionalProperty is where most stores put the specs table.
        $properties = [];
        foreach ((array) ($p['additionalProperty'] ?? []) as $property) {
            if (! is_array($property)) {
                continue;
            }
            $name = $this->text($property['name'] ?? null);
            $value = $this->text($property['value'] ?? null);
            if ($name !== null && $value !== null) {
                $properties[$name] = $value;
            }
        }
        foreach ($properties as $name => $value) {
            $lower = mb_strtolower($name);
            match (true) {
                str_contains($lower, 'ingredient') || str_contains($lower, 'composition')
                    => $this->set($facts, 'content_facts.ingredients', $this->splitIngredients($value)),
                str_contains($lower, 'allerg')
                    => $this->set($facts, 'content_facts.allergens', [$value]),
                str_contains($lower, 'serving') || str_contains($lower, 'portion')
                    => $this->set($facts, 'content_facts.serving_size', $value),
                str_contains($lower, 'weight') || str_contains($lower, 'poids') || str_contains($lower, 'size')
                    => $this->set($facts, 'content_facts.net_content', $value),
                default => null,
            };
        }

        return $facts;
    }

    /** Microdata — the same vocabulary, older syntax. Name and barcode only; enough to identify. */
    private function fromMicrodata(string $html): array
    {
        if (! preg_match('~itemtype=["\']https?://schema\.org/Product["\']~i', $html)) {
            return [];
        }

        $facts = [];

        if (preg_match('~itemprop=["\']name["\'][^>]*content=["\']([^"\']+)~i', $html, $m)
            || preg_match('~itemprop=["\']name["\'][^>]*>([^<]{3,160})<~i', $html, $m)) {
            $this->set($facts, 'identity.official_name', $this->text($m[1]));
        }

        if (preg_match('~itemprop=["\']gtin1?[2348]?["\'][^>]*content=["\']([^"\']+)~i', $html, $m)) {
            $this->set($facts, 'identity.gtin', Gtin::normalize($m[1]));
        }

        return $facts;
    }

    /**
     * A barcode printed in a specs table: "EAN: 5999076251520", "Code-barres 5903246226645".
     *
     * ── WHY IT MUST BE LABELLED ───────────────────────────────────────────────────────────
     * Any 13-digit run would also match a phone number, an order reference, a timestamp or a
     * tracking code — and roughly one in ten random 13-digit numbers passes the mod-10 check by
     * chance, so the check digit alone is nowhere near enough to tell a barcode from a coincidence.
     * The label is what makes it a statement rather than a string, so an unlabelled number is
     * ignored no matter how well-formed it looks.
     *
     * Codes inside a URL or an attribute are skipped for the same reason: a product id in a path
     * is not the page saying "this is the barcode".
     */
    private function labelledBarcode(string $html): ?string
    {
        $text = preg_replace('~<(script|style)[^>]*>.*?</\1>~is', ' ', $html) ?? $html;
        $text = preg_replace('~<[^>]+>~', ' | ', $text) ?? $text;
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $labels = 'EAN(?:[\s-]?1?3)?|UPC(?:[\s-]?A)?|GTIN(?:[\s-]?1?[2348])?|Code[\s-]?[àa]?[\s-]?barres?|Barcode|Kode\s?kreskowy|C[oó]digo\s?de\s?barras|Strichcode';

        // The code may sit a short distance after the label — across a table cell boundary, a colon
        // or a couple of tags — but not paragraphs away, where it would belong to something else.
        if (preg_match('~(?:'.$labels.')\s*[:#]?\s*(?:\|\s*){0,3}([0-9][0-9\s-]{6,18}[0-9])~iu', $text, $m)) {
            return Gtin::normalize($m[1]);
        }

        return null;
    }

    private function fromOpenGraph(string $html): array
    {
        $facts = [];

        if (preg_match('~property=["\']og:title["\'][^>]*content=["\']([^"\']+)~i', $html, $m)) {
            $this->set($facts, 'identity.official_name', $this->text(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        }

        if (preg_match('~property=["\']og:image["\'][^>]*content=["\'](https?://[^"\']+)~i', $html, $m)) {
            $this->set($facts, 'media.images', [$m[1]]);
        }

        return $facts;
    }

    /**
     * An ingredient list is ordered by descending quantity — that order IS information, so it is
     * preserved rather than sorted or deduplicated.
     *
     * @return list<string>
     */
    private function splitIngredients(string $value): array
    {
        $value = preg_replace('~^\s*(ingr[ée]dients?|composition)\s*:\s*~iu', '', $value) ?? $value;

        // Split on commas that are not inside parentheses — "Émulsifiant (lécithine de soja)" is
        // one ingredient, not two.
        $parts = preg_split('~,(?![^(]*\))~u', $value) ?: [];

        return array_values(array_filter(array_map(
            static fn (string $p): string => trim($p, " \t\n\r\0\x0B.;"),
            $parts
        ), static fn (string $p): bool => $p !== '' && mb_strlen($p) < 120));
    }

    /**
     * Drop anything on the never-collect list, whatever the page offered.
     *
     * Enforced here rather than trusted to the callers: a review array arriving in clean JSON-LD is
     * the easy case to accidentally keep, because nothing about it looks like a mistake.
     */
    private function dropForbidden(array $facts): array
    {
        $forbidden = (array) config('enrichment.never_collect', []);
        $allowed = (array) config('enrichment.fields', []);

        foreach (array_keys($facts) as $path) {
            $leaf = mb_strtolower((string) $path);
            foreach ($forbidden as $term) {
                if (str_contains($leaf, (string) $term)) {
                    unset($facts[$path]);

                    continue 2;
                }
            }
            if ($allowed !== [] && ! in_array($path, $allowed, true)) {
                unset($facts[$path]);
            }
        }

        return $facts;
    }

    private function set(array &$facts, string $path, mixed $value): void
    {
        if ($value !== null && $value !== '' && $value !== []) {
            $facts[$path] = $value;
        }
    }

    private function text(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = $value[0] ?? null;
        }
        if (! is_scalar($value)) {
            return null;
        }

        $text = trim(preg_replace('~\s+~u', ' ', strip_tags((string) $value)) ?? '');

        return $text === '' ? null : $text;
    }
}
