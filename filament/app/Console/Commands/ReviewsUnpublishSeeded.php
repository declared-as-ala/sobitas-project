<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Unpublish the seeded review backlog — INERT until the owner runs it with --apply.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────────────────────
 * Measured 05/10/2026: 111 of the 148 in-stock product pages show the seeded backlog — 285
 * recycled texts, republished on 21/09/2026 by reviews:publish-backlog — signed by persona
 * accounts (users with no role) and by staff test accounts. None of it can move a star rating
 * (Review::scopeAttested requires verified = 1 or a commande_id, and these rows have neither), but
 * a shopper reads them, and a supplement shop showing invented reviews is a trust problem whatever
 * Google does or does not see.
 *
 * ── WHAT IT SELECTS ─────────────────────────────────────────────────────────────────────────
 *   reviews.publier = 1
 *   AND (verified IS NULL OR verified <> 1)
 *   AND commande_id IS NULL
 *   AND (   (user_id IS NULL AND author_name IS NULL AND ip_hash IS NULL)
 *        OR (user_id IS NOT NULL AND (the user's role_id IS NULL OR role_id NOT IN (2, 4))) )
 *                                                                               [LEFT JOIN users]
 *
 * i.e. unattested reviews written by nobody, by a persona with no role (or a deleted user), or by
 * a staff account. Genuine role-2 customers' and role-4 affiliates' reviews are NOT selected.
 *
 * Nor are GUEST reviews from the live form (POST /api/reviews/guest, ReviewThreadController::
 * storeGuestReview, live since 21/08): they are user_id NULL and unattested too, but that form
 * always writes `author_name` (the typed name or 'Anonyme') and `ip_hash`, which the legacy backlog
 * predates — it has neither (see Review::getDisplayNameAttribute). They are real shoppers' words,
 * negative ones included, and are reported as their own « kept » bucket. Each column is used only
 * when it can be read.
 *
 * The report also counts, WITHOUT selecting them, role-2/4 reviews whose text is byte-for-byte
 * (case- and whitespace-insensitive) one of the selected texts: the seeded pool was also signed
 * with real customer accounts, and that bucket is the owner's call, not this command's.
 *
 * ── HOW ─────────────────────────────────────────────────────────────────────────────────────
 *   (default)  dry-run report: totals, products, in-stock products, buckets, sample ids.
 *   --apply    snapshot the ids into `reviews_unpublished_backup_20261005`, then publier = 0 in
 *              chunks. Idempotent: a second run finds nothing left to select.
 *   --restore  publier = 1 again for every snapshotted id that is currently 0.
 *
 * Direct chunked UPDATEs, like reviews:publish-backlog: a model save would fire ReviewObserver for
 * every row. Checked what that observer would have done on `publier` changing, so nothing is lost:
 *   - no cached product rating exists to recompute: `products.note` is a legacy column (NULL on
 *     every row) and every star figure is computed live from Review::attested() (ApisController
 *     withCount/withAvg, ProductSchemaBuilder) — and these rows are not attested anyway;
 *   - the PDP refresh (SeoNotifier::productChanged) is not needed: product data is fetched with a
 *     60-second cache (frontend/src/services/api.ts, product_details) and the PDP renders
 *     dynamically, so the reviews disappear within a minute;
 *   - points: ReviewObserver claws back points on unpublish. The report prints how many selected
 *     rows carry `points_awarded = 1`; this command does NOT touch the Protinas ledger.
 *
 * NOT scheduled and NOT called from any migration: the owner runs it after signing off.
 */
class ReviewsUnpublishSeeded extends Command
{
    protected $signature = 'reviews:unpublish-seeded
                            {--apply : Snapshot the selected ids, then set publier = 0 (report only without it)}
                            {--restore : Set publier = 1 again for every snapshotted id that is currently 0}';

    protected $description = 'Unpublish unattested reviews signed by nobody, a role-less persona or a staff account (dry-run by default; --apply / --restore)';

    private const BACKUP_TABLE = 'reviews_unpublished_backup_20261005';

    /** Customers (2) and affiliates (4): their reviews are never selected. */
    private const KEPT_ROLES = [2, 4];

    private const CHUNK = 1000;

    /** Columns the live guest form always writes; the seeded backlog has none of them. */
    private const GUEST_FORM_COLUMNS = ['author_name', 'ip_hash'];

    /** @var list<string>|null readable GUEST_FORM_COLUMNS, resolved once */
    private ?array $guestColumns = null;

    public function handle(): int
    {
        $apply   = (bool) $this->option('apply');
        $restore = (bool) $this->option('restore');

        if ($apply && $restore) {
            $this->error('--apply and --restore are mutually exclusive.');

            return self::FAILURE;
        }

        foreach ([['reviews', 'publier'], ['reviews', 'verified'], ['reviews', 'commande_id'], ['reviews', 'user_id'], ['reviews', 'product_id'], ['users', 'role_id']] as [$table, $column]) {
            if (! $this->canRead($table, $column)) {
                $this->error("{$table}.{$column} cannot be read — nothing done.");

                return self::FAILURE;
            }
        }

        if ($restore) {
            return $this->restore();
        }

        $ids = $this->report();

        if (! $apply) {
            $this->newLine();
            $this->info('DRY RUN — nothing changed. Re-run with --apply to unpublish (reversible with --restore).');

            return self::SUCCESS;
        }

        if ($this->guestColumns() === []) {
            $this->error('Guest reviews from the live form cannot be told apart from the backlog (author_name / ip_hash unreadable) — nothing done.');

            return self::FAILURE;
        }

        return $this->apply($ids);
    }

    /** The selection, as a fresh query each time (callers add their own projections). */
    private function selection(): Builder
    {
        return DB::table('reviews as r')
            ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->where('r.publier', 1)
            ->where(function (Builder $q): void {
                $q->whereNull('r.verified')->orWhere('r.verified', '<>', 1);
            })
            ->whereNull('r.commande_id')
            ->where(function (Builder $q): void {
                // No author at all: the legacy backlog. A guest review from the live form is kept.
                $q->where(function (Builder $nobody): void {
                    $nobody->whereNull('r.user_id');
                    foreach ($this->guestColumns() as $column) {
                        $nobody->whereNull('r.'.$column);
                    }
                })
                    // An account: a role-less persona, a deleted user, or staff. A guest row also has
                    // u.role_id NULL through the LEFT JOIN, hence the user_id test.
                    ->orWhere(function (Builder $account): void {
                        $account->whereNotNull('r.user_id')
                            ->where(function (Builder $role): void {
                                $role->whereNull('u.role_id')->orWhereNotIn('u.role_id', self::KEPT_ROLES);
                            });
                    });
            });
    }

    /**
     * Published, unattested, user_id NULL rows written by the live guest form — never selected.
     * Null when no guest-form column can be read (then nothing tells them apart, and the report
     * says so).
     */
    private function guestFormReviews(): ?Builder
    {
        $columns = $this->guestColumns();
        if ($columns === []) {
            return null;
        }

        return DB::table('reviews as r')
            ->where('r.publier', 1)
            ->where(function (Builder $q): void {
                $q->whereNull('r.verified')->orWhere('r.verified', '<>', 1);
            })
            ->whereNull('r.commande_id')
            ->whereNull('r.user_id')
            ->where(function (Builder $q) use ($columns): void {
                foreach ($columns as $column) {
                    $q->orWhereNotNull('r.'.$column);
                }
            });
    }

    /** @return list<string> */
    private function guestColumns(): array
    {
        return $this->guestColumns ??= array_values(array_filter(
            self::GUEST_FORM_COLUMNS,
            fn (string $column): bool => $this->canRead('reviews', $column),
        ));
    }

    /**
     * Print the dry-run report and return the selected ids.
     *
     * @return Collection<int, int>
     */
    private function report(): Collection
    {
        $ids = $this->selection()->orderBy('r.id')->pluck('r.id')->map(fn ($id) => (int) $id)->values();

        $products = $this->selection()->distinct()->count('r.product_id');

        $inStock = 0;
        if ($this->canRead('products', 'qte')) {
            $inStock = $this->selection()
                ->join('products as p', 'p.id', '=', 'r.product_id')
                ->where('p.qte', '>', 0)
                ->distinct()
                ->count('r.product_id');
        }

        $nullUser = $this->selection()->whereNull('r.user_id')->count('r.id');
        $nullRole = $this->selection()->whereNotNull('r.user_id')->whereNull('u.role_id')->count('r.id');
        $staff    = $this->selection()->whereNotNull('u.role_id')->whereNotIn('u.role_id', self::KEPT_ROLES)->count('r.id');

        $this->info(sprintf('Selected: %d published, unattested review(s) on %d product(s), %d of them in stock (qte > 0).', $ids->count(), $products, $inStock));
        $this->line(sprintf('  no user, no author (legacy backlog)  : %d', $nullUser));
        $this->line(sprintf('  role-less persona or deleted user    : %d', $nullRole));
        $this->line(sprintf('  staff account (role not in 2, 4)     : %d', $staff));

        if ($staff > 0) {
            $byRole = $this->selection()
                ->whereNotNull('u.role_id')
                ->whereNotIn('u.role_id', self::KEPT_ROLES)
                ->groupBy('u.role_id')
                ->selectRaw('u.role_id as role_id, COUNT(*) as n')
                ->pluck('n', 'role_id');
            foreach ($byRole as $role => $n) {
                $this->line(sprintf('      role %s: %d', $role, $n));
            }
        }

        $this->line('  sample review ids                    : ' . ($ids->isEmpty() ? '—' : $ids->take(5)->implode(', ')));

        if ($this->canRead('reviews', 'points_awarded')) {
            $paid = $this->selection()->where('r.points_awarded', 1)->count('r.id');
            $this->line(sprintf('  carrying points_awarded = 1          : %d (Protinas ledger NOT touched by this command)', $paid));
        }

        $this->newLine();
        $guests = $this->guestFormReviews();
        if ($guests === null) {
            $this->warn('Kept: guest reviews from the live form — UNKNOWN: neither reviews.author_name nor reviews.ip_hash can be read,');
            $this->warn('  so guest reviews cannot be told apart from the backlog and sit in « no user » above. Do not --apply.');
        } else {
            $this->line(sprintf(
                'Kept (NOT selected): %d guest review(s) from the live form (user_id NULL, with %s) on %d product(s).',
                (clone $guests)->count('r.id'),
                implode(' or ', $this->guestColumns()),
                (clone $guests)->distinct()->count('r.product_id')
            ));
        }

        $this->reportRecycledOnKeptAccounts();

        return $ids;
    }

    /**
     * Informational only: role-2/4 reviews (kept by the selection) whose text is one of the
     * selected texts. The seeded pool was signed with real customer accounts too — on 05/10/2026
     * /serious-mass-5-45-kg-optimum-nutrition showed 26 role-2 rows with pool texts such as
     * "Vanilla طعمها هايل." and "Omega 3 qualité." on a mass gainer. Nothing here is unpublished.
     */
    private function reportRecycledOnKeptAccounts(): void
    {
        if (! $this->canRead('reviews', 'comment')) {
            return;
        }

        $pool = [];
        $this->selection()
            ->select(['r.id', 'r.comment'])
            ->orderBy('r.id')
            ->chunk(5000, function (Collection $rows) use (&$pool): void {
                foreach ($rows as $row) {
                    $key = $this->normaliseText((string) $row->comment);
                    if ($key !== '') {
                        $pool[$key] = true;
                    }
                }
            });

        $kept = 0;
        $recycled = 0;
        $accounts = [];
        $products = [];

        DB::table('reviews as r')
            ->join('users as u', 'u.id', '=', 'r.user_id')
            ->where('r.publier', 1)
            ->where(function (Builder $q): void {
                $q->whereNull('r.verified')->orWhere('r.verified', '<>', 1);
            })
            ->whereNull('r.commande_id')
            ->whereIn('u.role_id', self::KEPT_ROLES)
            ->select(['r.id', 'r.comment', 'r.user_id', 'r.product_id'])
            ->orderBy('r.id')
            ->chunk(5000, function (Collection $rows) use ($pool, &$kept, &$recycled, &$accounts, &$products): void {
                foreach ($rows as $row) {
                    $kept++;
                    if (isset($pool[$this->normaliseText((string) $row->comment)])) {
                        $recycled++;
                        $accounts[(int) $row->user_id] = true;
                        $products[(int) $row->product_id] = true;
                    }
                }
            });

        $this->newLine();
        $this->line(sprintf('Kept (NOT selected): %d published, unattested review(s) signed by role-2/4 accounts.', $kept));
        $this->line(sprintf(
            '  of which %d carry a text also found on a selected review (%d account(s), %d product(s)) — owner decision, untouched here.',
            $recycled,
            count($accounts),
            count($products)
        ));
    }

    /**
     * @param  Collection<int, int>  $ids
     */
    private function apply(Collection $ids): int
    {
        if ($ids->isEmpty()) {
            $this->info('Nothing selected — nothing to unpublish (already applied?).');

            return self::SUCCESS;
        }

        if (! Schema::hasTable(self::BACKUP_TABLE)) {
            Schema::create(self::BACKUP_TABLE, function (Blueprint $table): void {
                $table->unsignedBigInteger('review_id')->primary();
                $table->timestamp('unpublished_at')->nullable();
            });
            $this->line('Created ' . self::BACKUP_TABLE . '.');
        }

        // Snapshot FIRST, so the change is precisely reversible even if the run dies half-way.
        $now = now();
        $snapshotted = 0;
        foreach ($ids->chunk(self::CHUNK) as $chunk) {
            $snapshotted += DB::table(self::BACKUP_TABLE)->insertOrIgnore(
                $chunk->map(fn (int $id) => ['review_id' => $id, 'unpublished_at' => $now])->values()->all()
            );
        }

        $touchUpdatedAt = $this->canRead('reviews', 'updated_at');
        $unpublished = 0;
        $products = [];
        foreach ($ids->chunk(self::CHUNK) as $chunk) {
            $list = $chunk->values()->all();
            foreach (DB::table('reviews')->whereIn('id', $list)->distinct()->pluck('product_id') as $productId) {
                $products[(int) $productId] = true;
            }

            $values = ['publier' => 0];
            if ($touchUpdatedAt) {
                $values['updated_at'] = $now;
            }
            $unpublished += DB::table('reviews')
                ->whereIn('id', $list)
                ->where('publier', 1)
                ->update($values);
        }

        $this->info(sprintf(
            'APPLIED: %d review(s) unpublished across %d product(s); %d new id(s) snapshotted in %s (%d selected).',
            $unpublished,
            count($products),
            $snapshotted,
            self::BACKUP_TABLE,
            $ids->count()
        ));
        $this->line('Product pages drop them within a minute (60 s product data cache). Undo: php artisan reviews:unpublish-seeded --restore');

        return self::SUCCESS;
    }

    private function restore(): int
    {
        if (! Schema::hasTable(self::BACKUP_TABLE)) {
            $this->warn(self::BACKUP_TABLE . ' does not exist — nothing was ever applied, nothing to restore.');

            return self::SUCCESS;
        }

        $ids = DB::table(self::BACKUP_TABLE)->orderBy('review_id')->pluck('review_id')->map(fn ($id) => (int) $id)->values();
        if ($ids->isEmpty()) {
            $this->info('The backup table is empty — nothing to restore.');

            return self::SUCCESS;
        }

        $touchUpdatedAt = $this->canRead('reviews', 'updated_at');
        $restored = 0;
        $alreadyPublished = 0;
        $present = 0;
        foreach ($ids->chunk(self::CHUNK) as $chunk) {
            $list = $chunk->values()->all();
            $present += DB::table('reviews')->whereIn('id', $list)->count();
            $alreadyPublished += DB::table('reviews')->whereIn('id', $list)->where('publier', 1)->count();

            $values = ['publier' => 1];
            if ($touchUpdatedAt) {
                $values['updated_at'] = now();
            }
            $restored += DB::table('reviews')->whereIn('id', $list)->where('publier', 0)->update($values);
        }

        $this->info(sprintf(
            'RESTORED: %d review(s) republished; %d were already published; %d snapshotted id(s) no longer exist (of %d in %s).',
            $restored,
            $alreadyPublished,
            $ids->count() - $present,
            $ids->count(),
            self::BACKUP_TABLE
        ));

        return self::SUCCESS;
    }

    /** Lowercased, whitespace-collapsed text, so "Top. " and "top." are the same pool entry. */
    private function normaliseText(string $text): string
    {
        $text = mb_strtolower(trim($text), 'UTF-8');

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Can this command read `$table.$column`? A SELECT that touches the column, not a metadata
     * call — see SendDueReviewRequests::hasColumn for why Schema::hasColumn is not trusted here.
     */
    private function canRead(string $table, string $column): bool
    {
        try {
            DB::table($table)->select($column)->limit(1)->get();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
