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
    protected $signature = 'products:out-of-stock';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set all products to out of stock (qte = 0, rupture = 1)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Début de la mise à jour des produits "hors stock"...');

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
