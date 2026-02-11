<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add indexes to optimize dashboard widget queries.
 *
 * These indexes support the new analytics widgets for:
 * - Delivery time calculations
 * - Refund/discount tracking
 * - Payment method analytics
 * - Low stock detection
 * - Customer segmentation
 */
return new class extends Migration
{
    public function up(): void
    {
        // One Schema::table call per index to ensure we can catch errors individually
        // (Blueprints execute commands after closure returns, so try-catch inside closure doesn't work for SQL errors)

        // Commandes indexes
        $indexes = [
            ['delivered_at', 'idx_commandes_delivered_at'],
            ['refund_amount', 'idx_commandes_refund'],
            ['payment_method', 'idx_commandes_payment_method'],
            ['is_returning_customer', 'idx_commandes_returning'],
            [['created_at', 'etat'], 'idx_commandes_created_etat']
        ];

        foreach ($indexes as $index) {
            try {
                $columns = (array) $index[0];
                $allExist = true;
                foreach ($columns as $col) {
                    if (!Schema::hasColumn('commandes', $col)) {
                        $allExist = false;
                        break;
                    }
                }

                if ($allExist) {
                    try {
                        Schema::table('commandes', function (Blueprint $table) use ($index) {
                            $table->index($index[0], $index[1]);
                        });
                    } catch (\Exception $e) {
                        // Index likely exists
                    }
                }
            } catch (\Exception $e) {
                // Other error
            }
        }

        // Products indexes
        $productIndexes = [
            ['qte', 'idx_products_qte'],
            [['best_seller', 'qte'], 'idx_products_best_qte'],
            [['publier', 'qte'], 'idx_products_pub_qte']
        ];

        foreach ($productIndexes as $index) {
            try {
                Schema::table('products', function (Blueprint $table) use ($index) {
                    $table->index($index[0], $index[1]);
                });
            } catch (\Exception $e) {
                // Index likely exists
            }
        }

        // Commande details indexes
        try {
            if (Schema::hasColumn('commande_details', 'qte')) {
                Schema::table('commande_details', function (Blueprint $table) {
                    $table->index(['produit_id', 'qte'], 'idx_cmd_details_prod_qty');
                });
            }
        } catch (\Exception $e) {
            // Index likely exists
        }
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropIndex('idx_commandes_delivered_at');
            $table->dropIndex('idx_commandes_refund');
            $table->dropIndex('idx_commandes_payment_method');
            $table->dropIndex('idx_commandes_returning');
            $table->dropIndex('idx_commandes_created_etat');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_qte');
            $table->dropIndex('idx_products_best_qte');
            $table->dropIndex('idx_products_pub_qte');
        });

        Schema::table('commande_details', function (Blueprint $table) {
            $table->dropIndex('idx_cmd_details_prod_qty');
        });
    }
};
