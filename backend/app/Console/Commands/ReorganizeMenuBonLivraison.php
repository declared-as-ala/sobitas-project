<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use TCG\Voyager\Models\MenuItem;

class ReorganizeMenuBonLivraison extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'menu:reorganize-bon-livraison';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reorganize menu: Move Bon de livraison under Facturations & Tickets and update titles';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Reorganizing menu items for Bon de livraison...');

        // Find "Facturations & Tickets" parent menu item
        $parentMenu = MenuItem::where('title', 'LIKE', '%Facturations%Tickets%')
            ->orWhere('title', 'LIKE', '%Facturation%Ticket%')
            ->whereNull('parent_id')
            ->first();

        if (!$parentMenu) {
            $this->error('Could not find "Facturations & Tickets" parent menu item');
            $this->info('Please check your menu structure in the database');
            return 1;
        }

        $this->info("Found parent menu: {$parentMenu->title} (ID: {$parentMenu->id})");

        // Step 1: Update "Ajouter B.Commande" to "Ajouter Bon de livraison"
        $addMenuItem = MenuItem::where('title', 'LIKE', '%Ajouter B.Commande%')
            ->orWhere(function($query) use ($parentMenu) {
                $query->where('route', 'voyager.facture')
                      ->where('parent_id', $parentMenu->id);
            })
            ->first();

        if ($addMenuItem) {
            $addMenuItem->title = 'Ajouter Bon de livraison';
            $addMenuItem->save();
            $this->info('✓ Updated "Ajouter B.Commande" to "Ajouter Bon de livraison"');
        } else {
            $this->warn('⚠ Could not find "Ajouter B.Commande" menu item');
        }

        // Step 2: Update "Bon De Commandes" to "Bon de livraison"
        $listMenuItem = MenuItem::where('title', 'LIKE', '%Bon De Commandes%')
            ->orWhere('title', 'LIKE', '%Bon de commandes%')
            ->orWhere(function($query) use ($parentMenu) {
                $query->where('route', 'voyager.factures.index')
                      ->where('parent_id', $parentMenu->id);
            })
            ->orWhere(function($query) use ($parentMenu) {
                $query->where('route', 'voyager.commandes.index')
                      ->where('parent_id', $parentMenu->id);
            })
            ->first();

        if ($listMenuItem) {
            $listMenuItem->title = 'Bon de livraison';
            $listMenuItem->save();
            $this->info('✓ Updated "Bon De Commandes" to "Bon de livraison"');
        } else {
            $this->warn('⚠ Could not find "Bon De Commandes" menu item');
        }

        // Step 3: Remove standalone "Bon de livraison" menu items (not under parent)
        $standaloneItems = MenuItem::where(function($query) {
                $query->where('title', 'Bon de livraison')
                      ->orWhere('title', 'Bons de livraison');
            })
            ->where(function($query) use ($parentMenu) {
                $query->whereNull('parent_id')
                      ->orWhere('parent_id', '!=', $parentMenu->id);
            })
            ->where(function($query) {
                $query->where('route', 'LIKE', '%commandes%')
                      ->orWhereNull('route');
            })
            ->get();

        if ($standaloneItems->count() > 0) {
            foreach ($standaloneItems as $item) {
                $this->info("  - Removing standalone menu item: {$item->title} (ID: {$item->id})");
                $item->delete();
            }
            $this->info("✓ Removed {$standaloneItems->count()} standalone menu item(s)");
        }

        // Step 4: Update any remaining commandes menu items
        $commandeItems = MenuItem::where('route', 'LIKE', '%commandes%')
            ->where('title', '!=', 'Bon de livraison')
            ->where('title', '!=', 'Ajouter Bon de livraison')
            ->get();

        foreach ($commandeItems as $item) {
            if (str_contains($item->title, 'Commande') || str_contains($item->title, 'commandes')) {
                $oldTitle = $item->title;
                $item->title = str_replace(['Commande', 'commandes'], 'livraison', $item->title);
                $item->title = str_replace('livraisonlivraison', 'livraison', $item->title);
                $item->save();
                $this->info("  - Updated: '{$oldTitle}' to '{$item->title}'");
            }
        }

        // Clear caches
        $this->call('cache:clear');
        $this->call('view:clear');
        $this->call('config:clear');
        
        $this->info('✓ Cleared all caches');
        $this->info('');
        $this->info('✅ Menu reorganization completed successfully!');
        $this->info('Please refresh your browser to see the changes.');

        return 0;
    }
}
