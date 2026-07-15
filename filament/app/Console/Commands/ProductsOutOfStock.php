<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductsOutOfStock extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:out-of-stock {--force : Skip the confirmation prompt (required for non-interactive runs)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set all products to out of stock (qte = 0, rupture = 1)';

    /**
     * Execute the console command.
     *
     * DESTRUCTIVE: overwrites the real qte of every in-stock product to 0. Guarded
     * behind an explicit confirmation / --force so it can NEVER run accidentally
     * (a bare run of this previously wiped the whole catalogue's quantities).
     */
    public function handle()
    {
        $count = (int) DB::table('products')->where('qte', '>', 0)->count();

        if (! $this->option('force')) {
            $this->warn("⚠  DESTRUCTIVE: this sets {$count} in-stock products to qte=0 / rupture=1 and OVERWRITES their real quantities (not reversible).");
            // In a non-interactive context (cron/CI) confirm() returns the default (false) → aborts.
            if (! $this->confirm('Are you absolutely sure you want to zero the stock of all products?', false)) {
                $this->info('Aborted — no changes made. (Use --force to run non-interactively.)');

                return Command::SUCCESS;
            }
        }

        $this->info('Début de la mise à jour des produits "hors stock"...');
        Log::warning("Command products:out-of-stock STARTED — will zero qte for {$count} products.");

        try {
            DB::beginTransaction();

            // Update only products that currently have stock (qte > 0) to out of stock: qte = 0, rupture = 1
            $affected = DB::table('products')
                ->where('qte', '>', 0)
                ->update([
                    'qte' => 0,
                    'rupture' => 1,
                ]);

            DB::commit();

            $message = "{$affected} products updated to stock = 0.";
            
            $this->info($message);
            Log::info("Command products:out-of-stock executed. " . $message);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            
            $errorMessage = "Erreur lors de la mise à jour : " . $e->getMessage();
            $this->error($errorMessage);
            Log::error("Command products:out-of-stock failed. " . $errorMessage);
            
            return Command::FAILURE;
        }
    }
}
