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
    protected $description = 'Set all products to out of stock (qte = 0, rupture = 0)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Début de la mise à jour des produits "hors stock"...');

        try {
            DB::beginTransaction();

            // Update all products sets qte = 0 and rupture = 0 (false = out of stock)
            $affected = DB::table('products')->update([
                'qte' => 0,
                'rupture' => 0,
            ]);

            DB::commit();

            $message = "Opération réussie : {$affected} produits ont été passés hors stock (qte = 0).";
            
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
