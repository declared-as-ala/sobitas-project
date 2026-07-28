<?php

namespace App\Observers;

use App\Models\Page;
use App\Services\Seo\PageSeoDefaults;

/**
 * Same self-healing contract as ProductSeoObserver, for CMS pages: no page can ship without a meta
 * title and description. Templates live in PageSeoDefaults so this hook and the one-off backfill
 * migration cannot drift apart.
 */
class PageSeoObserver
{
    public function saving(Page $page): void
    {
        PageSeoDefaults::apply($page);
    }
}
