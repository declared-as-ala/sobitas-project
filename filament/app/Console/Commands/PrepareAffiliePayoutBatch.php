<?php

namespace App\Console\Commands;

use App\Enums\AffiliePayoutStatus;
use App\Enums\AffilieStatus;
use App\Models\Affilie;
use App\Models\AffiliePayout;
use App\Services\AffilieTransactionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * THE FRIDAY BATCH. IT PREPARES. IT DOES NOT PAY.
 *
 * ── WHY THIS COMMAND HAS NO AUTHORITY TO MOVE MONEY ─────────────────────────────────────────
 * Everything else on this schedule is reversible. A bad SEO description is edited; a wrongly
 * promoted product is unpublished. A bank transfer to an affiliate is neither: it is gone, and
 * getting it back means asking a person to send it back.
 *
 * A cron that pays is also the exact shape affiliate fraud wants. The whole scheme — enter orders
 * against numbers you know, collect the commission — only pays out if nobody is looking at the
 * moment money leaves. So this command writes `affilie_payouts` rows with status `pending` and
 * stops. An admin opens Filament, sees the amounts and the names, and confirms; that calls
 * `AffilieTransactionService::payPreparedPayout()`, which re-derives every figure under a row lock
 * and is the ONLY code in this application that turns a batch into a ledger payment.
 *
 * A `pending` payout row moves no balance. Until a human confirms it, this command has changed
 * nothing except what is on an admin's screen on Friday morning.
 *
 * ── WHAT "PAYABLE" MEANS HERE ───────────────────────────────────────────────────────────────
 *     payable = current_balance − commission earned on orders Aramex has not yet remitted
 *
 * Both COD gates, in one line. `livree` EARNS the commission; `cod_remitted_at` makes it PAYABLE.
 * The gap between them is real money the shop does not have yet, and paying across it means
 * lending an affiliate the shop's own working capital against a courier's scan.
 *
 * Return-fee debts and reversals are already negative rows inside `current_balance`, so they net
 * off automatically — an affiliate carrying a −30 DT debt who then earns 50 DT is batched for 20,
 * and there is no special case anywhere that performs that subtraction.
 */
class PrepareAffiliePayoutBatch extends Command
{
    protected $signature = 'affilies:prepare-payout-batch
        {--dry-run : Report what would be prepared and write nothing}
        {--affilie= : Restrict to a single affilie id}
        {--min= : Override the minimum batch amount from config}';

    protected $description = 'Assemble affilie payouts as PENDING rows for an admin to confirm. Never pays.';

    private int $prepared = 0;

    private int $skippedExisting = 0;

    private int $skippedSmall = 0;

    private int $skippedNothing = 0;

    private float $totalAmount = 0.0;

    /** @var array<int, array<int, string|int>> */
    private array $rows = [];

