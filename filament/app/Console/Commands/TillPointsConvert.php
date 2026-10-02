<?php

namespace App\Console\Commands;

use App\Services\TillPointsConversion;
use Illuminate\Console\Command;

/**
 * Re-runnable shop-till card conversion to 20 pts = 1 DT (balances doubled once, same DT value).
 *
 * The deploy migration 2026_09_29_000300 runs the same service and never throws; when it logs a
 * failure, or protinas:audit lists cards left behind, this converts them. Idempotent: a card that
 * already has the conversion row is skipped.
 *
 *   php artisan protinas:till-convert           dry run: what would be converted, writes nothing
 *   php artisan protinas:till-convert --apply   converts every card not yet converted
 */
class TillPointsConvert extends Command
{
    protected $signature = 'protinas:till-convert {--apply : Write the conversion (default: dry run)}';

    protected $description = 'Double every shop-till card balance once for the 20 pts = 1 DT scale (idempotent)';

    public function handle(TillPointsConversion $conversion): int
    {
        $apply = (bool) $this->option('apply');
        $result = $conversion->run(! $apply);

        if ($result['status'] !== 'ok') {
            $this->warn('Nothing converted: '.$result['status'].' (till points_per_dt must be 20 and the till tables must exist).');

            return self::SUCCESS;
        }
        $this->info(sprintf('%s: %d %s · %d already converted · %d with nothing to convert · %d failed',
            $apply ? 'Applied' : 'Dry run', $result['converted'], $apply ? 'converted' : 'to convert',
            $result['already_converted'], $result['nothing_to_convert'], $result['failed']));
        if ($result['failed_client_ids'] !== []) {
            $this->error('Failed clients: '.implode(', ', array_map(fn ($id) => '#'.$id, $result['failed_client_ids']))
                .' — see laravel.log for the database error.');
        }
        if ($apply) {
            $left = TillPointsConversion::unconvertedClientIds();
            $this->line($left === [] ? 'No card left unconverted.'
                : 'Still unconverted: '.implode(', ', array_map(fn ($id) => '#'.$id, $left)));
        } else {
            $this->comment('Dry run: nothing was written. Re-run with --apply.');
        }

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
