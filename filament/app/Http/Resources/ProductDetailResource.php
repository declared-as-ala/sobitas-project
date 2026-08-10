<?php

namespace App\Http\Resources;

use App\Support\StorefrontUrl;
use App\Filament\Support\ImagePath;
use App\Models\Product;
use App\Services\Catalog\ImportedSourceContent;
use App\Services\Seo\ProductSchemaBuilder;
use App\Support\MediaLibrary\MediaLibraryPayload;
use App\Support\Seo\ProductPublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = parent::toArray($request);

        unset($base['review'], $base['aggregateRating'], $base['seo_review'], $base['seo_aggregate_rating']);

        /*
         * The raw relation never reaches the response.
         *
         * parent::toArray() serialises every loaded relation, so `externalCatalogSource` would
         * arrive at the storefront as a staging row under a snake_case key — internal column names,
         * and a shape nothing on the frontend is typed for. `source_facts` below is the only
         * contract; this line is what makes that true rather than intended.
         */
        unset($base['external_catalog_source']);

        $canonical = $this->resolveCanonicalProductUrl();
        $builder = app(ProductSchemaBuilder::class);
        $jsonLd = $builder->buildGraph($this->resource, $canonical);
        $schemaFacts = $builder->buildSchemaFacts($this->resource, $canonical);

        $pathsForLibrary = [];
        $coverNorm = ImagePath::normalize($this->cover);
        if ($coverNorm) {
            $pathsForLibrary[] = $coverNorm;
        }
        foreach (ImagePath::normalizeArray($this->images ?? null) as $p) {
            $pathsForLibrary[] = $p;
        }
        $libraryByPath = MediaLibraryPayload::forPaths('public', $pathsForLibrary);
        $coverMedia = $coverNorm ? ($libraryByPath[$coverNorm] ?? null) : null;
        $imagesMedia = [];
        foreach (($this->images ?? []) as $img) {
            $n = ImagePath::normalize($img);
            $imagesMedia[] = $n ? ($libraryByPath[$n] ?? null) : null;
        }

        return array_merge($base, [
            'meta_description_fr' => $this->effectiveSeoDescription(),
            'json_ld_product' => $jsonLd,
            'cover_media' => $coverMedia,
            'images_media' => $imagesMedia,
            'seo' => [
                'title' => $this->effectiveSeoTitle(),
                'description' => $this->effectiveSeoDescription(),
                'excerpt' => $this->seo_excerpt,
                'canonical_url' => $this->seo_canonical_url,
                'robots' => [
                    'index' => $this->effective_seo_robots_index,
                    'follow' => $this->effective_seo_robots_follow,
                ],
                'image' => ProductPublicUrl::fromPath($this->effective_seo_image_path),
                'image_alt' => $this->resolveCoverImageAlt($coverMedia),
            ],
            'schema' => $schemaFacts,
            'source_facts' => $this->sourceFacts(),
        ]);
    }

    /**
     * The transcribed facts an imported product carries, or NULL.
     *
     * ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────────────────
     * `pack_size`/`pack_unit`/`flavour` are read off the source product NAME by IHerbNormalizer,
     * which transcribes and never converts — "1.32 lb (600 g)" yields 600 g because the label prints
     * 600 g. They are the only structured facts an imported row has beyond its name and price, and
     * today they exist only inside the composed prose, where a shopper has to read a paragraph to
     * find the format. This block is what lets both product views print them as a specification.
     *
     * Everything else on the staging row stays there, and each omission is a decision:
     *   · `external_url` is a link to the shop we sourced the record from. Not on our product page.
     *   · `source_rating` / `source_rating_count` are another shop's ratings. They are internal
     *     reference only, they never become aggregateRating, and they never appear on a page.
     *   · `external_part_number` is iHerb's catalogue number, not the manufacturer's MPN. Printing
     *     it as a reference would invite it into schema.org `mpn`, where it would be wrong.
     *   · `source_available` / `source_discontinued` describe THEIR stock, not ours. The page's
     *     availability comes from our own `qte` and must not be contradicted.
     *   · `source_list_price` is a foreign price in a foreign currency.
     *
     * ── NULL FOR ALL 309 LEGACY PRODUCTS, STRUCTURALLY ────────────────────────────────────
     * The relation is `external_catalog_products.product_id`, which only promotion ever writes. A
     * hand-made product has no such row, so this returns null, so the storefront renders exactly
     * what it renders today. Returning null rather than an array of nulls matters: the two product
     * views test the block for existence, and an object full of nulls would render an empty section.
     *
     * ── AND `content`, WHICH IS THE TRANSCRIBED PAGE ──────────────────────────────────────
     * The list above was written when the source gave us nothing but a name, a price and a pack. It
     * now gives us the manufacturer's own overview, suggested use, ingredient list, warnings and
     * Supplement Facts panel, plus a real image gallery. The overview is not in this block — it was
     * folded into `description_fr` at promotion time, and returning it here as well would put the
     * same paragraph on the page twice.
     *
     * Everything in `content` is decided by App\Services\Catalog\ImportedSourceContent, and it is
     * decided THERE rather than here for one reason: CatalogIHerbPromote and
     * frontend/src/util/productSourceFacts.ts have to agree with this method about what a page
     * publishes, and three independent derivations of that rule drift into either cloaking (a fact
     * on the crawler route only) or invisibility (a fact on the human route only).
     *
     * `content` is NULL — not an empty object — when the row has nothing publishable, so the two
     * views can test it for existence and render no empty headings. It is null for every legacy
     * product twice over: they have no staging row at all, and the block is skipped before it is
     * built.
     *
     * @return array{format: ?string, flavour: ?string, image_url: ?string, content: ?array<string, mixed>}|null
     */
    private function sourceFacts(): ?array
    {
        $source = $this->resource->relationLoaded('externalCatalogSource')
            ? $this->resource->getRelation('externalCatalogSource')
            : null;

        if ($source === null) {
            return null;
        }

        // Built by the normaliser, not here: it owns the French number formatting AND the rule that
        // a mg/µg "pack unit" is a per-unit dose and must not be printed as a conditionnement. A
        // second formatter here is how the specification row and the description paragraph end up
        // disagreeing about the same tub.
        $format = \App\Services\Catalog\IHerb\IHerbNormalizer::packLabel($source->pack_size, $source->pack_unit);
        $flavour = trim((string) ($source->flavour ?? '')) ?: null;
        $imageUrl = trim((string) ($source->source_image_url ?? '')) ?: null;

        $content = $this->sourceContent($source);

        // A row that yielded no printable fact gets no block at all, rather than an empty heading.
        // `content` counts: a row whose NAME gave up nothing can still have a transcribed page, and
        // returning null then would throw away every paragraph of it.
        if ($format === null && $flavour === null && $content === null) {
            return null;
        }

        return [
            'format' => $format,
            'flavour' => $flavour,
            // Not rendered as a second image anywhere — `cover` already holds this URL. Exposed so
            // the storefront can tell a referenced CDN cover from a mirrored local one without
            // re-deriving it from a part number.
            'image_url' => $imageUrl,
            'content' => $content,
        ];
    }

    /**
     * The transcribed product page, in the shape both product routes render.
     *
     * ── EVERY DECISION IS ImportedSourceContent'S, NOT THIS METHOD'S ──────────────────────
     * Which language may be published, which sections exist and in what order, which specification
     * rows are printable, how a thumbnail URL becomes a full-size one, and what the page says about
     * where the words came from. This method calls that class and assembles the JSON; it decides
     * nothing, which is exactly what stops the API and the promotion command from disagreeing about
     * the same row.
     *
     * `attribution` is a rendered sentence rather than two raw flags. The locale and the
     * machine-translation boolean are what the DATABASE holds; what a customer needs is one sentence
     * saying the text was transcribed, that the French may be a machine translation, and that the
     * printed label governs. Composing it server-side means one wording on both routes instead of
     * two, and means the frontend cannot accidentally render "machine_translated: false" as a claim.
     *
     * @return array<string, mixed>|null
     */
    private function sourceContent(\App\Models\ExternalCatalogProduct $source): ?array
    {
        // attributesToArray(), not getAttributes(): the model's casts turn `source_gallery_images`
        // into an array and `source_content_translated` into a real bool. ImportedSourceContent
        // tolerates both forms, and handing it the cast form is what keeps this endpoint's output
        // independent of what the driver happened to return.
        $row = $source->attributesToArray();

        $sections = ImportedSourceContent::sections($row);
        $nutrition = ImportedSourceContent::nutritionHtml($row);
        $specs = ImportedSourceContent::specs($row);
        $gallery = ImportedSourceContent::gallery($row);

        if ($sections === [] && $nutrition === null && $specs === [] && $gallery === []) {
            return null;
        }

        return [
            // list<{key, heading, html}> — the prose blocks, in the order both routes print them.
            'sections' => $sections,
            // The Supplement Facts panel. Rendered in the page's nutrition slot, AFTER any
            // hand-transcribed `nutrition_values`, because a panel read off the physical lot beats a
            // panel transcribed from a retailer's rendering of it.
            'nutrition_html' => $nutrition,
            // list<{key, label, value}> — merged into the existing specification list by the views.
            'specs' => $specs,
            // list<string> — product photographs the source page listed, at the size the cover uses.
            'gallery' => $gallery,
            'attribution' => ImportedSourceContent::attribution($row),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $coverMedia
     */
    private function resolveCoverImageAlt(?array $coverMedia): ?string
    {
        foreach (['seo_image_alt', 'alt_cover'] as $field) {
            $v = trim((string) ($this->resource->{$field} ?? ''));
            if ($v !== '') {
                return $v;
            }
        }

        $lib = trim((string) ($coverMedia['alt_text'] ?? ''));
        if ($lib !== '') {
            return $lib;
        }

        // Deliberately NULL rather than falling back to designation_fr.
        //
        // The storefront treats a non-empty seo.image_alt as an ADMIN-AUTHORED alt and returns it
        // verbatim (util/productAlt.ts: "an admin-authored alt always wins"). Returning the bare
        // product name here therefore looked like a deliberate choice and permanently suppressed
        // buildProductAlt's richer "Name — Brand — Tunisie" text — for the 279 of 303 products
        // whose alt_cover is empty, i.e. almost the whole catalogue. Googlebot was served
        // alt="CREATINE MONOHYDRATE OSTROVIT- 500GR": no brand, no locality, on the single
        // strongest ranking signal Google Images has.
        //
        // Null lets the storefront's builder own the fallback, in ONE place. Anything genuinely
        // authored — seo_image_alt, alt_cover, the media library's alt_text — still wins above.
        return null;
    }

    private function resolveCanonicalProductUrl(): string
    {
        $custom = trim((string) ($this->seo_canonical_url ?? ''));
        if ($custom !== '' && (str_starts_with($custom, 'http://') || str_starts_with($custom, 'https://'))) {
            return $custom;
        }

        $frontend = StorefrontUrl::base();
        $slug = trim((string) ($this->slug ?? ''));

        return $slug !== '' ? "{$frontend}/shop/{$slug}" : $frontend.'/shop';
    }
}