    public function handle(AffilieTransactionService $service): int
    {
        if (! Schema::hasTable('affilies') || ! Schema::hasTable('affilie_payouts')) {
            $this->warn('affilies / affilie_payouts absent — rien à faire.');

            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $minBatch = $this->option('min') !== null
            ? (float) $this->option('min')
            : (float) config('affilies.payout.min_batch_amount', 20.0);

        $query = Affilie::query()->where('status', AffilieStatus::Active->value);
        if ($this->option('affilie')) {
            $query->whereKey((int) $this->option('affilie'));
        }

        /*
         * chunkById, not cursor(): this loop WRITES on every iteration, and an open unbuffered
         * cursor plus a write on the same connection is a failure that only appears on the
         * production driver. Ordered paging by primary key is boring and cannot surprise us.
         */
        $query->orderBy('id')->chunkById(100, function ($affilies) use ($service, $dryRun, $minBatch): void {
            foreach ($affilies as $affilie) {
                try {
                    $this->prepareFor($affilie, $service, $dryRun, $minBatch);
                } catch (\Throwable $e) {
                    // One broken affiliate must not stop the batch for the other thirty.
                    Log::error('Affilie payout batch: affiliate skipped', [
                        'affilie_id' => $affilie->id,
                        'error' => $e->getMessage(),
                    ]);
                    $this->error(sprintf('Affilié #%d ignoré: %s', $affilie->id, $e->getMessage()));
                }
            }
        });

        if ($this->rows !== []) {
            $this->table(['ID', 'Affilié', 'Solde', 'Non remis', 'Payable', 'État'], $this->rows);
        }

        $this->info(sprintf(
            '%s: %d lot(s) pour %s DT · %d déjà en attente · %d sous le minimum (%s DT) · %d sans montant payable.',
            $dryRun ? 'DRY-RUN' : 'Lots affiliés',
            $this->prepared,
            number_format($this->totalAmount, 3),
            $this->skippedExisting,
            $this->skippedSmall,
            number_format($minBatch, 3),
            $this->skippedNothing,
        ));
        $this->line('Aucun paiement effectué. Les lots doivent être confirmés dans Filament.');

        Log::info('Affilie payout batch prepared', [
            'dry_run' => $dryRun,
            'prepared' => $this->prepared,
            'total_amount' => $this->totalAmount,
            'skipped_existing_pending' => $this->skippedExisting,
            'skipped_below_minimum' => $this->skippedSmall,
            'skipped_nothing_payable' => $this->skippedNothing,
        ]);

        return self::SUCCESS;
    }

    private function prepareFor(Affilie $affilie, AffilieTransactionService $service, bool $dryRun, float $minBatch): void
    {
        $balance = round((float) ($affilie->current_balance ?? 0), 3);
        $held = $service->unremittedCommission($affilie);
        $payable = $service->payableBalance($affilie);

        /*
         * ONE PENDING BATCH PER AFFILIATE AT A TIME.
         *
         * Without this, a Friday where nobody confirms is followed by a Friday that prepares the
         * SAME money again. Two pending rows against one balance, and an admin clearing the queue
         * pays twice — the second one looking perfectly legitimate to `payPreparedPayout()`,
         * because the first has not been settled either and so has not yet reduced the balance it
         * checks against. This guard is why the command is safe to leave running unattended.
         */
        $hasPending = AffiliePayout::query()
            ->where('affilie_id', $affilie->id)
            ->where('status', AffiliePayoutStatus::Pending->value)
            ->exists();

        if ($hasPending) {
            $this->skippedExisting++;
            $this->row($affilie, $balance, $held, null, 'lot en attente');

            return;
        }

        if ($payable <= 0.0001) {
            // Nothing earned, or everything earned is still with the courier, or the affiliate is
            // carrying a debt. All three mean no payout this week. A negative balance is carried
            // forward as a debt — never "paid" as a zero.
            $this->skippedNothing++;
            $this->row($affilie, $balance, $held, null, $balance < 0 ? 'dette reportée' : 'rien à payer');

            return;
        }

        if ($payable + 0.0001 < $minBatch) {
            $this->skippedSmall++;
            $this->row($affilie, $balance, $held, $payable, 'sous le minimum');

            return;
        }

        if (! $dryRun) {
            $amount = $this->writeBatch($affilie, $service, $payable, $balance, $held);
            if ($amount === null) {
                $this->skippedNothing++;
                $this->row($affilie, $balance, $held, null, 'annulé au recontrôle');

                return;
            }
            $payable = $amount;
        }

        $this->prepared++;
        $this->totalAmount = round($this->totalAmount + $payable, 3);
        $this->row($affilie, $balance, $held, $payable, $dryRun ? 'DRY-RUN' : 'préparé');
    }

    /**
     * Write the pending payout row, re-deriving every figure under a row lock.
     *
     * @return float|null the amount batched, or null if the recheck says there is nothing to batch
     */
    private function writeBatch(
        Affilie $affilie,
        AffilieTransactionService $service,
        float $payable,
        float $balance,
        float $held,
    ): ?float {
        return DB::transaction(function () use ($affilie, $service, $payable, $balance, $held): ?float {
            /** @var Affilie $locked */
            $locked = Affilie::query()->whereKey($affilie->id)->lockForUpdate()->firstOrFail();

            // The figures above were computed outside this transaction; a delivery, a remittance
            // or a return may have landed in between. The locked read is the one that counts.
            $confirmed = $service->payableBalance($locked);
            if ($confirmed <= 0.0001) {
                return null;
            }

            $stillPending = AffiliePayout::query()
                ->where('affilie_id', $locked->id)
                ->where('status', AffiliePayoutStatus::Pending->value)
                ->lockForUpdate()
                ->exists();

            if ($stillPending) {
                return null; // Another run of this command won the race.
            }

            // Never batch more than the recheck allows, and never more than the batch was built
            // from. The smaller of the two is the only defensible number.
            $amount = round(min($payable, $confirmed), 3);

            AffiliePayout::query()->create([
                'affilie_id' => $locked->id,
                'amount' => $amount,
                'status' => AffiliePayoutStatus::Pending,
                'paid_at' => null,
                'payment_reference' => null,
                'admin_note' => sprintf(
                    "Lot préparé automatiquement le %s.\nSolde: %s DT · Non remis (COD): %s DT · Payable: %s DT.\n"
                    ."À CONFIRMER par un administrateur — aucun paiement n'a été effectué.",
                    now()->format('d/m/Y H:i'),
                    number_format($balance, 3),
                    number_format($held, 3),
                    number_format($amount, 3),
                ),
                // No authenticated user on a scheduled run. Null is the honest answer, and it is
                // what distinguishes a batch the machine assembled from one a person did.
                'created_by' => Auth::id(),
            ]);

            Log::info('Affilie payout batch row prepared', [
                'affilie_id' => $locked->id,
                'amount' => $amount,
                'balance' => $balance,
                'unremitted' => $held,
            ]);

            return $amount;
        });
    }

    private function row(Affilie $affilie, float $balance, float $held, ?float $payable, string $state): void
    {
        $this->rows[] = [
            $affilie->id,
            (string) ($affilie->name ?? '—'),
            number_format($balance, 3),
            number_format($held, 3),
            $payable === null ? '—' : number_format($payable, 3),
            $state,
        ];
    }
}
