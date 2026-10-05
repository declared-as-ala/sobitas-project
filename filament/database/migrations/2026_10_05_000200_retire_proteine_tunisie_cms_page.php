<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * /proteine-tunisie folds into /proteines (301 in frontend/redirects.js, 05/10/2026).
 *
 * The CMS guide (id 9) is product-less and its URL is the head term: 3 m to 19/09 it took 2 clicks
 * / 684 impressions @56.9, and over the 28 d to 05/10 it took 0 clicks, @85 on « protein tunisie »
 * and @80 on « proteine tunisie », while /proteines climbed from 47.6 to 13.7 on the same query.
 * Its « comment choisir » intent is already answered by /proteines' guide and FAQ. The redirect
 * moves the traffic; this takes the row out of the published set so /sitemaps/pages.xml stops
 * listing a URL that now redirects and the footer's « Services & Ventes » list (GET /api/pages,
 * status = ACTIVE) stops linking it. The body is kept (status only), so `down()` restores the page
 * exactly.
 *
 * DEPLOY ORDER: frontend first, this migration after. The frontend no longer depends on it — the
 * 301s live in redirects.js and RETIRED_CMS_PAGES (cmsPageSeoConfig.ts) drops the slug from the
 * footer and pages.xml whatever this row says — so it is DB hygiene only. Run against the OLD
 * frontend (no redirect yet) it would turn /proteine-tunisie into a 404 and, once the 10-minute
 * page cache expires, /page/proteine-tunisie into a 410. deploy-filament and deploy-frontend start
 * in parallel from one push, so land this file in a later push than the frontend change.
 */
return new class extends Migration
{
    private const SLUG = 'proteine-tunisie';

    public function up(): void
    {
        if (! Schema::hasTable('pages') || ! Schema::hasColumn('pages', 'status')) {
            return;
        }
        DB::table('pages')->where('slug', self::SLUG)->where('status', 'ACTIVE')->update(['status' => 'INACTIVE']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('pages') || ! Schema::hasColumn('pages', 'status')) {
            return;
        }
        DB::table('pages')->where('slug', self::SLUG)->where('status', 'INACTIVE')->update(['status' => 'ACTIVE']);
    }
};
