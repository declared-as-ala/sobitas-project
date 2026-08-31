<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Source taxonomy → protein.tn taxonomy. Explicit, never inferred.
 *
 * A null `sous_category_id` is meaningful: it records "this source category has been SEEN and not
 * yet mapped", which is a worklist entry, not an error. Products under it stay in staging, because
 * the subcategory decides the public URL (`/{subcat}/{slug}`) — guessing one means guessing a URL,
 * publishing it, letting Google index it, and having to redirect it later.
 */
class ExternalCategoryMapping extends Model
{
    protected $table = 'external_category_mappings';

    protected $guarded = ['id'];

    protected $casts = [
        'excluded' => 'boolean',
        'product_count' => 'integer',
    ];

    public function sousCategory(): BelongsTo
    {
        return $this->belongsTo(SousCategory::class, 'sous_category_id');
    }

    /**
     * Record that a source category exists, without ever touching a decision already made.
     *
     * `firstOrCreate` rather than `updateOrCreate` on purpose: a re-run must not reset an admin's
     * mapping or un-exclude a category somebody deliberately excluded.
     */
    /**
     * NOT named `observe()`. That name belongs to Eloquent.
     *
     * It was, and it fatally broke every hydration job in production on 10/08/2026:
     *
     *   Declaration of ExternalCategoryMapping::observe(string, ?string, string): self
     *   must be compatible with Illuminate\Database\Eloquent\Model::observe($classes)
     *
     * `Model::observe()` is Laravel's own static for REGISTERING OBSERVER CLASSES, so overriding
     * it with a different signature is a FatalError raised the instant the class is loaded - not
     * when the method is called. Every job that touched this class died at the class-load
     * boundary, after claim() had already moved its row to `hydrating` and before anything could
     * be written back. 500 dispatched jobs produced 0 hydrated rows and 0 recorded failures.
     *
     * Neither `php -l` nor any amount of reading catches this: the file is syntactically perfect
     * and the collision only exists once Eloquent's base class is in scope. One `php artisan`
     * invocation would have caught it immediately, and there is no PHP on the machine this was
     * written on - which is the actual lesson.
     */
    public static function remember(string $externalId, ?string $name, string $provider = 'iherb'): self
    {
        $mapping = self::firstOrCreate(
            ['provider' => $provider, 'external_category_id' => $externalId],
            ['external_category_name' => $name],
        );

        // The name is source-owned and safe to refresh; the mapping is ours and is not.
        if ($name !== null && $mapping->external_category_name !== $name) {
            $mapping->forceFill(['external_category_name' => $name])->save();
        }

        return $mapping;
    }

    public function isUsable(): bool
    {
        return ! $this->excluded && $this->sous_category_id !== null;
    }
}
