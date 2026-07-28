<?php

namespace App\Observers;

use App\Services\Seo\SeoNotifier;
use Illuminate\Database\Eloquent\Model;

/**
 * Keep /sitemap.xml in step with the catalogue.
 *
 * The storefront memoises the whole sitemap crawl for an hour (unstable_cache, tag "sitemap").
 * Products already busted that tag on save via ProductSeoObserver -> SeoNotifier, but nothing else
 * did: renaming a category, publishing an article, adding a brand or editing a CMS page left the
 * sitemap — including every <lastmod> in it — up to an hour stale. This observer is attached to all
 * of those models so any create/update/delete refreshes it immediately.
 *
 * Deliberately generic: it carries no per-model logic, because a sitemap change is a sitemap
 * change. Attaching it to a new model is one line in AppServiceProvider.
 *
 * Cost is one fire-and-forget HTTP call over the internal docker network AFTER the response is
 * flushed, and it is swallowed on failure — an admin save can never break or block on it.
 */
class SitemapTouchObserver
{
    public function created(Model $model): void
    {
        $this->touch();
    }

    public function updated(Model $model): void
    {
        $this->touch();
    }

    public function deleted(Model $model): void
    {
        $this->touch();
    }

    public function restored(Model $model): void
    {
        $this->touch();
    }

    private function touch(): void
    {
        app(SeoNotifier::class)->sitemapChanged();
    }
}
