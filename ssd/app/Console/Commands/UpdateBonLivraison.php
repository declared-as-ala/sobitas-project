<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use TCG\Voyager\Models\DataType;
use TCG\Voyager\Models\MenuItem;

class UpdateBonLivraison extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'update:bon-livraison';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update "Bon de commande" to "Bon de livraison" in database';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Updating database to change "Bon de commande" to "Bon de livraison"...');

        // Update data_types table
        $dataType = DataType::where('slug', 'commandes')
            ->orWhere('name', 'commandes')
            ->first();

        if ($dataType) {
            $dataType->display_name_singular = 'Bon de livraison';
            $dataType->display_name_plural = 'Bons de livraison';
            $dataType->save();
            $this->info('✓ Updated data_types table');
        } else {
            $this->warn('⚠ DataType "commandes" not found');
        }

        // Update menu_items table
        $menuItems = MenuItem::where('route', 'voyager.commandes.index')
            ->orWhere('route', 'like', '%commandes%')
            ->get();

        if ($menuItems->count() > 0) {
            foreach ($menuItems as $item) {
                $item->title = 'Bons de livraison';
                $item->save();
            }
            $this->info('✓ Updated ' . $menuItems->count() . ' menu item(s)');
        } else {
            $this->warn('⚠ No menu items found for commandes');
        }

        // Clear caches
        $this->call('cache:clear');
        $this->call('view:clear');
        $this->call('config:clear');
        
        $this->info('✓ Cleared all caches');
        $this->info('');
        $this->info('✅ Update completed successfully!');
        $this->info('Please refresh your browser to see the changes.');

        return 0;
    }
}
