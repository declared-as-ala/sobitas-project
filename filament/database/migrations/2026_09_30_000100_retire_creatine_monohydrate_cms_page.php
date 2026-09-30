<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * /creatine-monohydrate-tunisie folds into /creatine (301 in frontend/redirects.js, 30/09/2026).
 *
 * The CMS guide competed with the category for « créatine monohydrate tunisie »: product-less, a
 * URL carrying the head term and a « Prix … 2026 » section. The redirect moves the traffic; this
 * takes the row out of the published set so /sitemaps/pages.xml stops listing a URL that now
 * redirects. The body is kept (status only), so `down()` restores the page exactly.
 */
return new class extends Migration
{
    private const SLUG = 'creatine-monohydrate-tunisie';

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
